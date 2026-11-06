import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { PUBLIC_FRONTEND_URL } from '../config/config.js';

/** Token aleatorio de 32 bytes (64 caracteres hexadecimales) para la URL del QR. */
export const generarTokenEntrega = () => randomBytes(32).toString('hex');

/** URL que abre el celular del cliente al escanear el QR. */
export const construirUrlConfirmacion = (token) =>
  `${PUBLIC_FRONTEND_URL.replace(/\/+$/, '')}/confirmar-entrega/${token}`;

const OPCIONES_QR = { errorCorrectionLevel: 'M', margin: 2, width: 320 };

/** Imagen del QR como data URL (para mostrarla en el navegador). */
export const generarQrDataUrl = (url) => QRCode.toDataURL(url, OPCIONES_QR);

/** Imagen del QR como PNG (para adjuntarla al correo). */
export const generarQrPng = (url) => QRCode.toBuffer(url, { ...OPCIONES_QR, type: 'png' });
