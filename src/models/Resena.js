import mongoose from "mongoose";

const resenaSchema = new mongoose.Schema({
    producto_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true},
    usuario_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true},
    calificacion: {type: Number, required: true},
    fecha: {type: Date, default: Date.now}
})

export const Resena = mongoose.model("Resena", resenaSchema);