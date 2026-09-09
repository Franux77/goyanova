import React, { useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './EnviarRecomendacion.css';

// Llama a la función Netlify existente (Brevo) una vez por destinatario.
// Con 60 usuarios hoy, mandarlos secuencialmente desde el navegador es
// suficiente; si la base crece mucho, esto se muda a un envío por lotes
// desde el servidor.
const NETLIFY_EMAIL_URL = '/.netlify/functions/enviar-email';

const EnviarRecomendacion = ({ servicioId, nombreServicio }) => {
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(null); // { actual, total }
  const [resultado, setResultado] = useState(null); // { ok, mensaje }

  const handleEnviar = async () => {
    if (!window.confirm(
      `Se va a enviar un email recomendando "${nombreServicio}" a todos los usuarios de GoyaNova. Solo podés hacer esto una vez por mes. ¿Confirmás?`
    )) return;

    setResultado(null);
    setEnviando(true);

    try {
      const { data: inicio, error: errorInicio } = await supabase.rpc(
        'iniciar_envio_recomendacion',
        { p_servicio_id: servicioId }
      );
      if (errorInicio) throw errorInicio;
      if (!inicio.success) throw new Error(inicio.error);

      const envioId = inicio.envio_id;

      const { data: destinatarios, error: errorDest } = await supabase.rpc(
        'listar_destinatarios_recomendacion',
        { p_servicio_id: servicioId }
      );
      if (errorDest) throw errorDest;

      const lista = destinatarios || [];
      setProgreso({ actual: 0, total: lista.length });

      let enviados = 0;
      for (let i = 0; i < lista.length; i++) {
        const dest = lista[i];
        try {
          await fetch(NETLIFY_EMAIL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderName: 'GoyaNova',
              to: { email: dest.email, name: dest.nombre },
              subject: `Te recomendamos: ${nombreServicio}`,
              htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                  <h2>¡Hola${dest.nombre ? ' ' + dest.nombre : ''}!</h2>
                  <p>Te queremos recomendar un servicio destacado en GoyaNova:</p>
                  <h3>${nombreServicio}</h3>
                  <p><a href="https://goyanova.netlify.app/perfil/${servicioId}"
                        style="background:#2563EB;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">
                    Ver el servicio
                  </a></p>
                </div>
              `
            })
          });
          enviados++;
        } catch (err) {
          console.error('Error enviando a', dest.email, err);
        }
        setProgreso({ actual: i + 1, total: lista.length });
      }

      await supabase.rpc('finalizar_envio_recomendacion', {
        p_envio_id: envioId,
        p_exito: true,
        p_destinatarios: enviados
      });

      setResultado({ ok: true, mensaje: `Enviado a ${enviados} de ${lista.length} usuarios.` });

    } catch (err) {
      setResultado({ ok: false, mensaje: err.message || 'Error al enviar' });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  };

  return (
    <div className="enviarecom-container">
      <button
        className="enviarecom-btn"
        onClick={handleEnviar}
        disabled={enviando}
      >
        <span className="material-icons">campaign</span>
        {enviando
          ? progreso
            ? `Enviando ${progreso.actual}/${progreso.total}...`
            : 'Preparando...'
          : 'Recomendar por email a todos'}
      </button>

      <p className="enviarecom-nota">Disponible una vez por mes</p>

      {resultado && (
        <p className={`enviarecom-resultado ${resultado.ok ? 'ok' : 'error'}`}>
          {resultado.mensaje}
        </p>
      )}
    </div>
  );
};

export default EnviarRecomendacion;