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
  },
  { timestamps: true },
);

export const Venta = mongoose.model('Venta', ventaSchema);
