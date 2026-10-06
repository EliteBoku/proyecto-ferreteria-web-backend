import { MovimientoInventario } from '../models/MovimientoInventario.js';
import { Producto } from '../models/Producto.js';
import { createProduct } from './productos.controller.js';

// 1. Record an inventory movement
export const registrarMovimiento = async (req, res) => {
    const { producto_id, tipo_movimiento, cantidad, motivo} = req.body;

    if(!producto_id || !tipo_movimiento || !cantidad || !motivo){
        return res.status(400).json({message: 'Todos los campos deben ser proporcionados'});
    }

    try{    
        const producto = await Producto.findById(producto_id);

        if(!producto){
            return res.status(404).json({message: 'Producto no encontrado'});
        }

        const stockAnterior = producto.stock;
        let stockNuevo = stockAnterior;

        if(tipo_movimiento === 'entrada'){
            if( cantidad  <= 0) return res.status(400).json({ message: 'La cantidad para entradas debe ser mayor a 0'});
            stockNuevo = stockAnterior + Number(cantidad);
        }else if(tipo_movimiento === 'salida'){
            if(cantidad <= 0 ) return res.status.json({message: 'La cantidad para salidas debe ser mayor a 0'});
            if(stockAnterior < cantidad) return res.status.json({message: `Stock Insuficiente. Stock Actual: ${stockAnterior}`});
            stockNuevo = stockAnterior - Number(cantidad);
        }else if(tipo_movimiento === 'ajuste'){
            if (cantidad < 0) return res.status(400).json({ message: 'El stock no puede ser negativo' });
            stockNuevo = Number(cantidad);
        }

        const movimiento = new MovimientoInventario({
            producto_id,
            usuario_id: req.user.id,
            tipo_movimiento,
            cantidad: Number(cantidad),
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo
        });

        await movimiento.save();
        producto.stock = stockNuevo;
        await producto.save();

        res.status(201).json({
            message: 'Movimiento de inventario registrado correctamente',
            movimiento,
            stock_actualizado: stockNuevo
        })

    }catch(error){
        res.status(500).json({ message: 'Error al registrar el movimiento', error: error.message });
    }
}

// 2. Get Inventory Kardex for a specific product 
export const getKardexPorProducto = async (req, res) => {
    const { producto_id } = req.params;
    try{
        const historial = await MovimientoInventario.find({producto_id}).populate('usuario_id', 'nombres apellidos email').populate('producto_id', 'nombre').sort({createAt: -1});
        res.json(historial);
    } catch( error){
        res.status(500).json({ message: 'Error al consultar el historial del producto', error: error.message });
    }
}

//3. Get  general inventory movement  history (Admin Dashboard)
export const getTodosLosMovimientos = async (req, res) =>{
    try{
        const movimientos = await MovimientoInventario.find().populate('producto_id', 'nombre apellidos email').populate('producto_id', 'nombre').sort({createdAt: -1});
        res.json(movimientos);
    }catch(error){
        res.status(500).json({ message: 'Error al obtener los movimientos', error: error.message });
    }
}