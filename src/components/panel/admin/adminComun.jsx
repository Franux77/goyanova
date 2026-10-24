// Piezas comunes de las listas del admin: ventana (modal), avisos y fechas.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AdminListas.css';

/** "hace 3 días", "hace 2 h"… */
export const hace = (fecha) => {
  if (!fecha) return 'nunca';
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fechaCorta = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const normalizarTexto = (t) =>
  String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Avisos que aparecen abajo y se van solos (en lugar de alert) */
export const useAvisos = () => {
  const [avisos, setAvisos] = useState([]);
  const id = useRef(0);
  const avisar = useCallback((texto, tipo = 'ok') => {
    id.current += 1;
    const actual = id.current;
    setAvisos((a) => [...a, { id: actual, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== actual)), 4200);
  }, []);
  const Avisos = () => (
    <div className="adm-toasts" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className={`adm-toast ${a.tipo}`}>
          <span className="material-icons">{a.tipo === 'error' ? 'error' : 'check_circle'}</span>
          {a.texto}
        </div>
      ))}
    </div>
  );
  return { avisar, Avisos };
};

/** Ventana: abajo en el celular, centrada en la PC. Se cierra con Escape o tocando afuera. */
export const Modal = ({ titulo, subtitulo, onCerrar, children, pie }) => {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar]);

  return (
    <div className="adm-modal-fondo" onClick={onCerrar}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="adm-modal-cabecera">
          <div>
            <h3>{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="adm-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </header>
        <div className="adm-modal-cuerpo">{children}</div>
        {pie && <footer className="adm-modal-pie">{pie}</footer>}
      </div>
    </div>
  );
};
