// GoyaNova - función de envío de emails (versión segura)
//
// Antes: cualquiera podía mandar un POST con destinatario, asunto y HTML libres y el mail salía
// firmado como GoyaNova. Ahora el navegador solo dice QUÉ tipo de mail quiere y con qué datos mínimos;
// el destinatario, el remitente y la plantilla las decide este servidor.
//
// Tipos:
//   login_nuevo        (con sesión)  aviso de inicio de sesión, SOLO al email de la cuenta
//   contacto           (público)     consulta de ayuda: llega a soporte + confirmación fija al visitante
//   respuesta_soporte  (admin)       respuesta de soporte; el contenido se lee de la base, no del navegador
//   recomendacion      (dueño)       lote de mails de recomendación; los destinatarios los entrega la base
//
// Variables de entorno necesarias en Netlify:
//   BREVO_API_KEY, BREVO_SENDER_EMAIL (opcional)
//   SUPABASE_URL y SUPABASE_ANON_KEY  (o, si ya existen, VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)

const SITIO = (process.env.URL || 'https://goyanova.netlify.app').replace(/\/$/, '');
const EMAIL_SOPORTE = 'goyanovasoporte@gmail.com';

// ---------- utilidades ----------

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// caracteres de control e invisibles (se arma con números para que el archivo sea 100% legible)
const RANGOS_INVISIBLES = [
  [0, 8], [11, 12], [14, 31], [127, 159],
  [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff],
];
const INVISIBLES = new RegExp(
  '[' + RANGOS_INVISIBLES.map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']',
  'g'
);

const limpiar = (v, max) => String(v ?? '').replace(INVISIBLES, '').trim().slice(0, max);
const unaLinea = (v, max) => limpiar(v, max).replace(/\s+/g, ' ');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
const conSaltos = (s) => esc(s).replace(/\r?\n/g, '<br>');

const EMAIL_RE = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ipDe = (event) => {
  const h = event.headers || {};
  return (
    h['x-nf-client-connection-ip'] ||
    String(h['x-forwarded-for'] || '').split(',')[0].trim() ||
    'desconocida'
  );
};

const tokenDe = (event) => {
  const h = event.headers || {};
  const a = h.authorization || h.Authorization || '';
  return a.startsWith('Bearer ') ? a.slice(7).trim() : null;
};

// ---------- Supabase (siempre con la sesión de quien llama: no se usa ninguna clave de servicio) ----------

const config = () => ({
  url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
  anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
});

async function usuarioDe(token, cfg) {
  if (!token) return null;
  try {
    const r = await fetch(`${cfg.url}/auth/v1/user`, {
      headers: { apikey: cfg.anon, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id && u?.email ? { id: u.id, email: String(u.email) } : null;
  } catch {
    return null;
  }
}

async function rpc(nombre, args, token, cfg) {
  const r = await fetch(`${cfg.url}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: {
      apikey: cfg.anon,
      Authorization: `Bearer ${token || cfg.anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, data };
}

async function consultar(ruta, token, cfg) {
  const r = await fetch(`${cfg.url}/rest/v1/${ruta}`, {
    headers: { apikey: cfg.anon, Authorization: `Bearer ${token || cfg.anon}`, Accept: 'application/json' },
  });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

// true = se puede enviar; si el chequeo falla por cualquier motivo, NO se envía
async function permitir(tipo, clave, max, minutos, token, cfg) {
  try {
    const { ok, data } = await rpc(
      'permitir_envio_email',
      { p_tipo: tipo, p_clave: String(clave), p_max: max, p_minutos: minutos },
      token,
      cfg
    );
    return ok && data === true;
  } catch {
    return false;
  }
}

// ---------- Brevo ----------

async function enviarBrevo({ senderName, to, subject, html, replyTo }) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: process.env.BREVO_SENDER_EMAIL || EMAIL_SOPORTE },
      to: [to],
      subject,
      htmlContent: html,
      ...(replyTo ? { replyTo } : {}),
    }),
  });
  return r.ok;
}

// ---------- plantillas ----------

const ESTILO_BASE =
  "font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;";

const plantillaContacto = ({ titulo, origen, nombre, email, asunto, mensaje, logueado }) => `
  <div style="${ESTILO_BASE}">
    <div style="background: #1774f6; color: #fff; padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="margin: 0; font-size: 22px;">${esc(titulo)}</h1>
      <p style="margin: 8px 0 0; opacity: .9;">${esc(origen)}</p>
    </div>
    <div style="background: #fff; padding: 24px; border: 1px solid #e0e0e0;">
      <p><strong>Nombre:</strong> ${esc(nombre)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Asunto:</strong> ${esc(asunto)}</p>
      <p><strong>Mensaje:</strong></p>
      <div style="background: #f8f9fa; padding: 12px; border-left: 3px solid #1774f6;">${conSaltos(mensaje)}</div>
      <p style="font-size: 12px; color: #666;">Usuario ${logueado ? 'logueado' : 'no logueado'} - ${esc(
        new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
      )}</p>
    </div>
  </div>`;

const plantillaConfirmacion = () => `
  <div style="${ESTILO_BASE}">
    <div style="background: #1774f6; color: #fff; padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="margin: 0; font-size: 22px;">Consulta recibida</h1>
    </div>
    <div style="background: #fff; padding: 24px; border: 1px solid #e0e0e0;">
      <p>Hola, recibimos tu consulta en GoyaNova y la estamos revisando.</p>
      <p><strong>Te vamos a responder en menos de 24 horas.</strong></p>
      <p style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107;">
        Revisá tu carpeta de spam por si nuestra respuesta llega ahí.
      </p>
      <p style="font-size: 12px; color: #666;">Si no fuiste vos quien escribió a GoyaNova, ignorá este mensaje.</p>
      <p>Equipo de Soporte GoyaNova<br>${EMAIL_SOPORTE}</p>
    </div>
  </div>`;

const plantillaLogin = ({ dispositivo, metodo, fecha }) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h2 style="color: #1774f6;">Nuevo inicio de sesión detectado</h2>
    <p>Se inició sesión en tu cuenta de GoyaNova:</p>
    <ul style="line-height: 1.8;">
      <li><strong>Dispositivo:</strong> ${esc(dispositivo)}</li>
      <li><strong>Método:</strong> ${metodo === 'google' ? 'Google' : 'Correo y contraseña'}</li>
      <li><strong>Fecha:</strong> ${esc(fecha)}</li>
    </ul>
    <p>Si fuiste vos, no necesitás hacer nada.</p>
    <p style="color: #dc2626;"><strong>Si NO fuiste vos</strong>, cambiá tu contraseña ahora mismo desde la pantalla de inicio de sesión, opción "¿Olvidaste tu contraseña?".</p>
  </div>`;

const plantillaRespuesta = (m) => `
  <div style="${ESTILO_BASE}">
    <div style="background: #1774f6; color: #fff; padding: 28px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="margin: 0; font-size: 22px;">Respuesta a tu consulta</h1>
      <p style="margin: 8px 0 0; opacity: .9;">Equipo de Soporte GoyaNova</p>
    </div>
    <div style="background: #fff; padding: 28px; border: 1px solid #e0e0e0;">
      <h2 style="color: #1774f6;">Hola ${esc(m.nombre)}</h2>
      <p>Revisamos tu consulta y esta es nuestra respuesta:</p>
      <div style="background: #f8f9fa; padding: 15px; border-left: 3px solid #1774f6; margin: 20px 0;">
        <strong>Tu consulta original</strong><br>
        <strong>Asunto:</strong> ${esc(m.asunto)}<br>
        <strong>Mensaje:</strong><br>${conSaltos(m.mensaje)}
      </div>
      <div style="background: #e3f2fd; padding: 15px; border-left: 3px solid #1774f6; margin: 20px 0;">
        <strong>Nuestra respuesta</strong><br><br>${conSaltos(m.respuesta)}
      </div>
      <p>Si necesitás más ayuda, escribinos de nuevo cuando quieras.</p>
      <p>Saludos,<br><strong>Equipo de Soporte GoyaNova</strong></p>
    </div>
    <div style="padding: 16px; text-align: center; font-size: 12px; color: #666;">
      GoyaNova - ${EMAIL_SOPORTE}<br>Respuesta a tu consulta #${esc(String(m.id).slice(0, 8))}
    </div>
  </div>`;

const plantillaRecomendacion = ({ nombreDest, nombreServicio, servicioId }) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a; line-height: 1.6; font-size: 15px;">
    <p style="margin: 0 0 16px;">Hola${nombreDest ? ' ' + esc(nombreDest) : ''},</p>
    <p style="margin: 0 0 16px;">
      Te escribimos porque pensamos que te puede servir <strong>${esc(nombreServicio)}</strong>,
      un servicio publicado en GoyaNova.
    </p>
    <p style="margin: 0 0 16px;">
      Podés ver los detalles y contactar directo acá:<br>
      <a href="${SITIO}/perfil/${esc(servicioId)}" style="color: #2563EB;">${SITIO}/perfil/${esc(servicioId)}</a>
    </p>
    <p style="margin: 24px 0 0;">Saludos,<br>El equipo de GoyaNova</p>
    <p style="margin: 24px 0 0; font-size: 12px; color: #888;">Este correo se envió porque tenés una cuenta en GoyaNova.</p>
  </div>`;

