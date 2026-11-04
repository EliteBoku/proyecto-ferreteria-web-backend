import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { Venta } from '../models/Venta.js';
import { Producto } from '../models/Producto.js';
import { MovimientoInventario } from '../models/MovimientoInventario.js';

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

// Actualización del estado logístico por parte del administrador.
export const cambiarEstadoVenta = async (req, res) => {
  const { estado, comentario } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: 'El estado indicado no es válido.' });
  }

  try {
    const venta = await Venta.findById(req.params.id);
    if (!venta) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    venta.estado = estado;
    venta.historial_seguimiento.push({
      estado,
      comentario: comentario || `El estado del pedido cambió a: ${estado}`,
    });

    const ventaActualizada = await venta.save();
    return res.json(ventaActualizada);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar el estado.',
      error: error.message,
    });
  }
};
