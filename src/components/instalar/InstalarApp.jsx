import React, { useEffect, useState } from 'react';
import './InstalarApp.css';
import { useInstalarApp } from '../../utils/instalarApp';

// Tiempo que esperamos a que el navegador dispare 'beforeinstallprompt'
// antes de asumir que no lo va a hacer y mostrar el instructivo manual.
// El evento puede tardar un instante en llegar (SW registrándose, etc.),
// así que no lo damos por perdido apenas monta el componente.
const ESPERA_EVENTO_MS = 2500;

const InstalarApp = () => {
  // El aviso de Chrome se captura al abrir el sitio (utils/instalarApp), así que
  // sirve aunque la persona llegue acá desde otra página o desde el modal.
  const { puedeInstalar, yaInstalada, esIOS, instalar } = useInstalarApp();
  const [instalando, setInstalando] = useState(false);
  const [verificando, setVerificando] = useState(!puedeInstalar);

  const esAndroid = /Android/.test(navigator.userAgent);

  useEffect(() => {
    if (puedeInstalar) {
      setVerificando(false);
      return undefined;
    }
    // Si el navegador todavía no avisó, se espera un poco antes de mostrar los pasos
    const timeout = setTimeout(() => setVerificando(false), ESPERA_EVENTO_MS);
    return () => clearTimeout(timeout);
  }, [puedeInstalar]);

  const instalarAhora = async () => {
    setInstalando(true);
    await instalar();
    setInstalando(false);
  };

  return (
    <div className="instalar-page">
      <div className="instalar-box">
        <div className="instalar-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        <h1>GoyaNova</h1>

        {yaInstalada ? (
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