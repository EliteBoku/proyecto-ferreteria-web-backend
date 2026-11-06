import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { Venta } from '../models/Venta.js';
import { Producto } from '../models/Producto.js';
import { MovimientoInventario } from '../models/MovimientoInventario.js';
import { Usuario } from '../models/Usuario.js';
import {
  generarTokenEntrega,
  construirUrlConfirmacion,
  generarQrDataUrl,
  generarQrPng,
} from '../services/factura.service.js';
import { correoConfigurado, sendFacturaEmail } from '../services/email.service.js';
import {
  normalizarTelefono,
  construirMensajeEntrega,
  construirDatosPlantilla,
  enviarWhatsApp,
} from '../services/whatsapp.service.js';

const ESTADOS_VALIDOS = [
  'pendiente',
  'pagado',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
];

const METODOS_PAGO_VALIDOS = ['efectivo', 'tarjeta', 'transferencia'];

const crearError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generarReferenciaSimulada = () =>
  `SIM-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

// Registra la compra del usuario autenticado y simula la aprobación del pago.
// No se integra una pasarela: el servidor registra la aprobación de demostración.
// El precio y el total siempre se calculan consultando MongoDB.
export const createVenta = async (req, res) => {
  const { items, direccion_envio, metodo_pago } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'El carrito de compras no puede estar vacío.',
    });
  }

  if (!direccion_envio?.direccion?.trim() || !direccion_envio?.ciudad?.trim()) {
    return res.status(400).json({
      message: 'La dirección y la ciudad de entrega son obligatorias.',
    });
  }

  if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    return res.status(400).json({
      message: 'Selecciona un método de pago válido.',
    });
  }

  // Agrupa productos repetidos y valida todas las cantidades antes de modificar stock.
  const cantidadesPorProducto = new Map();
  for (const item of items) {
    const productoId = String(item?.producto_id || '');
    const cantidad = Number(item?.cantidad);

    if (!mongoose.isValidObjectId(productoId)) {
      return res.status(400).json({
        message: 'Uno de los productos del carrito no tiene un identificador válido.',
      });
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({
        message: 'La cantidad de cada producto debe ser un entero mayor que cero.',
      });
    }

    cantidadesPorProducto.set(
      productoId,
      (cantidadesPorProducto.get(productoId) || 0) + cantidad,
    );
  }

  const stockDescontado = [];
  const movimientosGuardados = [];
  let ventaGuardada = null;

  try {
    const itemsProcesados = [];
    let totalVenta = 0;

    for (const [productoId, cantidad] of cantidadesPorProducto.entries()) {
      // Actualización atómica: evita que dos clientes compren las mismas unidades.
      // new:false devuelve el producto con el stock y precio anteriores al descuento.
      const productoAntesDelDescuento = await Producto.findOneAndUpdate(
        {
          _id: productoId,
          activo: true,
          stock: { $gte: cantidad },
        },
        { $inc: { stock: -cantidad } },
        { new: false, runValidators: true },
      );

      if (!productoAntesDelDescuento) {
        const producto = await Producto.findById(productoId).select('nombre stock activo');
        if (!producto || !producto.activo) {
          throw crearError('Uno de los productos ya no está disponible.', 404);
        }
        throw crearError(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}.`,
          409,
        );
      }

      // Guardar desde ya el descuento para poder revertirlo si falla algún paso posterior.
      stockDescontado.push({ productoId, cantidad });

      const precioUnitario =
        productoAntesDelDescuento.en_oferta &&
        Number(productoAntesDelDescuento.precio_oferta) > 0
          ? Number(productoAntesDelDescuento.precio_oferta)
          : Number(productoAntesDelDescuento.precio);

      const subtotal = precioUnitario * cantidad;
      totalVenta += subtotal;

      itemsProcesados.push({
        producto_id: productoAntesDelDescuento._id,
        nombre_producto: productoAntesDelDescuento.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });

      const movimiento = await MovimientoInventario.create({
        producto_id: productoAntesDelDescuento._id,
        usuario_id: req.user.id,
        tipo_movimiento: 'salida',
        cantidad,
        stock_anterior: productoAntesDelDescuento.stock,
        stock_nuevo: productoAntesDelDescuento.stock - cantidad,
        motivo: 'Salida por compra con pago simulado',
      });
      movimientosGuardados.push(movimiento._id);
    }

    const fechaPago = new Date();
    const nuevaVenta = new Venta({
      usuario_id: req.user.id,
      numero_orden: `ORD-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`,
      items: itemsProcesados,
      total: Number(totalVenta.toFixed(2)),
      estado: 'pendiente',
      direccion_envio: {
        etiqueta: direccion_envio.etiqueta?.trim() || 'Dirección de entrega',
        direccion: direccion_envio.direccion.trim(),
        ciudad: direccion_envio.ciudad.trim(),
      },
      metodo_pago,
      estado_pago: 'aprobado',
      fecha_pago: fechaPago,
      id_transaccion_pago: generarReferenciaSimulada(),
      pago_simulado: true,
      historial_seguimiento: [
        {
          estado: 'pendiente',
          comentario: 'Pedido registrado y pago simulado aprobado.',
          fecha: fechaPago,
        },
      ],
    });

    ventaGuardada = await nuevaVenta.save();

    return res.status(201).json({
      message: 'Pago simulado aprobado y compra registrada correctamente.',
      venta: ventaGuardada,
    });
  } catch (error) {
    // Reversión compensatoria: la app no depende de transacciones de replica set.
    // Las operaciones $inc permiten restaurar únicamente las unidades de esta compra.
    if (movimientosGuardados.length > 0) {
      await MovimientoInventario.deleteMany({
        _id: { $in: movimientosGuardados },
      }).catch((rollbackError) => {
        console.error('No fue posible revertir movimientos del Kardex:', rollbackError);
      });
    }

    if (ventaGuardada?._id) {
      await Venta.deleteOne({ _id: ventaGuardada._id }).catch((rollbackError) => {
        console.error('No fue posible revertir la venta:', rollbackError);
      });
    }

    if (stockDescontado.length > 0) {
      await Producto.bulkWrite(
        stockDescontado.map(({ productoId, cantidad }) => ({
          updateOne: {
            filter: { _id: productoId },
            update: { $inc: { stock: cantidad } },
          },
        })),
      ).catch((rollbackError) => {
        console.error('No fue posible restaurar el inventario:', rollbackError);
      });
    }

    console.error('Error al registrar la compra:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al registrar la compra.',
    });
  }
};

