import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

// Importar los 6 modelos principales
import { Categoria } from "./models/Categoria.js";
import { MovimientoInventario } from "./models/MovimientoInventario.js";
import { Producto } from "./models/Producto.js";
import { Resena } from "./models/Resena.js";
import { Usuario } from "./models/Usuario.js";
import { Venta } from "./models/Venta.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('>>> Base de datos conectada');

    // Verificar si la base de datos ya tiene información
    const conteoUsuarios = await Usuario.countDocuments();
    
    // Si está vacía, inserta los registros iniciales para crear las colecciones
    if (conteoUsuarios === 0) {
      console.log('>>> Creando datos iniciales y colecciones...');

      // 1. Crear Usuario con subdocumento de dirección
      const usuario = await Usuario.create({
        nombres: "Carlos",
        apellidos: "Rodríguez",
        email: "carlos@example.com",
        password: "password123",
        rol: "admin",
        direcciones: [{ etiqueta: "Casa", direccion: "Carrera 10 # 15-20", ciudad: "Neiva" }]
      });

      // 2. Crear Categoría
      const categoria = await Categoria.create({
        nombre: "Electrónica",
        slug: "electronica",
        activa: true
      });

      // 3. Crear Producto con subdocumento de historial de precios
      const producto = await Producto.create({
        id_categoria: categoria._id,
        nombre: "Laptop Lenovo IdeaPad",
        precio: 2500000,
        stock: 10,
        historial_precios: [{
          precio_anterior: 0,
          precio_nuevo: 2500000,
          usuario_id: usuario._id
        }]
      });

      // 4. Crear Movimiento de Inventario
      await MovimientoInventario.create({
        producto_id: producto._id,
        usuario_id: usuario._id,
        tipo_movimiento: "entrada",
        cantidad: 10,
        stock_anterior: 0,
        stock_nuevo: 10,
        motivo: "Carga inicial de inventario"
      });

      // 5. Crear Reseña
      await Resena.create({
        producto_id: producto._id,
        usuario_id: usuario._id,
        calificacion: 5
      });

      // 6. Crear Venta con subdocumentos de items y seguimiento
      await Venta.create({
        usuario_id: usuario._id,
        numero_orden: "ORD-0001",
        direccion_envio: { etiqueta: "Casa", direccion: "Carrera 10 # 15-20", ciudad: "Neiva" },
        total: 2500000,
        items: [{
          producto_id: producto._id,
          nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: 2500000,
          subtotal: 2500000
        }],
        historial_seguimiento: [{
          estado: "completado",
          comentario: "Venta inicial de prueba"
        }]
      });

      console.log('>>> ¡Las 6 colecciones y subdocumentos se han generado correctamente!');
    }
  } catch (error) {
    console.error('Error al conectar o inicializar la base de datos:', error);
  }
};