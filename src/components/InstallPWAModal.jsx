import React, { useState, useEffect } from 'react';
import './InstallPWAModal.css';

const InstallPWAModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('pwa-modal-seen');
    const isInstalled = localStorage.getItem('pwa-installed') === 'true';
    
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || window.navigator.standalone;

    const checkAndShowModal = () => {
      const hayModalPromo = sessionStorage.getItem('mostrar_modal_promo') === 'true';
      const hayModalVisible = document.querySelector('.modal-overlay') || 
                              document.querySelector('.promo-code-banner');
      
      if (!hasSeenModal && !isInstalled && !isStandalone && !hayModalPromo && !hayModalVisible) {
        setShowModal(true);
      } else if (hayModalPromo || hayModalVisible) {
        setTimeout(checkAndShowModal, 5000);
      }
    };

    const initialTimer = setTimeout(checkAndShowModal, 3000);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // 🔒 BLOQUEAR SCROLL DEL BODY CUANDO EL MODAL ESTÁ ABIERTO
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      // console.log('✅ App instalada');
      localStorage.setItem('pwa-installed', 'true');
    }
    
    setDeferredPrompt(null);
    handleClose();
  };

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem('pwa-modal-seen', 'true');
  };

  const handleLater = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="pwa-overlay" onClick={handleLater}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-close" onClick={handleClose}>
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

        {isIOS ? (
          <div className="pwa-ios-instructions">
            <h3>Para instalar en iPhone/iPad:</h3>
            <ol>
              <li>Tocá el ícono <strong>Compartir</strong> ⎙ (cuadrado con flecha) abajo</li>
              <li>Desplazate y tocá <strong>"Agregar a pantalla de inicio"</strong></li>
              <li>Tocá <strong>"Agregar"</strong></li>
            </ol>
          </div>
        ) : (
          <div className="pwa-actions">
            {deferredPrompt ? (
              <button className="btn-install" onClick={handleInstall}>
                <span className="material-icons">download</span>
                Instalar ahora
              </button>
            ) : (
              <div className="pwa-chrome-instructions">
                <p><strong>Para instalar:</strong></p>
                <ol>
                  <li>Abrí el menú de Chrome (⋮)</li>
                  <li>Tocá <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                </ol>
              </div>
            )}
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