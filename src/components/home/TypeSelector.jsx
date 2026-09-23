import React from 'react';
import './TypeSelector.css';

const TypeSelector = ({ selectedType, onSelectType }) => {
  return (
    <div className="type-selector">
      <div className={`type-selector-pill ${selectedType === 'producto' ? 'pill-derecha' : ''}`} />
      <button
        className={selectedType === 'servicio' ? 'active' : ''}
        onClick={() => onSelectType('servicio')}
      >
        <span className="material-icons">construction</span>
        Oficios
      </button>
      <button
        className={selectedType === 'producto' ? 'active' : ''}
        onClick={() => onSelectType('producto')}
      >
        <span className="material-icons">storefront</span>
        Negocios
      </button>
    </div>
  );
};

export default TypeSelector;
