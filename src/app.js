import express from 'express';
import morgan from  'morgan';
import cors from 'cors';
import {FRONTEND_URL} from './config/config.js';

const app = express();

// Middlewars 
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({origin: FRONTEND_URL, credentials: true}));

// Route test
app.get('api/ping', (req, res) => {
    res.json({message: '¡API de Ferretería El Martillo funcionando correctamente!g'})
})

export default app;