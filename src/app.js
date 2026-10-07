import express from 'express';
import morgan from  'morgan';
import cors from 'cors';
import {FRONTEND_URL} from './config/config.js';
import authRoutes from './routes/auth.routes.js';
import categoriesRoutes from './routes/categorias.routes.js';
import productosRoutes from './routes/productos.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import inventarioRoutes from './routes/movimientoInventario.routes.js';
import resenasRoutes from './routes/resenas.routes.js';

const app = express();

// Middlewars 
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({origin: FRONTEND_URL, credentials: true}));

// Route test
app.get('api/ping', (req, res) => {
    res.json({message: '¡API de Ferretería El Martillo funcionando correctamente!g'})
})

//Rutas del sistema 
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/resenas', resenasRoutes);

export default app;