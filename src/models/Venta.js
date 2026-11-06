import mongoose from 'mongoose';

const detalleVentaSchema = new mongoose.Schema({
  producto_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true,
  },
  nombre_producto: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precio_unitario: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
});

const historialSeguimientoSchema = new mongoose.Schema({
  estado: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  comentario: { type: String },
});

const ventaSchema = new mongoose.Schema(
  {
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    numero_orden: { type: String, required: true, unique: true },
    direccion_envio: {
      etiqueta: { type: String, default: 'Dirección de entrega' },
      direccion: { type: String, required: true, trim: true },
      ciudad: { type: String, required: true, trim: true },
    },
    total: { type: Number, required: true, min: 0 },
    // Estado logístico del pedido. El pago simulado queda registrado aparte.
    estado: {
      type: String,
      enum: ['pendiente', 'pagado', 'procesando', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    metodo_pago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'transferencia'],
      required: false,
    },
    estado_pago: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado'],
      default: 'pendiente',
    },
    fecha_pago: { type: Date },
    // Identificador local de demostración; no proviene de un proveedor de pagos.
    id_transaccion_pago: { type: String },
    pago_simulado: { type: Boolean, default: true },
    items: {
      type: [detalleVentaSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'La venta debe incluir al menos un producto.',
      },
    },
    historial_seguimiento: [historialSeguimientoSchema],

    // Confirmación de entrega mediante el QR impreso en la factura.
    entrega: {
      // Token de un solo uso incluido en la URL del QR. Nunca se envía en las respuestas JSON.
      token_qr: { type: String, select: false },
      qr_generado_en: { type: Date },
      confirmada_en: { type: Date },
      confirmada_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
      estado_recepcion: {
        type: String,
        enum: ['completo', 'con_danos', 'incompleto'],
      },
      comentario: { type: String, trim: true, maxlength: 500 },
      telefono_whatsapp: { type: String },
    },

    // Resultado del mensaje de WhatsApp enviado al confirmar la entrega.
    notificacion_whatsapp: {
      estado: {
        type: String,
        enum: ['pendiente', 'enviado', 'simulado', 'fallido', 'omitido'],
      },
      proveedor: { type: String },
      enviado_en: { type: Date },
      error: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Evita filtrar el token aunque el documento se haya cargado con él.
        if (ret.entrega) delete ret.entrega.token_qr;
        return ret;
      },
    },
  },
);

ventaSchema.index({ 'entrega.token_qr': 1 }, { unique: true, sparse: true });

export const Venta = mongoose.model('Venta', ventaSchema);
