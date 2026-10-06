import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
    nombre: {type: String, required: true, unique: true},
    slug: {type: String, required: true, unique: true}, // el slug es un identificador legible para URLs
    descripcion:{ type: String },
    activa: {type: Boolean, default: true},
})

export const Categoria = mongoose.model("Categoria", categoriaSchema);

