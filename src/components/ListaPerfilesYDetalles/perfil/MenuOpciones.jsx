import React, { useState, useRef, useEffect } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FiFlag, FiShare2 } from 'react-icons/fi';
import './MenuOpciones.css';

const MenuOpciones = ({ onReportar, onCompartir, tipo = 'servicio' }) => {
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAbierto(false);
      }
    };

    if (abierto) {
      document.addEventListener('mousedown', handleClickFuera);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
    };
  }, [abierto]);

  const handleReportar = () => {
    setAbierto(false);
    onReportar();
  };

  const handleCompartir = () => {
    setAbierto(false);
    onCompartir();
  };

  return (
    <div className="menu-opciones-container" ref={menuRef}>
      <button
        className="btn-menu-opciones"
        onClick={() => setAbierto(!abierto)}
        aria-label="Más opciones"
      >
        <BsThreeDotsVertical size={20} />
      </button>

      {abierto && (
        <div className="menu-opciones-dropdown">
          <button className="menu-opcion-item" onClick={handleReportar}>
            <FiFlag size={18} />
            <span>Reportar {tipo}</span>
          </button>
          <button className="menu-opcion-item" onClick={handleCompartir}>
            <FiShare2 size={18} />
            <span>Compartir</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuOpciones;