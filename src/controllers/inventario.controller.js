import mongoose from 'mongoose';
import { MovimientoInventario } from '../models/MovimientoInventario.js';
import { Producto } from '../models/Producto.js';

// Registro manual de una entrada, salida o ajuste por parte del administrador.
export const registrarMovimiento = async (req, res) => {
  const { producto_id, tipo_movimiento, cantidad, motivo } = req.body;
  const cantidadNumero = Number(cantidad);

  if (!producto_id || !tipo_movimiento || cantidad === undefined || !motivo?.trim()) {
    return res.status(400).json({
      message: 'Todos los campos deben ser proporcionados.',
    });
  }
  if (!mongoose.isValidObjectId(producto_id)) {
    return res.status(400).json({ message: 'El identificador del producto no es válido.' });
  }
  if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
    return res.status(400).json({ message: 'El tipo de movimiento no es válido.' });
  }
  if (!Number.isFinite(cantidadNumero) || cantidadNumero < 0) {
    return res.status(400).json({ message: 'La cantidad no puede ser negativa.' });
  }
  if (tipo_movimiento !== 'ajuste' && cantidadNumero <= 0) {
    return res.status(400).json({ message: 'La cantidad debe ser mayor que cero.' });
  }
  if (!Number.isInteger(cantidadNumero)) {
    return res.status(400).json({ message: 'La cantidad debe ser un número entero.' });
  }

  try {
    const producto = await Producto.findById(producto_id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const stockAnterior = producto.stock;
    let stockNuevo = stockAnterior;

    if (tipo_movimiento === 'entrada') {
      stockNuevo += cantidadNumero;
    } else if (tipo_movimiento === 'salida') {
      if (stockAnterior < cantidadNumero) {
        return res.status(400).json({
          message: `Stock insuficiente. Stock actual: ${stockAnterior}.`,
        });
      }
      stockNuevo -= cantidadNumero;
    } else {
      stockNuevo = cantidadNumero;
    }

    // Evita sobrescribir un cambio de stock realizado concurrentemente.
    const productoActualizado = await Producto.findOneAndUpdate(
      { _id: producto_id, stock: stockAnterior },
      { $set: { stock: stockNuevo } },
      { new: true, runValidators: true },
    );

    if (!productoActualizado) {
      return res.status(409).json({
        message: 'El inventario cambió mientras se registraba el movimiento. Actualiza e inténtalo nuevamente.',
      });
    }

    let movimiento;
    try {
      movimiento = await MovimientoInventario.create({
        producto_id,
        usuario_id: req.user.id,
        tipo_movimiento,
        cantidad: cantidadNumero,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: motivo.trim(),
      });
    } catch (movementError) {
      // Revierte solo si el stock sigue en el valor que acabamos de establecer.
      await Producto.findOneAndUpdate(
        { _id: producto_id, stock: stockNuevo },
        { $set: { stock: stockAnterior } },
      );
      throw movementError;
    }

    return res.status(201).json({
      message: 'Movimiento de inventario registrado correctamente.',
      movimiento,
      stock_actualizado: stockNuevo,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al registrar el movimiento.',
      error: error.message,
    });
  }
};

export const getKardexPorProducto = async (req, res) => {
  const { producto_id } = req.params;

  if (!mongoose.isValidObjectId(producto_id)) {
    return res.status(400).json({ message: 'El identificador del producto no es válido.' });
  }

  try {
    const historial = await MovimientoInventario.find({ producto_id })
      .populate('usuario_id', 'nombres apellidos email')
      .populate('producto_id', 'nombre')
      .sort({ createdAt: -1 });
    return res.json(historial);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar el historial del producto.',
      error: error.message,
    });
  }
};

export const getTodosLosMovimientos = async (req, res) => {
  try {
    const movimientos = await MovimientoInventario.find()
      .populate('usuario_id', 'nombres apellidos email')
      .populate('producto_id', 'nombre')
      .sort({ createdAt: -1 });
    return res.json(movimientos);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener los movimientos.',
      error: error.message,
    });
  }
};
