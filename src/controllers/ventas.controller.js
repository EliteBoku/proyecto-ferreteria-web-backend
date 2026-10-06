import { Venta } from '../models/Venta.js';
import { Producto } from '../models/Producto.js';

// 1. Create a new sale (Customer)
export const createVenta = async (req, res) =>{
    const { items, direccion_envio, metodo_pago } = req.body;
    if(!items || items.length === 0){
        return res.status(400).json({
            message: 'El carrito de compras no puede estar vacio'
        });
    }
    try{
        let totalVenta = 0;
        const itemsProcesados = [];
        for(const item of items){
            console.log('Hey')
            const productDB = await Producto.findById(item.producto_id);
            if(!productDB || !productDB.activo){
                return res.status(404).json({
                    message: `El producto  ${ item.nombre_producto || item.producto_id} no existe o no esta disponible`
                });
            }
            if(productDB.stock < item.cantidad){
                return res.status(400).json({
                    message: `Stock insuficiente para {productoBD.nombre}. Disponible: {productoBD.stock}`
                })
            }

            // Determine the price (Aplly the offer if active)
            const precioUnitario = productDB.en_oferta && productDB.precio_oferta > 0 ? productDB.precio_oferta : productDB.precio;
            
            const subtotal = precioUnitario * item.cantidad;
            totalVenta += subtotal;

            itemsProcesados.push({
                producto_id: productDB._id,
                nombre_producto: productDB.nombre,
                cantidad: item.cantidad,
                precio_unitario:precioUnitario,
                subtotal
            });

            productDB.stock -= item.cantidad;
            await productDB.save();
        } 
        const numeroOrden = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const nuevaVenta = new Venta({
            usuario_id: req.user.id,
            numero_orden: numeroOrden,
            items: itemsProcesados,
            total: totalVenta,
            direccion_envio,
            metodo_pago,
            estado: 'pendiente',
            historial_seguimiento: [{
                estado: 'pendiente',
                comentario: 'Orden creada exitosamente'
        }]});

        const ventaGuardada = await nuevaVenta.save();
        res.status(201).json(ventaGuardada);

    }catch(error){
        res.status(500).json({
            message: 'Error al procesar la venta',
            error: error.message
        })
    }
}

//2. Get purchases for the authenticated customer
export const getMisVentas = async (req, res) => {
    try{
        const ventas = await Venta.find({usuario_id: req.user.id}).sort({createdAt: -1});
        res.json(ventas);
    }catch(error){
        res.status(500).json({
            message: 'Error al obtener tus pedidos',
            error: error.message
        });
    }
}

//3. Get sale details by ID
export const getVentaById = async (req, res) =>{
    try{
        const venta = await Venta.findById(req.params.id).populate('usuario_id', 'nombres apellidos email telefono');
        if(!venta) return res.status(404).json({
            message:'Pedido no encontrado'
        });
        if(venta.usuario_id._id.toString() !== req.user.id && req.user.rol !== 'admin'){
            return res.status(403).json({
                message:'No tienes permiso para ver este pedido'
            })
        }
        res.json(venta);
    }catch(error){
        res.status(500).json({ message: 'Error al consultar la orden', error: error.message });
    }
}

//4. Get all sales (ADMIN)
export const getTodasLasVentas = async (req, res) => {
    try{
        const ventas = await Venta.find().populate('usuario_id', 'nombres apellidos email').sort({createdAt : -1})
        res.json(ventas);
    }catch(error){
        res.status(500).json({ message: 'Error al obtener la lista de ventas', error: error.message });
    }
}

//5. Change sale status (ADMIN)
export const cambiarEstadoVenta = async (req, res) => {
    const { estado, comentario } = req.body;
    try{    
        const venta = await Venta.findById(req.params.id);
        if(!venta) res.status(404).json({message: 'Pedido no encontrado'});

        venta.estado = estado;
        venta.historial_seguimiento.push({
            estado,
            comentario: comentario || `El estado del pedido cambió a: ${estado}`
        });

        const ventaActualizada = await venta.save();
        res.json(ventaActualizada);
    }catch(error){
        res.status(500).json({ message: 'Error al actualizar el estado', error: error.message });
    }
}