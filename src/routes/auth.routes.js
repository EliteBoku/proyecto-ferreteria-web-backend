import {Router} from 'express';
import {register, login, profile, forgotPassword, resetPassword} from '../controllers/auth.controller.js';
import {authRequired} from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authRequired, profile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;