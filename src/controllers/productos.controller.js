import {Producto} from '../models/Producto.js';

// 1. Get all products (with optional search and category filters)
export const getProducts = async (req, res) => {
    try{
        const {categoria, busqueda, destacados, ofertas} = req.query;
        let query = {activo : true };
        if(categoria) query.categoria_id = categoria;
        if(destacados) query.es_destacado = true;
        if(ofertas === 'true') query.en_oferta = true;
        if(busqueda){
            query.nombre = {$regex: busqueda, $options: 'i'};
        }

        const productos = await Producto.find(query).populate('categoria_id', 'nombre slug').sort({createdAt: -1});
        res.json(productos);
    }catch(error){
        res.status(500).json({
            message:'Error al obtener productos', error: error.message
        })
    }
}

// 2. Get a single product by id (Includes category and price history details)
export const getProductById = async (req, res) => {
    try{
        const producto = await Producto.findById(req.params.id).populate('categoria_id', 'nombre slug').populate('historial_precios.usuario_id', "nombres apellidos email");
        if(!producto) return res.status(404).json({message: 'Producto no encontrado'});
        res.json(producto);
    }catch(error){
        res.status(500).json({
            message:'Error al obtener el producto',
            error:error.message
        });
    }
}

// 3. Create a new Product (Admin)
export const createProduct = async (req, res) => {
    const {
        nombre, descripcion, precio, precio_costo,
        stock, stock_minimo, categoria_id, imagenes, 
        es_destacado, en_oferta, precio_oferta
    } = req.body;

    try{
        const newProduct = new Producto({
            nombre, descripcion, precio, precio_costo,
            stock, stock_minimo, categoria_id, imagenes,
            es_destacado, en_oferta, precio_oferta,
            historial_precios: [
                {
                    precio_anterior: 0,
                    precio_nuevo: precio,
                    usuario_id: req.user.id // -> Extraído automaticamente del token JWT
                }
            ]
        });
        const savedProduct = newProduct.save();
        res.status(201).json(savedProduct); 
    }catch(error){
        res.status(500).json({
            message: 'Eror al crear el producto', error:error.message
        });
    }
}

// 4. Update product 
export const updateProduct = async (req, res) => {
    try{
        const product = await Producto.findById(req.params.id);
        if(!product) return res.status(404).json({message: 'Producto no encontrado'});

        // If a different price is provided, add a record to the price history
        if(req.body.precio !== undefined && Number(req.body.precio) !== product.precio){
            product.historial_precios.push({
                precio_anterior: product.precio,
                precio_nuevo: Number(req.body.precio),
                usuario_id: req.user.id
            });
            product.precio = Number(req.body.precio);
        }

        //Update the remaining fields except for the price (already processed)
        const datosActualizar = {... req.body };
        delete datosActualizar.precio;

        Object.assign(product, datosActualizar);
        const updatedProduct = await product.save();
        res.json(updatedProduct);

    }catch(error){
        res.status(500).json({
            message: 'Error al actualizar el producto',
            error: error.message
        });
    }
}


//5. Deactivate product
export const deleteProduct = async (req, res) => {
    try{
        const productoInactivado = await Producto.findByIdAndUpdate(
            req.params.id,
            {activo: false},
            {new: true}
        );
        if(!productoInactivado){
            return res.status(404).json({
                message: 'Producto no encontrado'
            })
        }
        res.json({message: 'Producto inactivado correctamente', producto: productoInactivado});
    }catch(error){
        res.status(500).json({
            message:'Error al inactivar un producto',
            error: error.message
        })
    }
}