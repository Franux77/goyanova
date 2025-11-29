import React from 'react';
import './TypeSelector.css';

const TypeSelector = ({ selectedType, onSelectType }) => {
  return (
    <div className="type-selector">
      <button
        className={selectedType === 'servicio' ? 'active' : ''}
        onClick={() => onSelectType('servicio')}
      >
        Servicios
      </button>
      <button
        className={selectedType === 'producto' ? 'active' : ''}
        onClick={() => onSelectType('producto')}
      >
        Productos
      </button>
    </div>
  );
};

export default TypeSelector;
