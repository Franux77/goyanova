import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstalarApp } from '../utils/instalarApp';
import './InstallPWAModal.css';

// Cuándo y cada cuánto aparece el modal
const ESPERA_MINIMA_MS = 8000;            // nunca apenas abre la página
const ESPERA_IOS_MS = 25000;              // iPhone: no hay instalación directa, se espera más
const POSPONER_MAS_TARDE_MS = 3 * 24 * 60 * 60 * 1000;  // "Más tarde": 3 días
const POSPONER_CERRAR_MS = 7 * 24 * 60 * 60 * 1000;    // X o rechazo: 7 días
const CLAVE_POSPUESTO = 'pwa-modal-pospuesto-hasta';

const estaPospuesto = () => {
  try {
    return Number(localStorage.getItem(CLAVE_POSPUESTO) || 0) > Date.now();
  } catch {
    return false;
  }
};

const posponer = (ms) => {
  try {
    localStorage.setItem(CLAVE_POSPUESTO, String(Date.now() + ms));
  } catch {
    // modo privado
  }
};

// Si hay otro modal abierto (promo de bienvenida, etc.) se espera
const hayOtroModal = () =>
  sessionStorage.getItem('mostrar_modal_promo') === 'true' ||
  !!document.querySelector('.modal-overlay, .resenas-modal-fondo');

/*
  Reglas:
  - Android / PC con Chrome o Edge: aparece SOLO cuando el navegador ya permite instalar
    (así el botón instala directo, sin tutorial).
  - iPhone / iPad: Apple no permite instalar con un botón, así que se muestran los pasos.
  - Otros navegadores sin instalación directa: no se insiste; queda el botón
    "Descargar app" del Home que lleva a /instalar.
*/
const InstallPWAModal = () => {
  const navigate = useNavigate();
  const { puedeInstalar, yaInstalada, esIOS, instalar } = useInstalarApp();
  const [showModal, setShowModal] = useState(false);
  const [listoPorTiempo, setListoPorTiempo] = useState(false);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setListoPorTiempo(true), esIOS ? ESPERA_IOS_MS : ESPERA_MINIMA_MS);
    return () => clearTimeout(t);
  }, [esIOS]);

  useEffect(() => {
    if (showModal || !listoPorTiempo || yaInstalada || estaPospuesto()) return undefined;
    if (!puedeInstalar && !esIOS) return undefined;

    // Espera a que no haya otro modal abierto
    const intentar = () => {
      if (hayOtroModal()) return false;
      setShowModal(true);
      return true;
    };
    if (intentar()) return undefined;
    const id = setInterval(() => intentar() && clearInterval(id), 4000);
    return () => clearInterval(id);
  }, [listoPorTiempo, puedeInstalar, yaInstalada, esIOS, showModal]);

  // Si se instala mientras está abierto, se cierra solo
  useEffect(() => {
    if (yaInstalada) setShowModal(false);
  }, [yaInstalada]);

  useEffect(() => {
    if (!showModal) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleInstall = async () => {
    setInstalando(true);
    const resultado = await instalar();
    setInstalando(false);
    if (resultado === 'accepted') {
      setShowModal(false);
    } else if (resultado === 'dismissed') {
      posponer(POSPONER_CERRAR_MS);
      setShowModal(false);
    } else {
      // Chrome ya no ofrece instalar en esta carga: se muestran los pasos
      setShowModal(false);
      navigate('/instalar');
    }
  };

  const handleClose = () => {
    posponer(POSPONER_CERRAR_MS);
    setShowModal(false);
  };

  const handleLater = () => {
    posponer(POSPONER_MAS_TARDE_MS);
    setShowModal(false);
  };

  if (!showModal) return null;

  const mostrarPasosIOS = esIOS && !puedeInstalar;

  return (
    <div className="pwa-overlay" onClick={handleLater}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-close" onClick={handleClose} aria-label="Cerrar">
          <span className="material-icons">close</span>
        </button>

        <div className="pwa-header">
          <img
            src="/assets/GoyaNova_20250918_144009_0000.png"
            alt="GoyaNova"
            className="pwa-logo"
          />
          <h2>¡Instalá GoyaNova!</h2>
          <p>Acceso rápido desde tu pantalla de inicio</p>
        </div>

        <div className="pwa-benefits">
          <div className="benefit">
            <span className="material-icons">speed</span>
            <span>Más rápido</span>
          </div>
          <div className="benefit">
            <span className="material-icons">phone_iphone</span>
            <span>En tu pantalla</span>
          </div>
          <div className="benefit">
            <span className="material-icons">notifications</span>
            <span>Notificaciones</span>
          </div>
        </div>

        {mostrarPasosIOS ? (
          <div className="pwa-ios-instructions">
            <h3>Para instalar en iPhone/iPad:</h3>
            <ol>
              <li>Tocá el ícono <strong>Compartir</strong> ⎙ (cuadrado con flecha) abajo</li>
              <li>Desplazate y tocá <strong>"Agregar a pantalla de inicio"</strong></li>
              <li>Tocá <strong>"Agregar"</strong></li>
            </ol>
            <div className="pwa-actions" style={{ marginTop: '12px' }}>
              <button className="btn-install" onClick={handleClose}>
                Entendido
              </button>
              <button className="btn-later" onClick={handleLater}>
                Más tarde
              </button>
            </div>
          </div>
        ) : (
          <div className="pwa-actions">
            <button className="btn-install" onClick={handleInstall} disabled={instalando}>
              <span className="material-icons">download</span>
              {instalando ? 'Instalando…' : 'Instalar ahora'}
            </button>
            <button className="btn-later" onClick={handleLater}>
              Más tarde
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPWAModal;