// Devuelve únicamente las compras del usuario del token JWT.
export const getMisVentas = async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario_id: req.user.id }).sort({ createdAt: -1 });
    return res.json(ventas);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener tus compras.',
      error: error.message,
    });
  }
};

// Consulta una compra propia o cualquier compra si quien consulta es administrador.
export const getVentaById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
    }

    const venta = await Venta.findById(req.params.id).populate(
      'usuario_id',
      'nombres apellidos email telefono',
    );

    if (!venta) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    const propietarioId = venta.usuario_id?._id?.toString();
    if (propietarioId !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({
        message: 'No tienes permiso para consultar este pedido.',
      });
    }

    return res.json(venta);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar el pedido.',
      error: error.message,
    });
  }
};

// Listado general para el administrador.
export const getTodasLasVentas = async (req, res) => {
  try {
    const ventas = await Venta.find()
      .populate('usuario_id', 'nombres apellidos email telefono')
      .sort({ createdAt: -1 });
    return res.json(ventas);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener las compras.',
      error: error.message,
    });
  }
};

// =====================================================================
// Estados y confirmación de entrega con QR
// =====================================================================

const ESTADOS_RECEPCION = {
  completo: 'Completo y en buen estado',
  con_danos: 'Con daños',
  incompleto: 'Incompleto',
};

const TOKEN_VALIDO = /^[a-f0-9]{64}$/;

