// src/components/mapa/ListaPerfilesExplorar.jsx
import React, { useRef } from 'react';
import './ListaPerfilesExplorar.css';
import CardPerfilExplorar from './CardPerfilExplorar';

// Si el dedo se mueve más que esto (en px) mientras está apoyado,
// lo consideramos scroll/arrastre y NO un toque quieto para cerrar.
const MOVIMIENTO_MAXIMO_PX = 10;
const TIEMPO_TOQUE_QUIETO_MS = 600;

const ListaPerfilesExplorar = ({
  perfiles,
  visible,
  onClose,
  categoriasMap,
  onLocalizar,
  cargando,
  mensajeVacio,
  // 👇 NUEVAS PROPS
  hayMasServicios,
  cargandoMas,
  onCargarMas,
  totalServicios,
  serviciosCargados
}) => {
  const timerRef = useRef(null);
  const inicioToqueRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    inicioToqueRef.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      onClose();
    }, TIEMPO_TOQUE_QUIETO_MS);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - inicioToqueRef.current.x);
    const dy = Math.abs(touch.clientY - inicioToqueRef.current.y);

    // Se movió lo suficiente como para ser scroll/arrastre: cancelamos
    // el cierre, sin importar cuánto dure el gesto.
    if (dx > MOVIMIENTO_MAXIMO_PX || dy > MOVIMIENTO_MAXIMO_PX) {
      clearTimeout(timerRef.current);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(timerRef.current);
  };

  const sinResultados = perfiles.length === 0;

  return (
    <>
      {/* Overlay */}
      <div
        className={`lista-perfiles-overlay ${visible ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Panel móvil */}
      <div
        className={`lista-perfiles-container ${visible ? 'visible' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="handle-bar" />
        
        {/* 👇 Header con contador */}
        <div className="lista-perfiles-header">
          <h3 className="lista-perfiles-titulo">
            Resultados 
            {!cargando && totalServicios > 0 && (
              <span className="lista-contador"> ({serviciosCargados}/{totalServicios})</span>
            )}
          </h3>
          <button className="lista-close-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="lista-perfiles-scroll">
          <div className={`lista-perfiles-grid ${sinResultados ? 'no-resultados' : ''}`}>
            {!cargando && sinResultados ? (
              <div className="sin-resultados-panel">
                <span className="material-icons">search_off</span>
                <p>{mensajeVacio || 'No hay resultados'}</p>
              </div>
            ) : (
              <>
                {perfiles.map((perfil) => (
                  <CardPerfilExplorar
                    key={perfil.id}
                    perfil={perfil}
                    categoriasMap={categoriasMap}
                    onLocalizar={onLocalizar}
                  />
                ))}

                {/* 👇 BOTÓN CARGAR MÁS DENTRO DEL PANEL */}
                {hayMasServicios && !cargando && (
                  <div className="cargar-mas-container">
                    <button
                      className="btn-cargar-mas-lista"
                      onClick={onCargarMas}
                      disabled={cargandoMas}
                    >
                      {cargandoMas ? (
                        <>
                          <span className="material-icons spinning">refresh</span>
                          Cargando...
                        </>
                      ) : (
                        <>
                          <span className="material-icons">expand_more</span>
                          Cargar más servicios
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Vista desktop */}
      <div className="lista-perfiles-desktop">
        <div className="lista-perfiles-grid">
          {!cargando && sinResultados ? (
            <div className="sin-resultados-panel">
              <span className="material-icons">search_off</span>
              <p>{mensajeVacio || 'No hay resultados'}</p>
            </div>
          ) : (
            <>
              {perfiles.map((perfil) => (
                <CardPerfilExplorar
                  key={perfil.id}
                  perfil={perfil}
                  categoriasMap={categoriasMap}
                  onLocalizar={onLocalizar}
                />
              ))}

              {/* 👇 BOTÓN CARGAR MÁS EN DESKTOP */}
              {hayMasServicios && !cargando && (
                <div className="cargar-mas-container desktop">
                  <button
                    className="btn-cargar-mas-lista"
                    onClick={onCargarMas}
                    disabled={cargandoMas}
                  >
                    {cargandoMas ? (
                      <>
                        <span className="material-icons spinning">refresh</span>
                        Cargando más...
                      </>
                    ) : (
                      <>
                        <span className="material-icons">expand_more</span>
                        Cargar más ({serviciosCargados}/{totalServicios})
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ListaPerfilesExplorar;