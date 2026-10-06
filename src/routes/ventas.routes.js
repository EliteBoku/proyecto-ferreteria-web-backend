import { Router } from 'express';
import{
    createVenta,
    getMisVentas,
    getVentaById,
    getTodasLasVentas,
    cambiarEstadoVenta
} from '../controllers/ventas.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// Routes of client
router.post('/', authRequired, createVenta);
router.get('/mis-compras', authRequired, getMisVentas);
router.get('/:id', authRequired, getVentaById);

// Roues of admin
router.get('/admin/todas', authRequired, isAdmin, getTodasLasVentas);
router.put('/admin/estado/:id', authRequired, isAdmin, cambiarEstadoVenta);

export default router;