const nombreCompleto = (usuario) =>
  [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Cliente';

// Envía la factura con el QR al correo del administrador. Devuelve un resultado y no lanza.
const enviarFacturaAlAdmin = async (venta, adminId) => {
  if (!correoConfigurado()) {
    return { enviado: false, motivo: 'El correo no está configurado en el servidor (EMAIL_USER / EMAIL_PASSWORD).' };
  }

  try {
    const admin = await Usuario.findById(adminId).select('email');
    if (!admin?.email) return { enviado: false, motivo: 'El administrador no tiene correo registrado.' };

    const urlConfirmacion = construirUrlConfirmacion(venta.entrega.token_qr);
    const qrPng = await generarQrPng(urlConfirmacion);

    await sendFacturaEmail({
      to: admin.email,
      venta,
      cliente: nombreCompleto(venta.usuario_id),
      qrPng,
      urlConfirmacion,
    });
    return { enviado: true, destinatario: admin.email };
  } catch (error) {
    console.error('No fue posible enviar la factura por correo:', error.message);
    return { enviado: false, motivo: error.message };
  }
};

// Actualización del estado logístico por parte del administrador.
// El administrador NO puede marcar un pedido como entregado: eso lo hace el cliente con el QR.
export const cambiarEstadoVenta = async (req, res) => {
  const { estado, comentario } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: 'El estado indicado no es válido.' });
  }
  if (estado === 'entregado') {
    return res.status(403).json({
      message: 'Solo el cliente puede marcar el pedido como entregado, escaneando el QR de la factura.',
    });
  }

  try {
    const venta = await Venta.findById(req.params.id).select('+entrega.token_qr');
    if (!venta) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (['entregado', 'cancelado'].includes(venta.estado)) {
      return res.status(409).json({
        message: `El pedido ya está ${venta.estado} y no se puede modificar.`,
      });
    }

    venta.estado = estado;
    venta.historial_seguimiento.push({
      estado,
      comentario: comentario || `El estado del pedido cambió a: ${estado}`,
    });

    // Al despachar el pedido se genera el token del QR (una sola vez).
    let qrRecienGenerado = false;
    if (estado === 'enviado' && !venta.entrega?.token_qr) {
      venta.set('entrega.token_qr', generarTokenEntrega());
      venta.set('entrega.qr_generado_en', new Date());
      qrRecienGenerado = true;
    }

    const ventaActualizada = await venta.save();
    await ventaActualizada.populate('usuario_id', 'nombres apellidos email telefono');

    // El correo se envía en segundo plano para no hacer esperar al administrador.
    if (qrRecienGenerado) {
      enviarFacturaAlAdmin(ventaActualizada, req.user.id).then((resultado) => {
        if (!resultado.enviado) console.warn('Factura no enviada por correo:', resultado.motivo);
      });
    }

    return res.json(ventaActualizada);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar el estado.',
      error: error.message,
    });
  }
};

// Factura del pedido para el administrador, con el QR si el pedido está en "enviado".
export const getFacturaVenta = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
  }

  try {
    const venta = await Venta.findById(req.params.id)
      .select('+entrega.token_qr')
      .populate('usuario_id', 'nombres apellidos email telefono');
    if (!venta) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    let qr = null;
    let motivoSinQr = null;

    if (venta.estado === 'enviado') {
      // Pedidos enviados antes de esta funcionalidad no tienen token: se genera ahora.
      if (!venta.entrega?.token_qr) {
        venta.set('entrega.token_qr', generarTokenEntrega());
        venta.set('entrega.qr_generado_en', new Date());
        await venta.save();
      }
      const url = construirUrlConfirmacion(venta.entrega.token_qr);
      qr = { url, imagen: await generarQrDataUrl(url) };
    } else if (venta.estado === 'entregado') {
      motivoSinQr = 'El cliente ya confirmó la entrega de este pedido.';
    } else if (venta.estado === 'cancelado') {
      motivoSinQr = 'El pedido está cancelado.';
    } else {
      motivoSinQr = 'El QR se genera cuando el pedido pasa a estado "Enviado".';
    }

    return res.json({ venta, qr, motivo_sin_qr: motivoSinQr });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al generar la factura.',
      error: error.message,
    });
  }
};

// Reenvía la factura con el QR al correo del administrador autenticado.
export const enviarFacturaCorreo = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
  }

  try {
    const venta = await Venta.findById(req.params.id)
      .select('+entrega.token_qr')
      .populate('usuario_id', 'nombres apellidos');
    if (!venta) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    if (venta.estado !== 'enviado' || !venta.entrega?.token_qr) {
      return res.status(409).json({
        message: 'Solo se puede enviar la factura con QR de pedidos en estado "Enviado".',
      });
    }

    const resultado = await enviarFacturaAlAdmin(venta, req.user.id);
    if (!resultado.enviado) {
      return res.status(503).json({ message: resultado.motivo });
    }
    return res.json({ message: `Factura enviada a ${resultado.destinatario}.` });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al enviar la factura.',
      error: error.message,
    });
  }
};

// Busca la venta de un token y comprueba que pertenezca al usuario autenticado.
// Devuelve { venta } o { status, message } con el error que corresponde.
const buscarVentaPorToken = async (token, usuarioId) => {
  if (!TOKEN_VALIDO.test(token || '')) {
    return { status: 404, message: 'El código QR no es válido.' };
  }
  const venta = await Venta.findOne({ 'entrega.token_qr': token });
  if (!venta) {
    return { status: 404, message: 'El código QR no es válido o el pedido ya no existe.' };
  }
  if (venta.usuario_id.toString() !== usuarioId) {
    return {
      status: 403,
      message: 'Este pedido pertenece a otra cuenta. Inicia sesión con la cuenta con la que hiciste la compra.',
    };
  }
  return { venta };
};

