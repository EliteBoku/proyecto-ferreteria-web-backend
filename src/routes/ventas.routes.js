import { Router } from 'express';
import {
  createVenta,
  getMisVentas,
  getVentaById,
  getTodasLasVentas,
  cambiarEstadoVenta,
  getFacturaVenta,
  enviarFacturaCorreo,
  getEntregaPorToken,
  confirmarEntrega,
} from '../controllers/ventas.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// Rutas del cliente. El usuario siempre se identifica mediante el token JWT.
router.post('/', authRequired, createVenta);
router.get('/mis-compras', authRequired, getMisVentas);

// Confirmación de entrega con el QR de la factura (solo el dueño del pedido).
router.get('/confirmar-entrega/:token', authRequired, getEntregaPorToken);
router.post('/confirmar-entrega/:token', authRequired, confirmarEntrega);

router.get('/:id', authRequired, getVentaById);

// Rutas administrativas.
router.get('/admin/todas', authRequired, isAdmin, getTodasLasVentas);
router.put('/admin/estado/:id', authRequired, isAdmin, cambiarEstadoVenta);
router.get('/admin/factura/:id', authRequired, isAdmin, getFacturaVenta);
router.post('/admin/factura/:id/enviar-correo', authRequired, isAdmin, enviarFacturaCorreo);

export default router;
