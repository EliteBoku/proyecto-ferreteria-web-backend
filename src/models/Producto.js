import mongoose from "mongoose";


const historialPrecioSchema = new mongoose.Schema({
  precio_anterior: { type: Number, required: true },
  precio_nuevo: { type: Number, required: true },
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
});

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  precio: { type: Number, required: true, min: 0 },
  precio_costo: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  stock_minimo: { type: Number, default: 5 },
  categoria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },  
  imagenes: [{ type: String }], 
  es_destacado: { type: Boolean, default: false },
  en_oferta: { type: Boolean, default: false },
  precio_oferta: { type: Number, default: 0 },
  activo: { type: Boolean, default: true },
  promedio_calificacion: { type: Number, default: 0 },
  total_resenas: { type: Number, default: 0 },
  historial_precios: [historialPrecioSchema]
}, {
  timestamps: true
});

export const Producto = mongoose.model("Producto", productoSchema);