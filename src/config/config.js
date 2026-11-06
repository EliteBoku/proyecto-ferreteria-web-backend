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

// URL del frontend que se codifica dentro del QR. Debe ser accesible desde el
// celular que escanea (IP de la red local o un túnel). Si no se define, usa FRONTEND_URL.
export const PUBLIC_FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL || FRONTEND_URL;

// Proveedor de WhatsApp: 'consola' (solo imprime el mensaje en la terminal) o 'twilio'.
export const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || 'consola').toLowerCase();
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Número del sandbox de Twilio, con el prefijo "whatsapp:".
export const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
// Cuenta de prueba de Twilio: solo permite plantillas predefinidas (ContentSid "HX...").
// Si se define, se envía la plantilla en lugar del texto libre.
export const TWILIO_CONTENT_SID = process.env.TWILIO_CONTENT_SID;
// Variables de la plantilla en JSON. Admite marcadores con datos del pedido, p. ej.:
// {"1":"{numero_orden}","2":"{estado_recepcion}"}
export const TWILIO_CONTENT_VARIABLES = process.env.TWILIO_CONTENT_VARIABLES;
