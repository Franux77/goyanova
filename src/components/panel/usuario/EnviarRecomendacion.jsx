import React, { useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { llamarEmail } from '../../../utils/llamarEmail';
import './EnviarRecomendacion.css';

// Traduce errores técnicos a mensajes claros para quien use el botón.
const interpretarError = (err) => {
  const msg = err?.message || '';

  if (err instanceof TypeError && msg === 'Failed to fetch') {
    return 'Se cortó la conexión mientras se enviaban los correos. Revisá tu wifi o datos e intentá de nuevo.';
  }
  if (msg.includes('Could not choose the best candidate function')) {
    return 'Hubo un problema técnico interno de la plataforma. Probá de nuevo en unos minutos.';
  }
  if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission')) {
    return 'No tenés permiso para hacer esta acción. Probá cerrar sesión y volver a entrar.';
  }
  if (msg) return msg;
  return 'No se pudo completar el envío. Intentá de nuevo en un momento.';
};

const EnviarRecomendacion = ({ servicioId, nombreServicio }) => {
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);

  const handleEnviar = async () => {
    if (!window.confirm(
      `Se va a enviar un email recomendando "${nombreServicio}" a todos los usuarios de GoyaNova. Solo podés hacer esto una vez por mes. ¿Confirmás?`
    )) return;

    setResultado(null);
    setEnviando(true);

    let envioId = null;
    let enviados = 0;
    let fallos = 0;

    try {
      const { data: inicio, error: errorInicio } = await supabase.rpc(
        'iniciar_envio_recomendacion',
        { p_servicio_id: servicioId }
      );
      if (errorInicio) throw errorInicio;
      if (!inicio.success) throw new Error(inicio.error);

      envioId = inicio.envio_id;
      setProgreso({ actual: 0, total: 0 });

      // El servidor entrega los destinatarios de a lotes de 10 y manda los mails:
      // las direcciones de los usuarios nunca pasan por el navegador.
      let desde = 0;
      let total = 0;
      let hecho = false;
      let vueltas = 0;

      while (!hecho && vueltas < 1000) {
        vueltas++;
        const { ok, data } = await llamarEmail({
          tipo: 'recomendacion',
          envio_id: envioId,
          servicio_id: servicioId,
          desde
        });
        if (!ok) throw new Error(data?.message || 'No se pudo enviar un lote de correos');

        enviados += data.enviados;
        fallos += data.fallos;
        desde += data.procesados;
        total = data.total || total;
        hecho = data.hecho;
        setProgreso({ actual: desde, total });
      }

      await supabase.rpc('finalizar_envio_recomendacion', {
        p_envio_id: envioId,
        p_exito: enviados > 0,
        p_destinatarios: enviados
      });

      if (enviados === 0) {
        setResultado({
          ok: false,
          mensaje: `No se pudo enviar a ningún destinatario (${fallos} fallaron). Revisá la conexión o la configuración de Brevo.`
        });
      } else if (fallos > 0) {
        setResultado({
          ok: true,
          mensaje: `Enviado a ${enviados} de ${desde}. ${fallos} fallaron.`
        });
      } else {
        setResultado({ ok: true, mensaje: `Enviado a ${enviados} de ${desde} destinatarios.` });
      }

    } catch (err) {
      // Si el envío ya había empezado, se cierra para que no quede "en proceso" bloqueando el cupo del mes
      if (envioId) {
        await supabase.rpc('finalizar_envio_recomendacion', {
          p_envio_id: envioId,
          p_exito: enviados > 0,
          p_destinatarios: enviados,
          p_error: err?.message || 'Error durante el envío'
        });
      }
      setResultado({ ok: false, mensaje: interpretarError(err) });
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
            ? `Enviando ${progreso.actual}${progreso.total ? '/' + progreso.total : ''}...`
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