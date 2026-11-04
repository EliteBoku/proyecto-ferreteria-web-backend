import mongoose from 'mongoose';

const movimientoInventarioSchema = new mongoose.Schema(
  {
    producto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
      index: true,
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    tipo_movimiento: {
      type: String,
      enum: ['entrada', 'salida', 'ajuste'],
      required: true,
    },
    // En un ajuste puede registrarse cero; entrada y salida se validan en controller.
    cantidad: { type: Number, required: true, min: 0 },
    stock_anterior: { type: Number, required: true, min: 0 },
    stock_nuevo: { type: Number, required: true, min: 0 },
    motivo: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const MovimientoInventario = mongoose.model(
  'MovimientoInventario',
  movimientoInventarioSchema,
);
