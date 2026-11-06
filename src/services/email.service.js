import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASSWORD } from '../config/config.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
    }
});

export const sendPasswordResetEmail = async (email, resetUrl) => {

    await transporter.sendMail({
        from: `"Ferretería El Martillo" <${EMAIL_USER}>`,
        to: email,
        subject: 'Recuperación de contraseña - Ferretería El Martillo',
        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: auto;
                padding: 30px;
                border: 1px solid #ddd;
                border-radius: 10px;
            ">

                <h1 style="color: #333;">
                    Ferretería El Martillo
                </h1>

                <h2>
                    Recuperación de contraseña
                </h2>

                <p>
                    Hemos recibido una solicitud para restablecer
                    la contraseña de tu cuenta.
                </p>

                <p>
                    Haz clic en el siguiente botón para crear
                    una nueva contraseña:
                </p>

                <a
                    href="${resetUrl}"
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background-color: #333;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        margin: 20px 0;
                    "
                >
                    Restablecer contraseña
                </a>

                <p>
                    Este enlace será válido durante
                    <strong>30 minutos</strong>.
                </p>

                <p>
                    Si tú no solicitaste este cambio,
                    puedes ignorar este correo.
                </p>

                <hr>

                <small>
                    Ferretería El Martillo
                </small>

            </div>
        `
    });
};

const escaparHtml = (texto) =>
    String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

const moneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    });

// Indica si hay credenciales de correo configuradas en el .env.
export const correoConfigurado = () => Boolean(EMAIL_USER && EMAIL_PASSWORD);

// Envía al administrador la factura del pedido con el QR de confirmación adjunto.
export const sendFacturaEmail = async ({ to, venta, cliente, qrPng, urlConfirmacion }) => {
    const filas = (venta.items || []).map((item) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escaparHtml(item.nombre_producto)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.cantidad}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${moneda(item.precio_unitario)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${moneda(item.subtotal)}</td>
        </tr>`).join('');

    await transporter.sendMail({
        from: `"Ferretería El Martillo" <${EMAIL_USER}>`,
        to,
        subject: `Factura ${venta.numero_orden} - Ferretería El Martillo`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px;">
                <h1 style="margin:0;color:#111827;">Ferretería El Martillo</h1>
                <p style="margin:4px 0 20px;color:#6b7280;">Factura de venta ${escaparHtml(venta.numero_orden)}</p>

                <p><strong>Cliente:</strong> ${escaparHtml(cliente)}</p>
                <p><strong>Dirección de entrega:</strong> ${escaparHtml(venta.direccion_envio?.direccion)}, ${escaparHtml(venta.direccion_envio?.ciudad)}</p>
                <p><strong>Fecha de compra:</strong> ${new Date(venta.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>

                <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
                    <thead>
                        <tr style="background:#f9fafb;">
                            <th style="padding:8px;text-align:left;">Producto</th>
                            <th style="padding:8px;">Cant.</th>
                            <th style="padding:8px;text-align:right;">Precio</th>
                            <th style="padding:8px;text-align:right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
                <p style="text-align:right;font-size:18px;"><strong>Total: ${moneda(venta.total)}</strong></p>

                <div style="text-align:center;margin-top:24px;padding:16px;background:#fefce8;border-radius:8px;">
                    <p style="margin:0 0 8px;"><strong>Imprime esta factura e inclúyela en el paquete.</strong></p>
                    <p style="margin:0 0 12px;">El cliente debe escanear el código al recibir el pedido.</p>
                    <img src="cid:qr-entrega" alt="Código QR de confirmación" width="220" height="220" />
                    <p style="font-size:11px;color:#6b7280;word-break:break-all;">${escaparHtml(urlConfirmacion)}</p>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `qr-${venta.numero_orden}.png`,
                content: qrPng,
                cid: 'qr-entrega'
            }
        ]
    });
};
