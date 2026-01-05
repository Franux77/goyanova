import React, { useState, useEffect } from 'react';
import './InstallPWAModal.css';

const InstallPWAModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const isInstalled = localStorage.getItem('pwa-installed') === 'true';
    
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || window.navigator.standalone;

    const checkAndShowModal = () => {
      // 🔥 SOLO verificar si ya está instalada o en standalone
      if (isInstalled || isStandalone) {
        return;
      }

      const hayModalPromo = sessionStorage.getItem('mostrar_modal_promo') === 'true';
      const hayModalVisible = document.querySelector('.modal-overlay') || 
                              document.querySelector('.promo-code-banner');
      
      // 🔥 CAMBIO: No verificar 'pwa-modal-seen' - permitir que reaparezca
      if (!hayModalPromo && !hayModalVisible) {
        setShowModal(true);
      } else if (hayModalPromo || hayModalVisible) {
        setTimeout(checkAndShowModal, 5000);
      }
    };

    const initialTimer = setTimeout(checkAndShowModal, 3000);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 🔥 NUEVO: Guardar en window para que Home también lo use
      window.__pwaPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

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
    // 🔥 Verificar también window.__pwaPrompt por si Home lo actualizó
    const promptToUse = deferredPrompt || window.__pwaPrompt;
    
    if (promptToUse) {
      try {
        promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ App instalada desde modal');
          localStorage.setItem('pwa-installed', 'true');
          setDeferredPrompt(null);
          window.__pwaPrompt = null;
          handleClose();
        } else {
          console.log('⚠️ Usuario rechazó instalación desde modal');
          // 🔥 Si rechaza, mostrar instrucciones dentro del modal
          setShowInstructions(true);
        }
      } catch (err) {
        console.error('Error en instalación:', err);
        setShowInstructions(true);
      }
    } else {
      // No hay prompt nativo, mostrar instrucciones
      setShowInstructions(true);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setShowInstructions(false);
    // 🔥 CAMBIO: Guardar que lo cerró, pero permitir que vuelva a aparecer en otra sesión
    sessionStorage.setItem('pwa-modal-dismissed', 'true');
  };

  const handleLater = () => {
    setShowModal(false);
    setShowInstructions(false);
    // 🔥 "Más tarde" solo cierra el modal pero permite que vuelva a aparecer
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

        {!showInstructions ? (
          <div className="pwa-actions">
            <button className="btn-install" onClick={handleInstall}>
              <span className="material-icons">download</span>
              {(deferredPrompt || window.__pwaPrompt) && !isIOS ? 'Instalar ahora' : 'Ver cómo instalar'}
            </button>
            <button className="btn-later" onClick={handleLater}>
              Más tarde
            </button>
          </div>
        ) : (
          <>
            {isIOS ? (
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
              <div className="pwa-chrome-instructions">
                <p><strong>Para instalar manualmente:</strong></p>
                <ol>
                  <li>Abrí el menú de Chrome (⋮) arriba a la derecha</li>
                  <li>Tocá <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Confirmá tocando <strong>"Instalar"</strong></li>
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InstallPWAModal;