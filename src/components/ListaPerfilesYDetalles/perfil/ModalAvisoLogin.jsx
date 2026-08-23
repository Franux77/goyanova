import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModalAvisoLogin.css';

const ModalAvisoLogin = ({ isOpen, onClose, mensaje }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleIrALogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="aviso-login-overlay" onClick={onClose}>
      <div className="aviso-login-box" onClick={(e) => e.stopPropagation()}>
        <button className="aviso-login-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="aviso-login-icono">🔒</div>
        <h3 className="aviso-login-titulo">Necesitás iniciar sesión</h3>
        <p className="aviso-login-mensaje">
          {mensaje || 'Iniciá sesión para poder continuar con esta acción.'}
        </p>
        <div className="aviso-login-botones">
          <button className="aviso-login-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="aviso-login-btn-ingresar" onClick={handleIrALogin}>Iniciar sesión</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAvisoLogin;