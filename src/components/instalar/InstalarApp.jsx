import React, { useEffect, useState } from 'react';
import './InstalarApp.css';

// Tiempo que esperamos a que el navegador dispare 'beforeinstallprompt'
// antes de asumir que no lo va a hacer y mostrar el instructivo manual.
// El evento puede tardar un instante en llegar (SW registrándose, etc.),
// así que no lo damos por perdido apenas monta el componente.
const ESPERA_EVENTO_MS = 2500;

const InstalarApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [puedeInstalar, setPuedeInstalar] = useState(false);
  const [yaInstalada, setYaInstalada] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [verificando, setVerificando] = useState(true);

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
      console.log('[GoyaNova] beforeinstallprompt SÍ se disparó ✅');
      setDeferredPrompt(e);
      setPuedeInstalar(true);
      setVerificando(false);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const handlerInstalada = () => setInstalada(true);
    window.addEventListener('appinstalled', handlerInstalada);

    // Si pasado ESPERA_EVENTO_MS el navegador nunca ofreció el evento,
    // dejamos de "verificar" y recién ahí mostramos el instructivo manual.
    // Esto evita que el tutorial tape al botón apenas carga la página.
    const timeout = setTimeout(() => {
      setVerificando((seguiaEsperando) => {
        if (seguiaEsperando) {
          console.warn(
            '[GoyaNova] beforeinstallprompt NO se disparó en',
            ESPERA_EVENTO_MS + 'ms.',
            'Revisá: manifest.json (ojo con "prefer_related_applications": true),',
            'ícono 192x192 y 512x512 presentes, "display": "standalone",',
            'y que el service worker esté registrado y activo.'
          );
        }
        return false;
      });
    }, ESPERA_EVENTO_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handlerInstalada);
      clearTimeout(timeout);
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

            {/* Mientras esperamos el evento nativo no mostramos nada más
                (salvo en iOS, que nunca lo dispara y va directo al instructivo) */}
            {verificando && !esIOS && (
              <p className="instalar-texto">Preparando instalación…</p>
            )}

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

            {/* iOS — paso a paso, Apple nunca dispara el evento nativo */}
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

            {/* Android sin el evento — recién se muestra si ya esperamos
                y el navegador nunca lo ofreció */}
            {!verificando && !puedeInstalar && esAndroid && (
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
              </div>
            )}

            {/* Desktop (no Android, no iOS) sin el evento */}
            {!verificando && !puedeInstalar && !esIOS && !esAndroid && (
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