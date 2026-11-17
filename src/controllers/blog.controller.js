import { Blog } from '../models/Blog.js';

const crearSlug = (texto) =>
    texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const generarSlugUnico = async (titulo, excluirId = null) => {
    const base = crearSlug(titulo);
    let slug = base;
    let i = 1;
    while (await Blog.exists({ slug, ...(excluirId && { _id: { $ne: excluirId } }) })) {
        slug = `${base}-${i++}`;
    }
    return slug;
};

export const getPosts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 9, 50);
        const filtro = { activo: true, publicado: true };

        if (req.query.categoria) filtro.categoria = req.query.categoria;
        if (req.query.buscar) filtro.titulo = { $regex: req.query.buscar, $options: 'i' };

        const [posts, total] = await Promise.all([
            Blog.find(filtro)
                .select('-contenido')
                .populate('autor', 'nombres apellidos')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Blog.countDocuments(filtro),
        ]);

        res.json({ posts, total, page, paginas: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los artículos', error: error.message });
    }
};

export const getPostBySlug = async (req, res) => {
    try {
        const post = await Blog.findOne({
            slug: req.params.slug,
            activo: true,
            publicado: true,
        }).populate('autor', 'nombres apellidos');

        if (!post) return res.status(404).json({ message: 'Artículo no encontrado' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el artículo', error: error.message });
    }
};

export const getAllPostsAdmin = async (req, res) => {
    try {
        const posts = await Blog.find({ activo: true })
            .sort({ createdAt: -1 })
            .lean();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los artículos', error: error.message });
    }
};

export const createPost = async (req, res) => {
    const { titulo, resumen, contenido, imagen, categoria, publicado } = req.body;

    try {
        if (!titulo || !contenido) {
            return res.status(400).json({ message: 'El título y el contenido son obligatorios' });
        }

        const nuevoPost = new Blog({
            titulo,
            slug: await generarSlugUnico(titulo),
            resumen,
            contenido,
            imagen,
            categoria,
            publicado,
            autor: req.user.id || req.user._id,
        });

        const guardado = await nuevoPost.save();
        res.status(201).json(guardado);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el artículo', error: error.message });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { titulo, resumen, contenido, imagen, categoria, publicado } = req.body;
        const cambios = { resumen, contenido, imagen, categoria, publicado };

        if (titulo) {
            cambios.titulo = titulo;
            cambios.slug = await generarSlugUnico(titulo, req.params.id);
        }

        Object.keys(cambios).forEach((k) => cambios[k] === undefined && delete cambios[k]);

        const actualizado = await Blog.findByIdAndUpdate(req.params.id, cambios, { new: true });

        if (!actualizado) return res.status(404).json({ message: 'Artículo no encontrado' });
        res.json(actualizado);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el artículo', error: error.message });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Blog.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!post) return res.status(404).json({ message: 'Artículo no encontrado' });
        res.json({ message: 'Artículo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el artículo', error: error.message });
    }
};
