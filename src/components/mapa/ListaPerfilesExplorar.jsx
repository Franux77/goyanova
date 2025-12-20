// src/components/mapa/ListaPerfilesExplorar.jsx
import React, { useRef } from 'react';
import './ListaPerfilesExplorar.css';
import CardPerfilExplorar from './CardPerfilExplorar';

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

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onClose();
    }, 600);
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
        onTouchEnd={handleTouchEnd}
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