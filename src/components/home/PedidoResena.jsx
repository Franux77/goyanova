import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import { ModalResena } from './ResenasHome';
import './PedidoResena.css';

/*
  Pide la reseña de GoyaNova a quien tiene cuenta y todavía no opinó.
  Es una tarjeta chica abajo (no tapa la página): tocar una estrella abre el
  formulario con esa nota ya elegida.

  - Solo con sesión iniciada y cuenta de al menos 1 día (ya conoce la página).
  - Si ya dejó una reseña, no aparece nunca más.
  - "Ahora no" la pospone 5 días; como mucho se pide 3 veces.
*/
const ESPERA_MS = 7000;
const ANTIGUEDAD_MIN_MS = 24 * 60 * 60 * 1000;
const POSPONER_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_PEDIDOS = 3;

const leerControl = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(`pedido-resena-${uid}`)) || { veces: 0, hasta: 0 };
  } catch {
    return { veces: 0, hasta: 0 };
  }
};

const guardarControl = (uid, control) => {
  try {
    localStorage.setItem(`pedido-resena-${uid}`, JSON.stringify(control));
  } catch {
    // modo privado
  }
};

// No se muestra encima de otros carteles (instalar app, promo de bienvenida, etc.)
const hayOtroCartel = () =>
  sessionStorage.getItem('mostrar_modal_promo') === 'true' ||
  !!document.querySelector('.pwa-overlay, .modal-overlay, .resenas-modal-fondo');

const PedidoResena = () => {
  const { user, perfil } = useAuth();
  const [visible, setVisible] = useState(false);
  const [nota, setNota] = useState(null);

  useEffect(() => {
    if (!user?.id || !perfil?.creado_en) return undefined;
    if (Date.now() - new Date(perfil.creado_en).getTime() < ANTIGUEDAD_MIN_MS) return undefined;

    const control = leerControl(user.id);
    if (control.listo || control.veces >= MAX_PEDIDOS || control.hasta > Date.now()) return undefined;

    let cancelado = false;
    let intervalo = null;

    const temporizador = setTimeout(async () => {
      // ¿Ya dejó su reseña? (cada uno puede ver las propias)
      const { data, error } = await supabase
        .from('comentarios_proyecto')
        .select('id')
        .eq('usuario_id', user.id)
        .limit(1);
      if (cancelado || error) return;
      if (data?.length) {
        guardarControl(user.id, { ...control, listo: true });
        return;
      }

      const mostrar = () => {
        if (hayOtroCartel()) return false;
        setVisible(true);
        guardarControl(user.id, { ...control, veces: control.veces + 1, hasta: Date.now() + POSPONER_MS });
        return true;
      };
      if (!mostrar()) {
        intervalo = setInterval(() => mostrar() && clearInterval(intervalo), 5000);
      }
    }, ESPERA_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      clearInterval(intervalo);
    };
  }, [user?.id, perfil?.creado_en]);

  if (!user) return null;

  const cerrar = () => setVisible(false);

  const enviada = () => {
    guardarControl(user.id, { ...leerControl(user.id), listo: true });
  };

  return (
    <>
      {visible && nota === null && (
        <div className="pedido-resena" role="dialog" aria-label="Opiná sobre GoyaNova">
          <button type="button" className="pedido-resena-cerrar" onClick={cerrar} aria-label="Ahora no">
            <span className="material-icons">close</span>
          </button>
          <p className="pedido-resena-titulo">
            {perfil?.nombre ? `${perfil.nombre}, ¿qué` : '¿Qué'} te parece GoyaNova?
          </p>
          <p className="pedido-resena-sub">Tu opinión ayuda a que más vecinos se animen a usarla.</p>
          <div className="pedido-resena-estrellas" role="group" aria-label="Elegí una nota">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setNota(n)} aria-label={`${n} estrellas`}>
                <span className="material-icons">star</span>
              </button>
            ))}
          </div>
          <button type="button" className="pedido-resena-luego" onClick={cerrar}>
            Ahora no
          </button>
        </div>
      )}

      {nota !== null && (
        <ModalResena
          user={user}
          perfil={perfil}
          puntuacionInicial={nota}
          onEnviada={enviada}
          onClose={() => {
            setNota(null);
            setVisible(false);
          }}
        />
      )}
    </>
  );
};

export default PedidoResena;
