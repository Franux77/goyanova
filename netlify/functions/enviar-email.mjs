export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Método no permitido' }) };
  }

  try {
    const { senderName, to, subject, htmlContent, replyTo } = JSON.parse(event.body || '{}');

    if (!to?.email || !subject || !htmlContent) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Faltan campos obligatorios' }) };
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER = process.env.BREVO_SENDER_EMAIL || 'goyanovasoporte@gmail.com';

    if (!BREVO_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ message: 'Falta configurar BREVO_API_KEY en Netlify' }) };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: senderName || 'GoyaNova', email: BREVO_SENDER },
        to: [to],
        subject,
        htmlContent,
        ...(replyTo ? { replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { statusCode: 502, body: JSON.stringify({ message: errorData.message || 'Error al enviar' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno del servidor' }) };
  }
};