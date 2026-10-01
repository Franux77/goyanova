import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import './ResenasHome.css';

// Franja compacta de confianza: promedio + cantidad de opiniones + reseña rotativa
// y un botón para dejar la reseña en el momento, sin salir del Home.
const ResenasHome = () => {
  const { user, perfil } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [indice, setIndice] = useState(0);
  const [abierto, setAbierto] = useState(false);

  const cargar = async () => {
    try {
      const { data, error } = await supabase.rpc('resenas_resumen_publico');
      if (!error && data) setResumen(data);
    } catch {
      // Si falla, simplemente no se muestra la franja
    }
  };

  useEffect(() => { cargar(); }, []);

  const ultimas = resumen?.ultimas || [];

  // Rota una reseña cada 5 segundos
  useEffect(() => {
    if (ultimas.length < 2) return undefined;
    const id = setInterval(() => setIndice((i) => (i + 1) % ultimas.length), 5000);
    return () => clearInterval(id);
  }, [ultimas.length]);

  if (!resumen) return null;

  const total = Number(resumen.total) || 0;
  const promedio = Number(resumen.promedio) || 0;
  const actual = ultimas[indice];

  return (
    <>
      <section className="resenas-home" aria-label="Opiniones sobre GoyaNova">
        <div className="resenas-home-izq">
          {total > 0 ? (
            <>
              <div className="resenas-home-nota">
                <span className="material-icons">star</span>
                <strong>{promedio.toFixed(1)}</strong>
              </div>
              <div className="resenas-home-texto">
                <strong>
                  {total === 1 ? '1 persona ya opinó' : `${total} personas ya opinaron`}
                </strong>
                <span>sobre GoyaNova</span>
              </div>
            </>
          ) : (
            <div className="resenas-home-texto">
              <strong>Sé la primera persona en opinar</strong>
              <span>Tu reseña ayuda a que más vecinos confíen</span>
            </div>
          )}
        </div>

        {actual && (
          <p className="resenas-home-cita" key={indice}>
            <span className="resenas-home-cita-texto">“{actual.comentario}”</span>
            <em>— {actual.nombre}</em>
          </p>
        )}

        <button type="button" className="resenas-home-btn" onClick={() => setAbierto(true)}>
          <span className="material-icons">rate_review</span>
          Dejar <span className="resenas-solo-movil">mi </span>reseña
        </button>
      </section>

      {abierto && (
        <ModalResena
          user={user}
          perfil={perfil}
          onClose={() => setAbierto(false)}
          onEnviada={cargar}
        />
      )}
    </>
  );
};

const ModalResena = ({ user, perfil, onClose, onEnviada }) => {
  const nombreInicial = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ');
  const [nombre, setNombre] = useState(nombreInicial);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (nombre.trim().length < 2) return setError('Escribí tu nombre.');
    if (comentario.trim().length < 10) return setError('Contanos un poco más (mínimo 10 letras).');

    setEnviando(true);
    try {
      let ip = null;
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        ip = (await r.json()).ip;
      } catch {
        ip = null;
      }

      const { data, error: err } = await supabase.rpc('crear_comentario_validado', {
        p_nombre_completo: nombre.trim(),
        // Con sesión iniciada se usa el email de la cuenta; si es anónimo no se pide ninguno
        p_email: user?.email || perfil?.email || '',
        p_comentario: comentario.trim(),
        p_puntuacion: puntuacion,
        p_ip_address: ip,
        p_user_agent: navigator.userAgent,
      });
      if (err) throw err;
      if (data?.success) {
        setOk(true);
        onEnviada?.();
      } else {
        setError(data?.error || 'No pudimos enviar tu reseña.');
      }
    } catch {
      setError('Ocurrió un error. Probá de nuevo en un momento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="resenas-modal-fondo" onClick={onClose}>
      <div className="resenas-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="resenas-modal-cerrar" onClick={onClose} aria-label="Cerrar">
          <span className="material-icons">close</span>
        </button>

        {ok ? (
          <div className="resenas-modal-ok">
            <span className="material-icons">check_circle</span>
            <h3>¡Gracias por tu opinión!</h3>
            <p>La vamos a revisar y se publica en breve.</p>
            <button type="button" className="resenas-modal-enviar" onClick={onClose}>Listo</button>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <h3>¿Qué te parece GoyaNova?</h3>
            <p className="resenas-modal-sub">Tu reseña ayuda a que más vecinos nos conozcan.</p>

            <div className="resenas-estrellas" role="radiogroup" aria-label="Puntuación">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={puntuacion === n}
                  aria-label={`${n} estrellas`}
                  className={n <= puntuacion ? 'activa' : ''}
                  onClick={() => setPuntuacion(n)}
                >
                  <span className="material-icons">star</span>
                </button>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Contanos tu experiencia…"
              rows={3}
              maxLength={1000}
            />
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              maxLength={80}
            />

            {error && <p className="resenas-modal-error">{error}</p>}

            <button type="submit" className="resenas-modal-enviar" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar reseña'}
            </button>
            <p className="resenas-modal-nota">Se publica después de una revisión rápida.</p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResenasHome;
