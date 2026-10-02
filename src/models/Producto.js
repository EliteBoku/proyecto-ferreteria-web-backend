import mongoose from "mongoose";

const historialPrecioSchema = new mongoose.Schema({
    precio_anterior: {type: Number, required: true},
    precio_nuevo : {type: Number, required: true},
    usuario_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required:true},
    fecha: {type: Date, default: Date.now}
});

const productoSchema = new mongoose.Schema({
    id_categoria: {type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true},
    nombre: {type: String, required: true},
    descripcion: {typpe: String},
    precio: {type: Number, required: true},
    precio_costo: {type: Number},
    stock: {type: Number, required: true},
    stock_minimo: {type: Number, default: 5},
    activo: {type: Boolean, default: true, default: 0},
    promedio_calificacion: {type: Number, defult: 0},
    total_resenas: {type: Number, default: 0},
    historial_precios: [historialPrecioSchema]
}, {
    timestamps: true
});

export const Producto = mongoose.model("Producto", productoSchema);