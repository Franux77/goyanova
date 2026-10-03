// GoyaNova - mail de resumen de NOVEDADES (se envía a las 9:00 y a las 20:00 si hubo novedades)
//
// Quién lo llama: la base de datos (pg_cron + pg_net) justo después de generar el resumen, y el botón
// "Enviar por mail" del panel admin. Solo recibe el id del resumen: { resumen_id }.
//
// Seguridad:
//  - No hay forma de pasar destinatario, asunto ni texto: todo sale de la base.
//  - El id del resumen es un token de un solo uso (uuid), válido 30 minutos. Con un id inventado, usado o vencido
//    la base devuelve "nada para enviar" y esta función no manda nada.
//  - No usa ninguna clave de servicio: solo la clave pública (anon) y las funciones de la base.
//
// Variables de entorno (ya existen): BREVO_API_KEY, BREVO_SENDER_EMAIL (opcional),
//   SUPABASE_URL y SUPABASE_ANON_KEY (o VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)

const SITIO = (process.env.URL || 'https://goyanova.netlify.app').replace(/\/$/, '');
const EMAIL_REMITENTE_POR_DEFECTO = 'goyanovasoporte@gmail.com';
const ZONA = 'America/Argentina/Buenos_Aires';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTOS_EN_MAIL = 60;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

// caracteres de control e invisibles, armados con números
const RANGOS_INVISIBLES = [
  [0, 8], [11, 12], [14, 31], [127, 159],
  [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff],
];
const INVISIBLES = new RegExp(
  '[' + RANGOS_INVISIBLES.map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']',
  'g'
);
const texto = (v, max = 240) => String(v ?? '').replace(INVISIBLES, '').replace(/\s+/g, ' ').trim().slice(0, max);

const EMAIL_RE = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']{2,}$/;

const config = () => ({
  url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
  anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
});

async function rpc(nombre, args, cfg) {
  const r = await fetch(`${cfg.url}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, data };
}

async function enviarBrevo({ to, subject, html }) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: 'GoyaNova Novedades', email: process.env.BREVO_SENDER_EMAIL || EMAIL_REMITENTE_POR_DEFECTO },
      to: [to],
      subject,
      htmlContent: html,
    }),
  });
  return r.ok;
}

// ---------- formato ----------

const BLOQUES = [
  ['usuarios', 'Usuarios', '#1774f6'],
  ['servicios', 'Servicios', '#10b981'],
  ['opiniones', 'Reseñas y comentarios', '#f59e0b'],
  ['soporte', 'Soporte', '#6366f1'],
  ['moderacion', 'Moderación', '#ef4444'],
  ['dinero', 'Pagos y membresías', '#0ea5e9'],
];

const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtFechaCorta = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: ZONA, day: '2-digit', month: '2-digit' });
const fmtDiaLargo = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });

export function armarMail(resumen) {
  const total = Number(resumen.total) || 0;
  const hastaIso = resumen.hasta;
  const etiquetaCorte =
    resumen.corte === 'manana' ? 'resumen de las 9:00' : resumen.corte === 'noche' ? 'resumen de las 20:00' : 'resumen';
  const dia = fmtDiaLargo(hastaIso);
  const subject = `GoyaNova · ${total} ${total === 1 ? 'novedad' : 'novedades'} · ${dia} (${etiquetaCorte})`;

  const porBloque = resumen.cifras?.por_bloque || {};
  const alertas = Array.isArray(resumen.cifras?.alertas) ? resumen.cifras.alertas : [];
  const eventos = (Array.isArray(resumen.eventos) ? resumen.eventos : []).slice(0, MAX_EVENTOS_EN_MAIL);
  const restantes = Math.max(0, total - eventos.length);

  const tarjetas = BLOQUES.filter(([k]) => Number(porBloque[k]) > 0)
    .map(
      ([k, nombre, color]) =>
        `<td style="padding:4px"><div style="background:${color};color:#fff;border-radius:10px;padding:10px 14px;text-align:center;min-width:92px">
          <div style="font-size:22px;font-weight:700">${Number(porBloque[k])}</div>
          <div style="font-size:12px;opacity:.95">${esc(nombre)}</div></div></td>`
    )
    .join('');

  const bloqueAlertas = alertas.length
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin:16px 0">
        <div style="font-weight:700;color:#9a3412;margin-bottom:6px">⚠ Para atender</div>
        ${alertas
          .map((a) => `<div style="color:#7c2d12;font-size:14px;margin:3px 0">• ${esc(texto(a.texto, 120))}: <b>${Number(a.cantidad) || 0}</b></div>`)
          .join('')}
      </div>`
    : '';

  const secciones = BLOQUES.map(([k, nombre, color]) => {
    const lista = eventos.filter((e) => e.bloque === k);
    if (!lista.length) return '';
    return `<div style="margin:18px 0 6px;font-weight:700;color:${color};font-size:15px;border-bottom:2px solid ${color};padding-bottom:4px">${esc(nombre)}</div>
      ${lista
        .map(
          (e) => `<div style="padding:7px 0;border-bottom:1px solid #eef0f3">
            <div style="font-size:14px;color:#111827"><b>${esc(texto(e.titulo, 120))}</b>
              <span style="color:#9ca3af;font-size:12px"> · ${esc(fmtFechaCorta(e.fecha))} ${esc(fmtHora(e.fecha))}</span></div>
            ${e.detalle ? `<div style="font-size:13px;color:#4b5563;margin-top:2px">${esc(texto(e.detalle, 240))}</div>` : ''}
            ${e.actor ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">Por ${esc(texto(e.actor, 80))}</div>` : ''}
          </div>`
        )
        .join('')}`;
  }).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:18px">
    <div style="background:linear-gradient(135deg,#1774f6,#6366f1);border-radius:14px 14px 0 0;padding:22px 24px;color:#fff">
      <div style="font-size:13px;opacity:.9">GoyaNova · Novedades</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">${total} ${total === 1 ? 'novedad' : 'novedades'}</div>
      <div style="font-size:13px;opacity:.95;margin-top:4px">${esc(fmtFechaCorta(resumen.desde))} ${esc(fmtHora(resumen.desde))} → ${esc(fmtFechaCorta(hastaIso))} ${esc(fmtHora(hastaIso))} (hora de Argentina)</div>
    </div>
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:18px 24px 24px">
      <table role="presentation" style="border-collapse:collapse"><tr>${tarjetas}</tr></table>
      ${bloqueAlertas}
      ${secciones}
      ${restantes > 0 ? `<p style="color:#6b7280;font-size:13px;margin-top:16px">…y ${restantes} más. Mirá todo en el panel.</p>` : ''}
      <div style="text-align:center;margin:24px 0 6px">
        <a href="${SITIO}/panel/admin/novedades" style="background:#1774f6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Abrir Novedades en el panel</a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:18px">Recibís este resumen porque estás en la lista de Novedades de GoyaNova.<br>Se envía a las 9:00 y a las 20:00, solo si hubo novedades.</p>
    </div>
  </div></body></html>`;

  return { subject, html };
}

// ---------- handler ----------

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if ((event.body || '').length > 2000) return json(413, { error: 'Pedido demasiado grande' });

  let cuerpo;
  try {
    cuerpo = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Pedido inválido' });
  }
  const id = String(cuerpo?.resumen_id || '');
  if (!UUID_RE.test(id)) return json(400, { error: 'Pedido inválido' });

  const cfg = config();
  if (!cfg.url || !cfg.anon || !process.env.BREVO_API_KEY) {
    return json(500, { error: 'Servicio de email no configurado' });
  }

  // "Reclamar" el envío: la base lo marca como en curso y devuelve el contenido y los destinatarios
  let reclamo;
  try {
    reclamo = await rpc('novedades_reclamar_envio', { p_id: id }, cfg);
  } catch {
    return json(502, { error: 'No se pudo consultar la base' });
  }
  if (!reclamo.ok) return json(502, { error: 'No se pudo consultar la base' });
  const resumen = reclamo.data;
  if (!resumen || !resumen.id) return json(409, { ok: false, error: 'No hay ningún envío pendiente para ese resumen' });

  const destinatarios = (Array.isArray(resumen.destinatarios) ? resumen.destinatarios : [])
    .map((d) => ({ email: String(d?.email || '').trim().toLowerCase(), name: texto(d?.nombre, 60) || undefined }))
    .filter((d) => EMAIL_RE.test(d.email) && d.email.length <= 254);

  if (!destinatarios.length) {
    await rpc('novedades_confirmar_envio', { p_id: id, p_enviados: 0, p_error: 'Sin destinatarios válidos' }, cfg).catch(() => {});
    return json(200, { ok: false, enviados: 0, error: 'Sin destinatarios válidos' });
  }

  const { subject, html } = armarMail(resumen);
  const resultados = await Promise.allSettled(
    destinatarios.map((d) => enviarBrevo({ to: d, subject, html }))
  );
  const enviados = resultados.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const error = enviados === 0 ? 'Brevo rechazó todos los envíos' : enviados < destinatarios.length ? 'Algunos envíos fallaron' : null;

  await rpc('novedades_confirmar_envio', { p_id: id, p_enviados: enviados, p_error: error }, cfg).catch(() => {});

  return json(200, { ok: enviados > 0, enviados, total: destinatarios.length });
};
