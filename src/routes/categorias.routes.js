import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoria.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.get('/', getCategories);
router.post('/', authRequired, isAdmin, createCategory);
router.put('/:id', authRequired, isAdmin, updateCategory);
router.delete('/:id', authRequired, isAdmin, deleteCategory);

export default router;