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
  cargando, // ✅ nueva prop
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
      {/* Overlay solo para cerrar tocando fuera del panel */}
      <div
        className={`lista-perfiles-overlay ${visible ? 'visible' : ''}`}
        onClick={onClose}
      ></div>

      {/* Panel principal */}
      <div
        className={`lista-perfiles-container ${visible ? 'visible' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="handle-bar"></div>
        <div className="lista-perfiles-scroll">
          <div className={`lista-perfiles-grid ${sinResultados ? 'no-resultados' : ''}`}>
            {/* ✅ Solo muestra el mensaje si NO está cargando */}
            {!cargando && sinResultados ? (
              <div className="sin-resultados-panel">No hay resultados</div>
            ) : (
              perfiles.map((perfil) => (
                <CardPerfilExplorar
                  key={perfil.id}
                  perfil={perfil}
                  categoriasMap={categoriasMap}
                  onLocalizar={onLocalizar}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Vista escritorio */}
      <div className="lista-perfiles-desktop">
        <div className="lista-perfiles-grid">
          {!cargando && sinResultados ? (
            <div className="sin-resultados-panel">No hay resultados</div>
          ) : (
            perfiles.map((perfil) => (
              <CardPerfilExplorar
                key={perfil.id}
                perfil={perfil}
                categoriasMap={categoriasMap}
                onLocalizar={onLocalizar}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ListaPerfilesExplorar;