// ---------- manejadores por tipo ----------

async function loginNuevo(body, ctx) {
  if (!ctx.usuario) return json(401, { message: 'Necesitás iniciar sesión' });
  if (!(await permitir('login_nuevo', ctx.usuario.id, 6, 60, ctx.token, ctx.cfg))) {
    return json(429, { message: 'Demasiados avisos, probá más tarde' });
  }
  const metodo = body.metodo === 'google' ? 'google' : 'password';
  const fecha = new Date().toLocaleString('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const ok = await enviarBrevo({
    senderName: 'GoyaNova Seguridad',
    to: { email: ctx.usuario.email, name: ctx.usuario.email },
    subject: 'Nuevo inicio de sesión en tu cuenta de GoyaNova',
    html: plantillaLogin({ dispositivo: unaLinea(body.dispositivo, 80) || 'Dispositivo desconocido', metodo, fecha }),
  });
  return ok ? json(200, { ok: true }) : json(502, { message: 'No se pudo enviar el aviso' });
}

async function contacto(body, ctx) {
  const nombre = unaLinea(body.nombre, 100);
  const email = unaLinea(body.email, 254).toLowerCase();
  const asunto = unaLinea(body.asunto, 150);
  const mensaje = limpiar(body.mensaje, 5000);
  const origen = body.origen === 'panel' ? 'panel' : 'publica';

  if (!nombre || !asunto || !mensaje || !EMAIL_RE.test(email)) {
    return json(400, { message: 'Revisá los datos del formulario' });
  }

  const clave = ctx.usuario ? ctx.usuario.id : ctx.ip;
  const permitido =
    (await permitir('contacto_origen', clave, 5, 60, ctx.token, ctx.cfg)) &&
    (await permitir('contacto_destino', email, 3, 60, ctx.token, ctx.cfg)) &&
    (await permitir('contacto_global', 'todos', 100, 60, ctx.token, ctx.cfg));
  if (!permitido) {
    return json(429, { message: 'Enviaste muchas consultas seguidas. Probá de nuevo en un rato.' });
  }

  const interno = await enviarBrevo({
    senderName: 'GoyaNova Ayuda',
    to: { email: EMAIL_SOPORTE, name: 'Soporte GoyaNova' },
    subject: `[${origen === 'panel' ? 'Ayuda' : 'Ayuda Pública'}] ${asunto}`,
    html: plantillaContacto({
      titulo: 'Nueva consulta de ayuda',
      origen: origen === 'panel' ? 'Centro de ayuda - Panel de usuario' : 'Centro de ayuda público',
      nombre,
      email,
      asunto,
      mensaje,
      logueado: !!ctx.usuario,
    }),
    replyTo: { email, name: nombre },
  });
  if (!interno) return json(502, { message: 'No se pudo enviar la consulta' });

  // Confirmación al visitante: texto FIJO, sin repetir nada de lo que escribió (así no sirve para mandar mensajes a terceros)
  await enviarBrevo({
    senderName: 'Soporte GoyaNova',
    to: { email, name: nombre },
    subject: 'Recibimos tu consulta - GoyaNova',
    html: plantillaConfirmacion(),
  }).catch(() => {});

  return json(200, { ok: true });
}

async function respuestaSoporte(body, ctx) {
  if (!ctx.usuario) return json(401, { message: 'Necesitás iniciar sesión' });
  const esAdmin = await rpc('es_admin', {}, ctx.token, ctx.cfg);
  if (!esAdmin.ok || esAdmin.data !== true) return json(403, { message: 'No autorizado' });

  const id = String(body.mensaje_id || '');
  if (!UUID_RE.test(id)) return json(400, { message: 'Mensaje inválido' });

  if (!(await permitir('respuesta_soporte', ctx.usuario.id, 60, 60, ctx.token, ctx.cfg))) {
    return json(429, { message: 'Demasiados envíos, probá más tarde' });
  }

  const filas = await consultar(
    `mensajes_soporte?id=eq.${id}&select=id,nombre,email,asunto,mensaje,respuesta,respondido_por,fecha_respuesta`,
    ctx.token,
    ctx.cfg
  );
  const m = Array.isArray(filas) ? filas[0] : null;
  if (!m || !m.respuesta || !EMAIL_RE.test(String(m.email || ''))) {
    return json(404, { message: 'No hay una respuesta guardada para enviar' });
  }
  // solo se manda la respuesta recién guardada por este mismo admin (no se puede reenviar mensajes viejos)
  const hace = Date.now() - new Date(m.fecha_respuesta || 0).getTime();
  if (m.respondido_por !== ctx.usuario.id || !(hace >= 0 && hace < 15 * 60 * 1000)) {
    return json(409, { message: 'La respuesta no es reciente' });
  }

  const ok = await enviarBrevo({
    senderName: 'Soporte GoyaNova',
    to: { email: m.email, name: unaLinea(m.nombre, 100) },
    subject: `Re: ${unaLinea(m.asunto, 150)}`,
    html: plantillaRespuesta(m),
  });
  return ok ? json(200, { ok: true }) : json(502, { message: 'No se pudo enviar el email' });
}

