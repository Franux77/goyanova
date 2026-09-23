import React, { useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './EnviarRecomendacion.css';

const NETLIFY_EMAIL_URL = '/.netlify/functions/enviar-email';

// 🧪 Prueba puntual: mientras esto esté en `true`, el envío usa el flujo
// 100% real y definitivo (misma plantilla, mismas funciones) pero
// reemplaza la lista de destinatarios por solo tu email. Poné SOLO_A_MI en
// false cuando quieras que el botón le llegue de verdad a todos los usuarios.
const SOLO_A_MI = false;
const MI_EMAIL_DE_PRUEBA = { email: '12torresfranco@gmail.com', nombre: 'Franco' };

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
    const avisoPrueba = SOLO_A_MI
      ? '\n\n🧪 MODO PRUEBA ACTIVO: solo se va a enviar a 2 emails de prueba, NO a los usuarios reales.'
      : '';

    if (!window.confirm(
      `Se va a enviar un email recomendando "${nombreServicio}" ${SOLO_A_MI ? 'SOLO a tu correo de prueba' : 'a todos los usuarios de GoyaNova'}. ${SOLO_A_MI ? '' : 'Solo podés hacer esto una vez por mes. '}¿Confirmás?${avisoPrueba}`
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

      let lista;
      if (SOLO_A_MI) {
        lista = [MI_EMAIL_DE_PRUEBA];
      } else {
        const { data: destinatarios, error: errorDest } = await supabase.rpc(
          'listar_destinatarios_recomendacion',
          { p_servicio_id: servicioId }
        );
        if (errorDest) throw errorDest;
        lista = destinatarios || [];
      }

      setProgreso({ actual: 0, total: lista.length });

      let enviados = 0;
      let fallos = 0;

      for (let i = 0; i < lista.length; i++) {
        const dest = lista[i];
        try {
          const res = await fetch(NETLIFY_EMAIL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderName: 'GoyaNova',
              to: { email: dest.email, name: dest.nombre },
              subject: `${nombreServicio} ahora en GoyaNova`,
              htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a; line-height: 1.6; font-size: 15px;">

                  <p style="margin: 0 0 16px;">Hola${dest.nombre ? ' ' + dest.nombre : ''},</p>

                  <p style="margin: 0 0 16px;">
                    Te escribimos porque pensamos que te puede servir <strong>${nombreServicio}</strong>,
                    un servicio publicado en GoyaNova.
                  </p>

                  <p style="margin: 0 0 16px;">
                    Podés ver los detalles y contactar directo acá:
                    <br>
                    <a href="https://goyanova.netlify.app/perfil/${servicioId}" style="color: #2563EB;">
                      https://goyanova.netlify.app/perfil/${servicioId}
                    </a>
                  </p>

                  <p style="margin: 24px 0 0;">Saludos,<br>El equipo de GoyaNova</p>

                  <p style="margin: 24px 0 0; font-size: 12px; color: #888;">
                    Este correo se envió porque tenés una cuenta en GoyaNova.
                  </p>
                </div>
              `
            })
          });

          if (!res.ok) {
            const cuerpo = await res.json().catch(() => ({}));
            throw new Error(cuerpo.message || `Brevo devolvió un error (${res.status})`);
          }

          enviados++;
        } catch (err) {
          fallos++;
          console.error('Error enviando a', dest.email, err);
        }
        setProgreso({ actual: i + 1, total: lista.length });
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
          mensaje: `Enviado a ${enviados} de ${lista.length}. ${fallos} fallaron — revisá la consola para más detalle.`
        });
      } else {
        setResultado({ ok: true, mensaje: `Enviado a ${enviados} de ${lista.length} destinatarios.` });
      }

    } catch (err) {
      setResultado({ ok: false, mensaje: interpretarError(err) });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  };

  return (
    <div className="enviarecom-container">
      {SOLO_A_MI && (
        <p className="enviarecom-modo-prueba">
          <span className="material-icons">science</span>
          Modo prueba activo: solo se enviará a 2 direcciones de prueba
        </p>
      )}

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
          : (SOLO_A_MI ? 'Probar envío (solo a mí)' : 'Recomendar por email a todos')}
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