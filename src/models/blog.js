import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    titulo: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    resumen: { type: String, trim: true },
    contenido: { type: String, required: true },
    imagen: { type: String },
    categoria: { type: String, trim: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    publicado: { type: Boolean, default: true },
    activo: { type: Boolean, default: true },
}, { timestamps: true });

export const Blog = mongoose.model("Blog", blogSchema);
