import {Router} from 'express';
import {
    crearOActualizarResena ,
    getResenasPorProducto,
    eliminarResena
} from '../controllers/resenas.controller.js'
import {authRequired} from '../middlewares/auth.middleware.js'
import { isAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// Public query
router.get('/producto/:producto_id', getResenasPorProducto);

// Protected actions
router.post('/', authRequired, crearOActualizarResena);
router.delete('/:id', authRequired, eliminarResena);

export default router;