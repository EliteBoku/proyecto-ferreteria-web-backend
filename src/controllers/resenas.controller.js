import {Resena} from '../models/Resena.js';
import {Producto} from '../models/Producto.js';

// Helper function to recalculate the product's avarage rating and total number of reviews
const actualizarMetricasProducto = async (productoId) => {
    const resenas = await Resena.find({producto_id: productoId});
    const total = resenas.length;
    const suma = resenas.reduce((acc, r) => acc + r.calificacion, 0);
    const promedio = total > 0 ? (suma / total).toFixed(1) : 0;

    await Producto.findByIdAndUpdate(productoId, {
        promedio_calificacion: Number(promedio),
        total_resenas: total
    });
}

// 1. Create or Upate review (Customer)
export const crearOActualizarResena = async (req, res) =>{

    const {producto_id, calificacion, comentario} = req.body;

    if(!producto_id || !calificacion){
        return res.status(400).json({
            message: 'El producto y calificacion son obligatorios'
        });
    }

    if(calificacion < 1 || calificacion > 5){
        return res.status(400).json({message: 'La calificacion debe estar entre 1 y 5'})
    }

    try {
        const producto = await Producto.findById(producto_id);

        if (!producto) {
            return res.status(404).json({
                message: 'Producto no encontrado'
            });
        }

        let resena = await Resena.findOne({
            producto_id,
            usuario_id: req.user.id
        });

        if (resena) {
            resena.calificacion = calificacion;
            resena.comentario = comentario;
            resena.fecha = Date.now();

            await resena.save();

        } else {
            resena = new Resena({
                producto_id,
                usuario_id: req.user.id,
                calificacion,
                comentario
            });

            await resena.save();
    }

    await actualizarMetricasProducto(producto_id);

    res.status(201).json({
        message: 'Reseña procesada correctamente',
        resena
    });

    } catch (error) {
        res.status(500).json({
            message: 'Error al procesar la reseña',
            error: error.message
        });
    }
}

// 2. Get all reviews for a product
export const getResenasPorProducto = async (req, res) => {
    const { producto_id } = req.params;
    try{
        const resenas = await Resena.find({producto_id}).populate('usuario_id', 'nombres apellidos').sort({createdAt: -1});
        res.json(resenas)
    }catch(error){
        res.status(500).json({ message: 'Error al obtener reseñas', error: error.message });
    }
}

// 3. Delete review (Own review or by Administrador)
export const eliminarResena = async (req, res) => {
    try{
        const resena = await Resena.findById(req.params.id);

        if(!resena) return res.status(404).json({
            message: 'Resena no encontrada'
        });

        if(resena.usuario_id.toString() !== req.user.id && req.user.rol !== 'admin'){
            return res.status(403).json({
                message: 'No tienes permiso para eliminar esta reseña'
            })
        }

        const productoId = resena.producto_id;
        await resena.deleteOne();

        await actualizarMetricasProducto(productoId);
        
        res.json({ message : 'Reseña eliminada correctamente'})

    } catch(error){
        res.status(500).json({ message: 'Error al eliminar la reseña', error: error.message });
    }
}
