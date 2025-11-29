import React from 'react';
import './SuspensionModal.css';

const SuspensionModal = ({ suspension, onCerrarSesion, onContactarSoporte }) => {
  const esPermanente = suspension?.tipo_suspension === 'permanente';
  const diasRestantes = suspension?.dias_restantes || 0;

  return (
    <div className="suspension-overlay">
      <div className="suspension-modal">
        <div className="suspension-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>

        <h2 className="suspension-titulo">Cuenta Suspendida</h2>

        <div className="suspension-contenido">
          {esPermanente ? (
            <p className="suspension-texto">
              Tu cuenta ha sido suspendida de forma <strong>permanente</strong>.
            </p>
          ) : (
            <p className="suspension-texto">
              Tu cuenta ha sido suspendida temporalmente por <strong>{diasRestantes} día{diasRestantes !== 1 ? 's' : ''}</strong>.
            </p>
          )}

          {suspension?.motivo && (
            <div className="suspension-motivo">
              <strong>Motivo:</strong>
              <p>{suspension.motivo}</p>
            </div>
          )}

          <p className="suspension-info">
            Durante este período no puedes acceder a tu cuenta ni a tus servicios publicados.
          </p>
        </div>

        <div className="suspension-acciones">
          <button 
            className="btn-soporte"
            onClick={onContactarSoporte}
          >
            📧 Contactar Soporte
          </button>
          <button 
            className="btn-cerrar-sesion"
            onClick={onCerrarSesion}
          >
            Cerrar Sesión
          </button>
        </div>

        {!esPermanente && suspension?.fecha_fin && (
          <div className="suspension-fecha-fin">
            <small>
              Finaliza: {new Date(suspension.fecha_fin).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspensionModal;