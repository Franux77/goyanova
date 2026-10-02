// Llama a la función de Netlify que envía emails.
// Solo se indica el TIPO de mail y datos mínimos: destinatario, remitente y plantilla los decide el servidor.
import { supabase } from './supabaseClient';

export async function llamarEmail(payload, accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    let token = accessToken;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    }
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // sin sesión: se envía igual (los mails públicos, como el de contacto, no la necesitan)
  }

  const res = await fetch('/.netlify/functions/enviar-email', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
