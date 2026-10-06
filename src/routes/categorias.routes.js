import { Router } from 'express';
import { getCategories, createCategory, updateCategory } from '../controllers/categoria.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.get('/', getCategories);
router.post('/', authRequired, isAdmin, createCategory);
router.put('/:id', authRequired, isAdmin, updateCategory);

export default router;