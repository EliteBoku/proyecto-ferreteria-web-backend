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