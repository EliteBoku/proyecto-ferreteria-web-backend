import {Router} from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/productos.controller.js';
import {authRequired} from '../middlewares/auth.middleware.js';
import {isAdmin} from '../middlewares/admin.middleware.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authRequired, isAdmin, createProduct);
router.put('/:id', authRequired, isAdmin, updateProduct);
router.delete('/:id', authRequired, isAdmin, deleteProduct);

export default router;