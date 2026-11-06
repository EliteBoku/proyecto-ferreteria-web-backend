import {
  WHATSAPP_PROVIDER,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  TWILIO_CONTENT_SID,
  TWILIO_CONTENT_VARIABLES,
} from '../config/config.js';

/**
 * Convierte un teléfono escrito por el usuario al formato internacional E.164.
 * Acepta, por ejemplo: "300 123 4567", "3001234567", "+57 300-123-4567", "573001234567".
 * Si son 10 dígitos que empiezan por 3 (celular colombiano), agrega el indicativo +57.
 * Devuelve null si el número no es válido.
 */
export const normalizarTelefono = (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();
  const digitos = texto.replace(/\D/g, '');

  let e164;
  if (texto.startsWith('+')) {
    e164 = `+${digitos}`;
  } else if (digitos.length === 10 && digitos.startsWith('3')) {
    e164 = `+57${digitos}`;
  } else if (digitos.length === 12 && digitos.startsWith('57')) {
    e164 = `+${digitos}`;
  } else {
    return null;
  }

  // E.164: entre 8 y 15 dígitos después del "+".
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
};

const ETIQUETAS_RECEPCION = {
  completo: 'Completo y en buen estado ✅',
  con_danos: 'Con daños ⚠️',
  incompleto: 'Incompleto ⚠️',
};

const formatoMoneda = (valor) =>
  Number(valor || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

/**
 * Datos del pedido disponibles como marcadores en TWILIO_CONTENT_VARIABLES:
 * {cliente} {numero_orden} {estado_recepcion} {fecha} {total} {ciudad} {direccion} {comentario}
 */
export const construirDatosPlantilla = ({ nombreCliente, venta }) => ({
  cliente: nombreCliente,
  numero_orden: venta.numero_orden,
  estado_recepcion: (ETIQUETAS_RECEPCION[venta.entrega?.estado_recepcion] || 'Sin especificar')
    .replace(/\s*[✅⚠️]+/gu, ''),
  fecha: new Date(venta.entrega?.confirmada_en || Date.now())
    .toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
  total: formatoMoneda(venta.total),
  ciudad: venta.direccion_envio?.ciudad || '',
  direccion: venta.direccion_envio?.direccion || '',
  comentario: venta.entrega?.comentario || 'Sin comentarios',
});

// Reemplaza {marcadores} en los valores del JSON de variables de la plantilla.
const rellenarVariables = (plantillaJson, datos) => {
  const variables = JSON.parse(plantillaJson);
  const resultado = {};
  for (const [clave, valor] of Object.entries(variables)) {
    resultado[clave] = String(valor).replace(/\{(\w+)\}/g, (marca, nombre) =>
      nombre in datos ? String(datos[nombre]) : marca,
    );
  }
  return JSON.stringify(resultado);
};

/** Arma el texto del mensaje con el resumen de cómo llegó el pedido. */
export const construirMensajeEntrega = ({ nombreCliente, venta }) => {
  const productos = (venta.items || [])
    .map((item) => `• ${item.cantidad} x ${item.nombre_producto}`)
    .join('\n');

  const lineas = [
    `Hola ${nombreCliente} 👋`,
    '',
    `Confirmamos la entrega de tu pedido *${venta.numero_orden}* de Ferretería El Martillo.`,
    '',
    `📦 Estado reportado: ${ETIQUETAS_RECEPCION[venta.entrega?.estado_recepcion] || 'Sin especificar'}`,
    `📅 Fecha de recepción: ${new Date(venta.entrega?.confirmada_en || Date.now()).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
    `📍 Dirección: ${venta.direccion_envio?.direccion}, ${venta.direccion_envio?.ciudad}`,
  ];

  if (venta.entrega?.comentario) {
    lineas.push(`📝 Tu comentario: "${venta.entrega.comentario}"`);
  }

  lineas.push('', 'Productos:', productos, '', `Total: ${formatoMoneda(venta.total)}`);

  if (venta.entrega?.estado_recepcion && venta.entrega.estado_recepcion !== 'completo') {
    lineas.push('', 'Lamentamos el inconveniente. Nuestro equipo revisará tu caso y te contactará.');
  } else {
    lineas.push('', '¡Gracias por tu compra!');
  }

  return lineas.join('\n');
};

const enviarConTwilio = async (telefonoE164, mensaje, datosPlantilla = {}) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en el .env');
  }

  const cuerpo = { From: TWILIO_WHATSAPP_FROM, To: `whatsapp:${telefonoE164}` };
  if (TWILIO_CONTENT_SID) {
    // Plantilla de Twilio (obligatoria en la cuenta de prueba).
    cuerpo.ContentSid = TWILIO_CONTENT_SID;
    if (TWILIO_CONTENT_VARIABLES) {
      try {
        cuerpo.ContentVariables = rellenarVariables(TWILIO_CONTENT_VARIABLES, datosPlantilla);
      } catch {
        throw new Error('TWILIO_CONTENT_VARIABLES no es un JSON válido.');
      }
    }
  } else {
    cuerpo.Body = mensaje;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credenciales = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenciales}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(cuerpo),
    signal: AbortSignal.timeout(10000),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Error 63015: el número no se ha unido al sandbox con "join <código>".
    throw new Error(`Twilio respondió ${respuesta.status}: ${datos.message || 'error desconocido'}`);
  }
  return datos.sid;
};

/**
 * Envía el mensaje por el proveedor configurado.
 * Devuelve { estado, proveedor, error? } y nunca lanza excepciones:
 * un fallo de WhatsApp no debe deshacer la confirmación de la entrega.
 */
export const enviarWhatsApp = async (telefonoE164, mensaje, datosPlantilla = {}) => {
  if (!telefonoE164) {
    return { estado: 'omitido', proveedor: WHATSAPP_PROVIDER, error: 'El cliente no tiene un teléfono válido.' };
  }

  try {
    if (WHATSAPP_PROVIDER === 'twilio') {
      await enviarConTwilio(telefonoE164, mensaje, datosPlantilla);
      return { estado: 'enviado', proveedor: 'twilio' };
    }

    // Modo de prueba sin cuenta: el mensaje se muestra en la terminal del backend.
    console.log(`\n===== WhatsApp simulado para ${telefonoE164} =====\n${mensaje}\n==========================================\n`);
    return { estado: 'simulado', proveedor: 'consola' };
  } catch (error) {
    console.error('No fue posible enviar el WhatsApp:', error.message);
    return { estado: 'fallido', proveedor: WHATSAPP_PROVIDER, error: error.message };
  }
};
