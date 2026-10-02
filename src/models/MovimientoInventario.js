import mongoose from "mongoose";

const movimientoInventarioSchema =  new mongoose.Schema({
    producto_id: {type: mongoose.Schema.Types.ObjectId, ref: "Producto", required: true},
    usuario_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true},
    tipo_movimiento:{ type: String, enum: ['entrada', 'salida', 'ajuste'], required: true },
    cantidad: {type: Number, required: true},
    stock_anterior: {type: Number, required: true},
    stock_nuevo: {type: Number, required: true},
    motivo: {type: String, required: true},
    fecha: {type: Date, default: Date.now}
})

export const MovimientoInventario = mongoose.model("MovimientoInventario", movimientoInventarioSchema);