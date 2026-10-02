import mongoose from "mongoose";

// Subdocumento de Dirección 
const direccionSchema = new mongoose.Schema({
    etiqueta: {type: String},
    direccion: {type: String, required: true},
    ciudad: {type: String, required: true}
});

const itemCarritoSchema = new mongoose.Schema({
    producto_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true},
    cantidad: {type: Number, required: true, min: 1}
});

const usuarioSchema = new mongoose.Schema({
    nombres: {type: String, required: true},
    apellidos: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    rol: {type: String, enum: ['admin', 'user'], default: 'user'},
    telefono: {type: String},
    direcciones: [direccionSchema],
    carrito: [itemCarritoSchema]
}, {timestamps: true});


export const Usuario = mongoose.model('Usuario', usuarioSchema);

/**
 * La clave está en distinguir entre embebido y referenciado.
 * Qué significa mongoose.Schema.Types.ObjectId
 * producto_id va a almacenar el identificador (_id) de un documento de la colección Producto
 * {
    _id: ObjectId("650abc123..."),
    nombre: "Mouse Logitech",
    precio: 80000
    }
    El ObjectId es simplemente el tipo de identificador que MongoDB utiliza normalmente para los _id.
    "producto_id hace referencia a un documento del modelo Producto

    Sí, pero es importante entender que MongoDB no funciona exactamente como una base de datos relacional tradicional.

En SQL probablemente pensarías:

USUARIOS
   │
   ├──────────< DIRECCIONES
   │
   └──────────< CARRITO >──────── PRODUCTOS

Y tendrías tablas separadas:

usuarios
direcciones
carrito
productos

En MongoDB puedes decidir qué información conviene embebir y qué información conviene referenciar.

*/