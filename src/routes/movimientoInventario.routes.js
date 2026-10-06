import { Router } from 'express';
import {
    registrarMovimiento,
    getKardexPorProducto,
    getTodosLosMovimientos
} from '../controllers/inventario.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.post('/movimiento', authRequired, isAdmin, registrarMovimiento);
router.get('/kardex/:producto_id', authRequired, isAdmin, getKardexPorProducto);
router.get('/', authRequired, isAdmin, getTodosLosMovimientos);

export default router;
