   import dotenv from 'dotenv';
   dotenv.config();

   const required = (name) => {
     const value = process.env[name];
     if (!value) throw new Error(`Falta la variable de entorno ${name}`);
     return value;
   };

   export const PORT = process.env.PORT || 4000;
   export const MONGODB_URI = required('MONGODB_URI');
   export const JWT_SECRET = required('JWT_SECRET');
   export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
   export const EMAIL_USER = process.env.EMAIL_USER;
   export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;