// Datos del pedido que se muestran al cliente después de escanear el QR.
export const getEntregaPorToken = async (req, res) => {
  try {
    const resultado = await buscarVentaPorToken(req.params.token, req.user.id);
    if (!resultado.venta) {
      return res.status(resultado.status).json({ message: resultado.message });
    }

    const usuario = await Usuario.findById(req.user.id).select('nombres apellidos telefono');
    return res.json({
      venta: resultado.venta,
      cliente: {
        nombre: nombreCompleto(usuario),
        telefono: usuario?.telefono || '',
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar el pedido.',
      error: error.message,
    });
  }
};

// El cliente confirma que recibió el pedido: pasa a "entregado" y se envía el WhatsApp.
export const confirmarEntrega = async (req, res) => {
  const { token } = req.params;
  const { estado_recepcion: estadoRecepcion, comentario, telefono } = req.body;

  if (!ESTADOS_RECEPCION[estadoRecepcion]) {
    return res.status(400).json({ message: 'Indica cómo llegó el pedido.' });
  }
  if (comentario && String(comentario).length > 500) {
    return res.status(400).json({ message: 'El comentario no puede superar 500 caracteres.' });
  }

  try {
    const resultado = await buscarVentaPorToken(token, req.user.id);
    if (!resultado.venta) {
      return res.status(resultado.status).json({ message: resultado.message });
    }

    if (resultado.venta.estado === 'entregado') {
      return res.status(409).json({ message: 'Este pedido ya fue confirmado como entregado.' });
    }
    if (resultado.venta.estado !== 'enviado') {
      return res.status(409).json({ message: 'El pedido todavía no ha sido despachado.' });
    }

    const usuario = await Usuario.findById(req.user.id).select('nombres apellidos telefono');
    const telefonoE164 = normalizarTelefono(telefono || usuario?.telefono);
    if (!telefonoE164) {
      return res.status(400).json({
        message: 'Ingresa un número de WhatsApp válido, por ejemplo 300 123 4567.',
      });
    }

    const ahora = new Date();
    const cambios = {
      estado: 'entregado',
      'entrega.confirmada_en': ahora,
      'entrega.confirmada_por': req.user.id,
      'entrega.estado_recepcion': estadoRecepcion,
      'entrega.telefono_whatsapp': telefonoE164,
      'notificacion_whatsapp.estado': 'pendiente',
    };
    if (comentario?.trim()) cambios['entrega.comentario'] = comentario.trim();

    // La condición estado: 'enviado' hace la confirmación atómica: si llegan dos
    // peticiones a la vez, solo una encuentra el pedido en "enviado".
    const venta = await Venta.findOneAndUpdate(
      { _id: resultado.venta._id, usuario_id: req.user.id, estado: 'enviado' },
      {
        $set: cambios,
        $push: {
          historial_seguimiento: {
            estado: 'entregado',
            comentario: `Entrega confirmada por el cliente con el QR. Estado reportado: ${ESTADOS_RECEPCION[estadoRecepcion]}.`,
            fecha: ahora,
          },
        },
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (!venta) {
      return res.status(409).json({ message: 'Este pedido ya fue confirmado como entregado.' });
    }

    // Guarda el número en el perfil para próximas compras.
    if (usuario && usuario.telefono !== telefonoE164) {
      await Usuario.updateOne({ _id: req.user.id }, { telefono: telefonoE164 });
    }

    const datosMensaje = { nombreCliente: usuario?.nombres || 'cliente', venta };
    const whatsapp = await enviarWhatsApp(
      telefonoE164,
      construirMensajeEntrega(datosMensaje),
      construirDatosPlantilla(datosMensaje),
    );

    venta.notificacion_whatsapp = {
      estado: whatsapp.estado,
      proveedor: whatsapp.proveedor,
      enviado_en: ['enviado', 'simulado'].includes(whatsapp.estado) ? new Date() : undefined,
      error: whatsapp.error,
    };
    await venta.save();

    return res.json({
      message: 'Entrega confirmada correctamente.',
      venta,
      whatsapp: { estado: whatsapp.estado, error: whatsapp.error },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al confirmar la entrega.',
      error: error.message,
    });
  }
};
