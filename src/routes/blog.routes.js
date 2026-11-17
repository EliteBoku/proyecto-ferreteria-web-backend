import { Router } from 'express';
import { getPosts, getPostBySlug, getAllPostsAdmin, createPost, updatePost, deletePost } from '../controllers/blog.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.get('/', getPosts);
router.get('/admin/todos', authRequired, isAdmin, getAllPostsAdmin);
router.get('/:slug', getPostBySlug);
router.post('/', authRequired, isAdmin, createPost);
router.put('/:id', authRequired, isAdmin, updatePost);
router.delete('/:id', authRequired, isAdmin, deletePost);

export default router;
