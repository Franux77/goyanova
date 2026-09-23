// src/components/categorias/BuscadorCategorias.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './BuscadorCategorias.css';
import { supabase } from '../../utils/supabaseClient';

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const BuscadorCategorias = ({ type, onSelectCategory }) => {
  const [busqueda, setBusqueda] = useState('');
  const [categoriasDB, setCategoriasDB] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const wrapperRef = useRef(null);

  // Traer categorías de la DB — se vuelve a pedir cada vez que cambia "type"
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('estado', 'activa')
        .eq('tipo', type)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando categorías:', error);
        setCategoriasDB([]);
      } else {
        setCategoriasDB(data || []);
      }
    };

    fetchCategorias();
  }, [type]);

  // Búsqueda recalculada siempre a partir del estado actual (arregla el bug
  // de resultados "viejos" al cambiar de tipo con texto ya escrito), ignora
  // acentos y matchea por palabra parcial (igual criterio que CategoryList.jsx)
  const resultados = useMemo(() => {
    const busquedaLower = normalizeText(busqueda);
    if (!busquedaLower) return [];

    const palabras = busquedaLower.split(' ').filter((w) => w.length > 1);

    return categoriasDB.filter((cat) => {
      const nombre = normalizeText(cat.nombre);
      if (nombre.includes(busquedaLower)) return true;

      const nombreWords = nombre.split(' ');
      return palabras.some((palabra) =>
        nombreWords.some((word) => word.includes(palabra))
      );
    });
  }, [busqueda, categoriasDB]);

  // Cerrar el dropdown al tocar afuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const handleChange = (e) => {
    setBusqueda(e.target.value);
    setAbierto(true);
    setIndiceActivo(-1);
  };

  const handleSeleccionar = (cat) => {
    setBusqueda('');
    setAbierto(false);
    setIndiceActivo(-1);
    onSelectCategory && onSelectCategory(cat);
  };

  const handleKeyDown = (e) => {
    if (!abierto || resultados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((prev) => (prev + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((prev) => (prev <= 0 ? resultados.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      handleSeleccionar(resultados[indiceActivo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  const mostrarDropdown = abierto && busqueda.trim() !== '';

  return (
    <div className="buscador-categorias-wrapper" ref={wrapperRef}>
      <div className="search-categoria-box">
        <svg className="search-categoria-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="text"
          placeholder="Buscar categoría..."
          value={busqueda}
          onChange={handleChange}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
          className="buscador-categorias-input"
        />

        {busqueda && (
          <button
            type="button"
            className="search-categoria-clear"
            onClick={() => {
              setBusqueda('');
              setAbierto(false);
            }}
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {mostrarDropdown && (
        <div className="buscador-categorias-resultados">
          {resultados.length > 0 ? (
            resultados.map((cat, i) => (
              <div
                key={cat.id}
                className={`categoria-item ${i === indiceActivo ? 'categoria-item-activo' : ''}`}
                onClick={() => handleSeleccionar(cat)}
                onMouseEnter={() => setIndiceActivo(i)}
              >
                <span className="material-icons">{cat.icon || 'category'}</span>
                {cat.nombre}
              </div>
            ))
          ) : (
            <div className="categoria-sin-resultados-mini">
              <span className="material-icons">search_off</span>
              No hay resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorCategorias;