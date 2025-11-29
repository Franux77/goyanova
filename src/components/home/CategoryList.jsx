// src/components/categorias/CategoryList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import CategoryCard from '../home/CategoryCard';
import './CategoryList.css';
import { supabase } from '../../utils/supabaseClient';

const CategoryList = ({ type, onSelectCategory }) => {
  const [categoriasDB, setCategoriasDB] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  // Textos rotativos para el placeholder
  const placeholderTexts = [
    'Busca una categoría...',
    'Busca por nombres de servicios...',
    'Busca por nombres de productos...',
    'Explora opciones...',
    'Busca lo que necesitas...',
  ];

  useEffect(() => {
    fetchCategorias();
  }, [type]);

  const fetchCategorias = async () => {
    setLoading(true);
    
    try {
      // 1. Obtener todas las categorías activas del tipo solicitado
      const { data: categorias, error: errorCat } = await supabase
        .from('categorias')
        .select('id, nombre, icon')
        .eq('estado', 'activa')
        .eq('tipo', type)
        .order('nombre', { ascending: true });

      if (errorCat) {
        console.error('Error cargando categorías:', errorCat);
        setCategoriasDB([]);
        setLoading(false);
        return;
      }

      if (!categorias || categorias.length === 0) {
        setCategoriasDB([]);
        setLoading(false);
        return;
      }

      // 2. Obtener IDs de categorías que tienen al menos un servicio visible
      const categoriasIds = categorias.map(c => c.id);
      
      const { data: serviciosActivos, error: errorServ } = await supabase
        .from('servicios')
        .select('categoria_id')
        .in('categoria_id', categoriasIds)
        .eq('estado', 'activo')
        .eq('oculto_por_reportes', false);

      if (errorServ) {
        console.error('Error verificando servicios:', errorServ);
      }

      // 3. Crear Set de categorías con servicios visibles
      const categoriasConServicios = new Set(
        serviciosActivos?.map(s => s.categoria_id) || []
      );

      // 4. Filtrar solo categorías que tienen servicios visibles
      const categoriasFiltradas = categorias
        .filter(cat => categoriasConServicios.has(cat.id))
        .map(cat => ({
          id: cat.id,
          title: cat.nombre,
          icon: cat.icon || 'category',
        }));

      console.log(`Categorías con servicios visibles: ${categoriasFiltradas.length}/${categorias.length}`);
      setCategoriasDB(categoriasFiltradas);

    } catch (err) {
      console.error('Error inesperado:', err);
      setCategoriasDB([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para normalizar texto (quitar acentos, lowercase)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Búsqueda mejorada
  const categoriasFiltradas = useMemo(() => {
    const busquedaLower = normalizeText(busqueda);
    if (!busquedaLower) return categoriasDB;
    
    return categoriasDB.filter(cat => {
      const categoriaName = normalizeText(cat.title);
      
      // Búsqueda por coincidencia parcial
      if (categoriaName.includes(busquedaLower)) {
        return true;
      }

      // Búsqueda por palabras individuales
      const busquedaWords = busquedaLower.split(' ').filter(w => w.length > 2);
      const categoriaWords = categoriaName.split(' ');
      
      return busquedaWords.some(searchWord =>
        categoriaWords.some(catWord => catWord.includes(searchWord))
      );
    });
  }, [categoriasDB, busqueda]);

  const hayResultados = categoriasFiltradas.length > 0;
  const mostrarSinResultados = busqueda.trim() !== '' && !hayResultados;

  const handleSelectCategory = (categoryTitle) => {
    console.log('Categoría seleccionada:', categoryTitle);
    const encodedTitle = encodeURIComponent(categoryTitle);
    console.log('Categoría encodeada:', encodedTitle);
    
    if (typeof onSelectCategory === 'function') {
      onSelectCategory(encodedTitle);
    } else {
      console.error('onSelectCategory no es una función válida');
    }
  };

  return (
    <div className="category-buscador-wrapper">
      {loading && (
        <div className="category-loader-container">
          <div className="category-loader">
            <div className="category-loader-ring"></div>
            <div className="category-loader-ring"></div>
            <div className="category-loader-ring"></div>
            <div className="category-loader-pulse"></div>
          </div>
          <p className="category-loader-text">Cargando categorías...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Buscador con placeholder animado tipo Instagram */}
          <div className="search-categoria-box">
            <svg className="search-categoria-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            
            {/* Placeholder animado - FUERA del wrapper para que sea visible */}
            {busqueda === '' && (
              <div className="animated-placeholder">
                <div className="placeholder-text">
                  {placeholderTexts.map((text, index) => (
                    <span key={index}>
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="text"
              className="buscador-categorias-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {busqueda && (
              <button
                className="search-categoria-clear"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Sin resultados */}
          {mostrarSinResultados && (
            <div className="categoria-sin-resultados">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>No se encontraron categorías</span>
              <p className="categoria-sin-resultados-sugerencias">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}

          {/* Lista de categorías */}
          {hayResultados && (
            <div className="category-list">
              {categoriasFiltradas.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  title={cat.title}
                  icon={cat.icon}
                  onSelect={handleSelectCategory}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryList;