import {Categoria} from '../models/Categoria.js';

// Get all categories
export const getCategories = async (req, res) =>{
    try{
        const categories = await Categoria.find({activa: true});
        res.json(categories);
    }catch(error){
        res.status(500).json({
            message: 'Error al obtener las categorías', error: error.message
        })
    }
}

// Create a new category
export const createCategory = async (req, res) => {
    const {nombre, descripcion} = req.body;

    try{
        const slug = nombre.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        
        const newCategory = new Categoria({
            nombre, 
            slug, 
            descripcion
        });

        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);

    }catch(error){
        if(error.code === 11000){
            return res.status(400).json({
                message:'La categoría ya esxite'
            });
        }
        res.status(500).json({
            message: 'Error al crear la categoría', error: error.message
        })
    }
}

//Update a category (Admin)
export const updateCategory = async (req, res) => {
    try{
        
        if(req.body.nombre){
            req.body.slug = req.body.nombre.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        }

        const updatedCategory = await Categoria.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true}
        );

        if(!updatedCategory){
            return res.status(404).json({
                message:'Categoria no encontrada'
            })
        }
        res.json(updatedCategory);

    }catch(error){
        res.status(500).json({
            message: 'Error al actualizar la categoría', error: error.message
        })
    }
}
