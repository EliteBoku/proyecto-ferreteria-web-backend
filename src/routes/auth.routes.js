import { Router } from 'express';
import {
    register,
    login,
    profile,
    updateProfile,
    forgotPassword,
    resetPassword
} from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authRequired, profile);
router.put('/profile', authRequired, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;