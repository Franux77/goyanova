// ModalMantenimiento.jsx
import React, { useEffect, useState } from 'react';
import './ModalMantenimiento.css';

const ModalMantenimiento = ({ config }) => {
  const [tiempoRestante, setTiempoRestante] = useState('');

  useEffect(() => {
    if (!config?.fecha_estimada_fin || !config?.mostrar_tiempo_estimado) return;

    const calcularTiempo = () => {
      const ahora = new Date();
      const fin = new Date(config.fecha_estimada_fin);
      const diff = fin - ahora;

      if (diff <= 0) {
        setTiempoRestante('Pronto estaremos de vuelta');
        return;
      }

      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (horas > 24) {
        const dias = Math.floor(horas / 24);
        setTiempoRestante(`Aprox. ${dias} día${dias > 1 ? 's' : ''}`);
      } else if (horas > 0) {
        setTiempoRestante(`Aprox. ${horas}h ${minutos}m`);
      } else {
        setTiempoRestante(`Aprox. ${minutos} minutos`);
      }
    };

    calcularTiempo();
    const interval = setInterval(calcularTiempo, 60000);

    return () => clearInterval(interval);
  }, [config]);

  return (
    <div className="modal-mantenimiento-overlay" role="dialog" aria-modal="true" aria-labelledby="mantenimiento-titulo">
      <div className="modal-mantenimiento-content">
        <div className="modal-mantenimiento-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>

        <h1 id="mantenimiento-titulo" className="modal-mantenimiento-titulo">
          {config?.titulo_mantenimiento || 'Estamos en mantenimiento'}
        </h1>

        <p className="modal-mantenimiento-mensaje">
          {config?.mensaje_mantenimiento || 'Estamos realizando mejoras en la plataforma. Volveremos pronto.'}
        </p>

        {tiempoRestante && (
          <div className="modal-mantenimiento-tiempo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{tiempoRestante}</span>
          </div>
        )}

        <div className="modal-mantenimiento-footer">
          <p>¡Gracias por tu paciencia!</p>
          <p>@GoyaNova</p>
          <div className="modal-mantenimiento-social">
            <a href="https://instagram.com/graficoemprendedorweb" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="graficoemprendedorr@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="Correo electrónico">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>

          {/* Link para administradores */}
          <p className="modal-mantenimiento-admin-link">
            ¿Eres administrador? <a href="/login">Inicia sesión aquí</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModalMantenimiento;