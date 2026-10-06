import mongoose from "mongoose";

const detalleVentaSchema = new mongoose.Schema({
    producto_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true},
    nombre_producto: {type: String, required: true},
    cantidad: {type: Number, required: true},
    precio_unitario: {type: Number, required: true},
    subtotal: {type: Number, required: true}
});

const historialSeguimientoSchema = new mongoose.Schema({
    estado: {type: String, required: true},
    fecha: {type: Date, default: Date.now},
    cometario: {type: String}
});

const ventaSchema = new mongoose.Schema({
    usuario_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true},
    numero_orden: {type: String, required: true, unique: true},
    direccion_envio: {
        etiqueta: {type: String},
        direccion: {type: String, required: true},
        ciudad: {type: String, required: true}
    },
    total: {type: Number, required: true},
    estado: { type: String, enum:['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'], default: 'pendiente' },
    metodo_pago: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], default: 'efectivo' },
    id_transaccion_pago: { type: String },
    estado_pago: { type: String , default: 'pendiente'},
    fecha_pago: { type: Date },
    items: [detalleVentaSchema],
    historial_seguimiento: [historialSeguimientoSchema]
}, {timestamps: true});

export const Venta = mongoose.model("Venta", ventaSchema);