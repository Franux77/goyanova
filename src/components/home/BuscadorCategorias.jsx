// src/components/categorias/BuscadorCategorias.jsx
import React, { useState, useEffect } from 'react';
// import './BuscadorCategorias.css';
import { supabase } from '../../utils/supabaseClient';

const BuscadorCategorias = ({ type, onSelectCategory }) => {
  const [busqueda, setBusqueda] = useState('');
  const [categoriasDB, setCategoriasDB] = useState([]);
  const [resultados, setResultados] = useState([]);

  // Traer categorías de la DB
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('estado', 'activa')
        .eq('tipo', type) // si pasás "servicio" o "producto"
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando categorías:', error);
      } else {
        setCategoriasDB(data);
      }
    };

    fetchCategorias();
  }, [type]);

  const handleChange = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    if (valor.trim() === '') {
      setResultados([]);
      return;
    }

    const coincidencias = categoriasDB.filter((cat) =>
      cat.nombre.toLowerCase().includes(valor.toLowerCase())
    );

    setResultados(coincidencias);
  };

  return (
    <div className="buscador-categorias-wrapper">
      <div className="buscador-categorias-contenedor">
        <input
          type="text"
          placeholder="Buscar categoría..."
          value={busqueda}
          onChange={handleChange}
          className="buscador-categorias-input"
        />
      </div>

      {busqueda.trim() !== '' && (
        <div className="buscador-categorias-resultados">
          {resultados.length > 0 ? (
            resultados.map((cat) => (
              <div
                key={cat.id}
                className="categoria-item"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
              >
                <span className="material-icons">{cat.icon || 'category'}</span>
                {cat.nombre}
              </div>
            ))
          ) : (
            <div className="categoria-sin-resultados">No hay resultados</div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorCategorias;
