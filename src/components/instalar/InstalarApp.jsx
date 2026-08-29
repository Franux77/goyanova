import React, { useEffect, useState } from 'react';
import './InstalarApp.css';

const InstalarApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [puedeInstalar, setPuedeInstalar] = useState(false);
  const [yaInstalada, setYaInstalada] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [instalada, setInstalada] = useState(false);

  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const esAndroid = /Android/.test(navigator.userAgent);

  useEffect(() => {
    // ¿Ya está corriendo como app instalada?
    const corriendoStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setYaInstalada(corriendoStandalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPuedeInstalar(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const handlerInstalada = () => setInstalada(true);
    window.addEventListener('appinstalled', handlerInstalada);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handlerInstalada);
    };
  }, []);

  const instalarAhora = async () => {
    if (!deferredPrompt) return;
    setInstalando(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalando(false);
    setDeferredPrompt(null);
    setPuedeInstalar(false);
    if (outcome === 'accepted') setInstalada(true);
  };

  return (
    <div className="instalar-page">
      <div className="instalar-box">
        <div className="instalar-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        <h1>GoyaNova</h1>

        {(yaInstalada || instalada) ? (
          <>
            <div className="instalar-icono-check">
              <span className="material-icons">check_circle</span>
            </div>
            <p className="instalar-subtitulo">¡Ya tenés GoyaNova instalada!</p>
            <p className="instalar-texto">Buscá el ícono de GoyaNova en tu pantalla de inicio.</p>
          </>
        ) : (
          <>
            <p className="instalar-subtitulo">Instalá GoyaNova en tu celular o compu</p>
            <p className="instalar-texto">
              Sin ocupar espacio de descarga, gratis y con acceso directo como cualquier app.
            </p>

            {/* ANDROID / DESKTOP CHROME — botón directo */}
            {puedeInstalar && (
              <button
                className="instalar-boton"
                onClick={instalarAhora}
                disabled={instalando}
              >
                <span className="material-icons">download</span>
                {instalando ? 'Instalando...' : 'Instalar ahora'}
              </button>
            )}

            {/* iOS — paso a paso, Apple no permite botón directo */}
            {esIOS && (
              <div className="instalar-pasos">
                <p className="instalar-pasos-titulo">En iPhone / iPad, seguí estos pasos:</p>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">1</span>
                  <span>Tocá el botón <strong>Compartir</strong> <span className="material-icons">ios_share</span> abajo en Safari</span>
                </div>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">2</span>
                  <span>Elegí <strong>"Agregar a la pantalla de inicio"</strong></span>
                </div>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">3</span>
                  <span>Tocá <strong>"Agregar"</strong> arriba a la derecha</span>
                </div>
              </div>
            )}

                        {/* Android en navegador sin soporte nativo (ej. Firefox) */}
            {!puedeInstalar && esAndroid && (
              <div className="instalar-pasos">
                <p className="instalar-pasos-titulo">Instalá desde el menú de tu navegador:</p>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">1</span>
                  <span>Abrí el menú (⋮) de tu navegador</span>
                </div>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">2</span>
                  <span>Buscá <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong></span>
                </div>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">3</span>
                  <span>💡 Tip: en Chrome para Android este paso es automático (botón arriba)</span>
                </div>
              </div>
            )}

            {/* Desktop (no Android, no iOS) en navegador sin soporte nativo */}
            {!puedeInstalar && !esIOS && !esAndroid && (
              <div className="instalar-pasos">
                <p className="instalar-pasos-titulo">Instalá desde el menú de tu navegador:</p>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">1</span>
                  <span>Abrí el menú (⋮ o ...) de tu navegador</span>
                </div>
                <div className="instalar-paso">
                  <span className="instalar-paso-numero">2</span>
                  <span>Buscá <strong>"Instalar aplicación"</strong> o el ícono de instalación en la barra de direcciones</span>
                </div>
              </div>
            )}

            <a href="/" className="instalar-link-web">
              O seguí navegando desde el navegador →
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default InstalarApp;