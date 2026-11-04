import { Router } from 'express';
import {
  createVenta,
  getMisVentas,
  getVentaById,
  getTodasLasVentas,
  cambiarEstadoVenta,
} from '../controllers/ventas.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// Rutas del cliente. El usuario siempre se identifica mediante el token JWT.
router.post('/', authRequired, createVenta);
router.get('/mis-compras', authRequired, getMisVentas);
router.get('/:id', authRequired, getVentaById);

// Rutas administrativas.
router.get('/admin/todas', authRequired, isAdmin, getTodasLasVentas);
router.put('/admin/estado/:id', authRequired, isAdmin, cambiarEstadoVenta);

export default router;
