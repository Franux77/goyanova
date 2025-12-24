// src/components/categorias/CategoryList.jsx - CON EMPTY STATE
import React, { useState, useEffect, useMemo } from 'react';
import CategoryCard from '../home/CategoryCard';
import './CategoryList.css';
import { supabase } from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

const CategoryList = ({ type, onSelectCategory }) => {
  const navigate = useNavigate();
  const [categoriasDB, setCategoriasDB] = useState([]);
  const [serviciosDB, setServiciosDB] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  const placeholderTexts = [
    'Busca una categoría...',
    'Busca por nombres de servicios...',
    'Busca por nombres de productos...',
    'Explora opciones...',
    'Busca lo que necesitas...',
  ];

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const { data: categorias, error: errorCat } = await supabase
        .from('categorias')
        .select('id, nombre, icon')
        .eq('estado', 'activa')
        .eq('tipo', type)
        .order('nombre', { ascending: true });

      if (errorCat) {
        console.error('Error cargando categorías:', errorCat);
        setCategoriasDB([]);
        setServiciosDB([]);
        setLoading(false);
        return;
      }

      if (!categorias || categorias.length === 0) {
        setCategoriasDB([]);
        setServiciosDB([]);
        setLoading(false);
        return;
      }

      const categoriasIds = categorias.map(c => c.id);
      
      const { data: servicios, error: errorServ } = await supabase
        .from('servicios')
        .select('id, nombre, descripcion, categoria_id')
        .in('categoria_id', categoriasIds)
        .eq('estado', 'activo')
        .eq('oculto_por_reportes', false);

      if (errorServ) {
        console.error('Error cargando servicios:', errorServ);
      }

      const categoriasConServicios = new Set(
        servicios?.map(s => s.categoria_id) || []
      );

      const categoriasFiltradas = categorias
        .filter(cat => categoriasConServicios.has(cat.id))
        .map(cat => ({
          id: cat.id,
          title: cat.nombre,
          icon: cat.icon || 'category',
        }));
      
      setCategoriasDB(categoriasFiltradas);
      setServiciosDB(servicios || []);

    } catch (err) {
      console.error('Error inesperado:', err);
      setCategoriasDB([]);
      setServiciosDB([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const categoriasFiltradas = useMemo(() => {
    const busquedaLower = normalizeText(busqueda);
    
    if (!busquedaLower) return categoriasDB;
    
    const palabrasBusqueda = busquedaLower.split(' ').filter(w => w.length > 2);
    
    return categoriasDB.filter(cat => {
      const categoriaNombre = normalizeText(cat.title);
      
      if (categoriaNombre.includes(busquedaLower)) {
        return true;
      }
      
      const categoriaWords = categoriaNombre.split(' ');
      const coincideCategoria = palabrasBusqueda.some(searchWord =>
        categoriaWords.some(catWord => catWord.includes(searchWord))
      );
      
      if (coincideCategoria) {
        return true;
      }

      const serviciosDeCategoria = serviciosDB.filter(
        serv => serv.categoria_id === cat.id
      );

      const coincideServicio = serviciosDeCategoria.some(servicio => {
        const servicioNombre = normalizeText(servicio.nombre);
        const servicioDesc = normalizeText(servicio.descripcion || '');
        
        if (servicioNombre.includes(busquedaLower)) {
          return true;
        }
        
        if (servicioDesc.includes(busquedaLower)) {
          return true;
        }
        
        const servicioWords = servicioNombre.split(' ');
        return palabrasBusqueda.some(searchWord =>
          servicioWords.some(servWord => servWord.includes(searchWord))
        );
      });

      return coincideServicio;
    });
  }, [categoriasDB, serviciosDB, busqueda]);

  const categoriasConConteo = useMemo(() => {
    if (!busqueda.trim()) return categoriasFiltradas;

    const busquedaLower = normalizeText(busqueda);
    
    return categoriasFiltradas.map(cat => {
      const serviciosDeCategoria = serviciosDB.filter(
        serv => serv.categoria_id === cat.id
      );

      const serviciosCoincidentes = serviciosDeCategoria.filter(servicio => {
        const servicioNombre = normalizeText(servicio.nombre);
        const servicioDesc = normalizeText(servicio.descripcion || '');
        
        return servicioNombre.includes(busquedaLower) || 
               servicioDesc.includes(busquedaLower);
      });

      return {
        ...cat,
        serviciosCoincidentes: serviciosCoincidentes.length
      };
    });
  }, [categoriasFiltradas, serviciosDB, busqueda]);

  const hayResultados = categoriasFiltradas.length > 0;
  const mostrarSinResultados = busqueda.trim() !== '' && !hayResultados;
  const sinServiciosEnAbsoluto = !loading && categoriasDB.length === 0 && busqueda.trim() === '';

  const handleSelectCategory = (categoryTitle) => {
    const encodedTitle = encodeURIComponent(categoryTitle);
    
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

      {/* 🆕 EMPTY STATE - Sin servicios/productos */}
      {sinServiciosEnAbsoluto && (
        <div className="category-empty-state">
          <div className="category-empty-content">
            <span className="material-symbols-outlined category-empty-icon">
              {type === 'servicio' ? 'work_off' : 'inventory_2'}
            </span>
            <h3 className="category-empty-title">
              {type === 'servicio' 
                ? 'No hay servicios disponibles' 
                : 'No hay productos disponibles'}
            </h3>
            <p className="category-empty-description">
              {type === 'servicio'
                ? 'Aún no se han publicado servicios en la plataforma.'
                : 'Aún no se han publicado productos en la plataforma.'}
            </p>
            <button 
              className="category-empty-button"
              onClick={() => navigate('/publicar')}
            >
              <span className="material-symbols-outlined">add_circle</span>
              Publicar {type === 'servicio' ? 'Servicio' : 'Producto'}
            </button>
          </div>
        </div>
      )}

      {!loading && !sinServiciosEnAbsoluto && (
        <>
          {/* Buscador */}
          <div className="search-categoria-box">
            <svg className="search-categoria-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            
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

          {/* Mensaje de resultados encontrados */}
          {busqueda.trim() && hayResultados && (
            <div className="search-results-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>
                <strong>{categoriasFiltradas.length}</strong> {categoriasFiltradas.length === 1 ? 'categoría encontrada' : 'categorías encontradas'} con {type === 'servicio' ? 'servicios' : 'productos'} relacionados a "<strong>{busqueda}</strong>"
              </span>
            </div>
          )}

          {/* Sin resultados de búsqueda */}
          {mostrarSinResultados && (
            <div className="categoria-sin-resultados">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>No se encontraron categorías ni {type === 'servicio' ? 'servicios' : 'productos'}</span>
              <p className="categoria-sin-resultados-sugerencias">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}

          {/* Lista de categorías */}
          {hayResultados && (
            <div className="category-list">
              {(busqueda.trim() ? categoriasConConteo : categoriasFiltradas).map((cat) => (
                <div key={cat.id} className="category-card-wrapper">
                  <CategoryCard
                    title={cat.title}
                    icon={cat.icon}
                    onSelect={handleSelectCategory}
                  />
                  {busqueda.trim() && cat.serviciosCoincidentes > 0 && (
                    <div className="category-badge">
                      {cat.serviciosCoincidentes} {cat.serviciosCoincidentes === 1 ? type : `${type}s`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryList;