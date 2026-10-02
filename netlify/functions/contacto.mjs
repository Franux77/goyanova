// GoyaNova - formulario de contacto (versión segura)
// Mismo formato de entrada que antes ({ nombre, email, mensaje }), así que Contacto.jsx no cambia.
// Cambios: el texto se escapa antes de ponerlo en el mail, se validan formato y largos,
// y hay límite de envíos por IP, por mail y global.
// Requiere haber corrido sql/emails_seguro.sql y las variables SUPABASE_URL / SUPABASE_ANON_KEY
// (o VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) en Netlify, igual que enviar-email.

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// caracteres de control e invisibles (armado con números para que el archivo sea legible)
const RANGOS = [[0, 8], [11, 12], [14, 31], [127, 159], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff]];
const INVISIBLES = new RegExp('[' + RANGOS.map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g');
const limpiar = (v, max) => String(v ?? '').replace(INVISIBLES, '').trim().slice(0, max);
const unaLinea = (v, max) => limpiar(v, max).replace(/\s+/g, ' ');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
const EMAIL_RE = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']{2,}$/;

async function permitir(tipo, clave, max, minutos, cfg) {
  try {
    const r = await fetch(`${cfg.url}/rest/v1/rpc/permitir_envio_email`, {
      method: 'POST',
      headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_tipo: tipo, p_clave: String(clave), p_max: max, p_minutos: minutos }),
    });
    return r.ok && (await r.json()) === true;
  } catch {
    return false; // si no se puede verificar el límite, no se envía
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Método no permitido' });
  }

  try {
    if ((event.body || '').length > 20000) return json(413, { message: 'Solicitud demasiado grande' });

    let datos;
    try {
      datos = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { message: 'Solicitud inválida' });
    }

    const nombre = unaLinea(datos?.nombre, 100);
    const email = unaLinea(datos?.email, 254).toLowerCase();
    const mensaje = limpiar(datos?.mensaje, 5000);

    if (!nombre || !email || !mensaje) {
      return json(400, { message: 'Faltan campos obligatorios' });
    }
    if (!EMAIL_RE.test(email)) {
      return json(400, { message: 'El email no es válido' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER = process.env.BREVO_SENDER_EMAIL || 'goyanovasoporte@gmail.com';
    const cfg = {
      url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
      anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    };

    if (!BREVO_API_KEY || !cfg.url || !cfg.anon) {
      console.error('Falta BREVO_API_KEY o las variables de Supabase en Netlify');
      return json(500, { message: 'Servicio de contacto no configurado' });
    }

    const h = event.headers || {};
    const ip = h['x-nf-client-connection-ip'] || String(h['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';

    const permitido =
      (await permitir('contacto_form_ip', ip, 5, 60, cfg)) &&
      (await permitir('contacto_form_mail', email, 3, 60, cfg)) &&
      (await permitir('contacto_form_global', 'todos', 100, 60, cfg));
    if (!permitido) {
      return json(429, { message: 'Enviaste muchos mensajes seguidos. Probá de nuevo en un rato.' });
    }

    const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const mensajeHtml = esc(mensaje).replace(/\r?\n/g, '<br>');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: 'GoyaNova Contacto', email: BREVO_SENDER },
        to: [{ email: BREVO_SENDER, name: 'Soporte GoyaNova' }],
        subject: `Nuevo mensaje de ${nombre} - GoyaNova`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0;">Nuevo mensaje de contacto</h1>
              <p style="margin: 8px 0 0;">GoyaNova - Plataforma de Servicios</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p><strong style="color: #667eea;">Nombre:</strong></p>
              <div style="background: white; padding: 15px; border-left: 3px solid #667eea;">${esc(nombre)}</div>
              <p><strong style="color: #667eea;">Email:</strong></p>
              <div style="background: white; padding: 15px; border-left: 3px solid #667eea;">${esc(email)}</div>
              <p><strong style="color: #667eea;">Mensaje:</strong></p>
              <div style="background: white; padding: 15px; border-left: 3px solid #667eea;">${mensajeHtml}</div>
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">
              Enviado desde el formulario de contacto de GoyaNova - ${esc(fecha)}
            </p>
          </div>`,
        replyTo: { email, name: nombre },
      }),
    });

    if (!response.ok) {
      return json(502, { message: 'Error al enviar' });
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error('contacto:', err);
    return json(500, { message: 'Error interno del servidor' });
  }
};