async function recomendacion(body, ctx) {
  if (!ctx.usuario) return json(401, { message: 'Necesitás iniciar sesión' });

  const servicioId = String(body.servicio_id || '');
  const envioId = Number(body.envio_id);
  const desde = Number(body.desde);
  if (!UUID_RE.test(servicioId) || !Number.isInteger(envioId) || !Number.isInteger(desde) || desde < 0) {
    return json(400, { message: 'Datos inválidos' });
  }

  if (!(await permitir('recomendacion', ctx.usuario.id, 300, 60, ctx.token, ctx.cfg))) {
    return json(429, { message: 'Demasiados envíos, probá más tarde' });
  }

  // la base valida que el envío exista, sea de este usuario, esté en curso, y entrega cada lote una sola vez
  const lote = await rpc(
    'tomar_lote_recomendacion',
    { p_envio_id: envioId, p_servicio_id: servicioId, p_desde: desde, p_limite: 10 },
    ctx.token,
    ctx.cfg
  );
  if (!lote.ok || !Array.isArray(lote.data)) {
    return json(409, { message: 'El envío no es válido o ya fue procesado' });
  }

  const filas = await consultar(`servicios?id=eq.${servicioId}&select=nombre,usuario_id`, ctx.token, ctx.cfg);
  const servicio = Array.isArray(filas) ? filas[0] : null;
  if (!servicio || servicio.usuario_id !== ctx.usuario.id) {
    return json(403, { message: 'No autorizado' });
  }
  const nombreServicio = unaLinea(servicio.nombre, 100);

  const resultados = await Promise.allSettled(
    lote.data
      .filter((d) => EMAIL_RE.test(String(d.email || '')))
      .map((d) =>
        enviarBrevo({
          senderName: 'GoyaNova',
          to: { email: d.email, name: unaLinea(d.nombre, 100) },
          subject: `${nombreServicio} ahora en GoyaNova`,
          html: plantillaRecomendacion({ nombreDest: unaLinea(d.nombre, 100), nombreServicio, servicioId }),
        })
      )
  );
  const enviados = resultados.filter((r) => r.status === 'fulfilled' && r.value === true).length;

  return json(200, {
    enviados,
    fallos: lote.data.length - enviados,
    procesados: lote.data.length,
    total: lote.data[0]?.total ?? 0,
    hecho: lote.data.length < 10,
  });
}

// ---------- entrada ----------

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Método no permitido' });
  }
  if (!process.env.BREVO_API_KEY) {
    console.error('Falta BREVO_API_KEY');
    return json(500, { message: 'Servicio de email no configurado' });
  }
  const cfg = config();
  if (!cfg.url || !cfg.anon) {
    console.error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY (o VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) en Netlify');
    return json(500, { message: 'Servicio de email no configurado' });
  }

  if ((event.body || '').length > 20000) return json(413, { message: 'Solicitud demasiado grande' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { message: 'Solicitud inválida' });
  }
  if (!body || typeof body !== 'object') return json(400, { message: 'Solicitud inválida' });

  const token = tokenDe(event);
  const ctx = { cfg, token, ip: ipDe(event), usuario: await usuarioDe(token, cfg) };

  try {
    switch (body.tipo) {
      case 'login_nuevo':
        return await loginNuevo(body, ctx);
      case 'contacto':
        return await contacto(body, ctx);
      case 'respuesta_soporte':
        return await respuestaSoporte(body, ctx);
      case 'recomendacion':
        return await recomendacion(body, ctx);
      default:
        return json(400, { message: 'Tipo de email no válido' });
    }
  } catch (err) {
    console.error('enviar-email:', err);
    return json(500, { message: 'Error interno del servidor' });
  }
};
