export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Método no permitido' }) };
  }

  try {
    const { nombre, email, mensaje } = JSON.parse(event.body || '{}');

    if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
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
        sender: { name: 'GoyaNova Contacto', email: BREVO_SENDER },
        to: [{ email: BREVO_SENDER, name: 'Soporte GoyaNova' }],
        subject: `Nuevo mensaje de ${nombre} - GoyaNova`,
        htmlContent: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .field { margin-bottom: 20px; }
                .label { font-weight: bold; color: #667eea; margin-bottom: 5px; display: block; }
                .value { background: white; padding: 15px; border-radius: 5px; border-left: 3px solid #667eea; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📧 Nuevo Mensaje de Contacto</h1>
                  <p>GoyaNova - Plataforma de Servicios</p>
                </div>
                <div class="content">
                  <div class="field"><span class="label">👤 Nombre:</span><div class="value">${nombre}</div></div>
                  <div class="field"><span class="label">📧 Email:</span><div class="value">${email}</div></div>
                  <div class="field"><span class="label">💬 Mensaje:</span><div class="value">${mensaje}</div></div>
                </div>
                <div class="footer">
                  <p>Este mensaje fue enviado desde el formulario de contacto de GoyaNova</p>
                  <p>Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
                </div>
              </div>
            </body>
          </html>
        `,
        replyTo: { email, name: nombre },
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