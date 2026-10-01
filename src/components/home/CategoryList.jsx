// src/components/categorias/CategoryList.jsx - CON EMPTY STATE
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

  // ----- Paginación deslizable -----
  const calcularPorPagina = () => 12;
  const [porPagina, setPorPagina] = useState(calcularPorPagina);
  const [pagina, setPagina] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const carruselRef = useRef(null);
  const arrastre = useRef({ activo: false, inicioX: 0, inicioScroll: 0, dx: 0, movido: false });

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

  const listaMostrada = busqueda.trim() ? categoriasConConteo : categoriasFiltradas;

  const paginas = useMemo(() => {
    const grupos = [];
    for (let i = 0; i < listaMostrada.length; i += porPagina) {
      grupos.push(listaMostrada.slice(i, i + porPagina));
    }
    return grupos;
  }, [listaMostrada, porPagina]);
  const totalPaginas = paginas.length;

  useEffect(() => {
    const alCambiarTamano = () => setPorPagina(calcularPorPagina());
    window.addEventListener('resize', alCambiarTamano);
    return () => window.removeEventListener('resize', alCambiarTamano);
  }, []);

  // Al cambiar de búsqueda, tipo o tamaño de página, vuelve a la primera página
  useEffect(() => {
    setPagina(0);
    if (carruselRef.current) carruselRef.current.scrollTo({ left: 0 });
  }, [busqueda, type, porPagina]);

  const irAPagina = useCallback((indice) => {
    const el = carruselRef.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(indice, totalPaginas - 1));
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  }, [totalPaginas]);

  const alDeslizar = (e) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const indice = Math.round(el.scrollLeft / el.clientWidth);
    setPagina((actual) => (actual === indice ? actual : indice));
  };

  // Arrastre con mouse (en celular el deslizado es nativo)
  const alPresionar = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !carruselRef.current) return;
    arrastre.current = { activo: true, inicioX: e.clientX, inicioScroll: carruselRef.current.scrollLeft, dx: 0, movido: false };
  };
  const alMover = (e) => {
    const a = arrastre.current;
    if (!a.activo) return;
    a.dx = e.clientX - a.inicioX;
    if (!a.movido && Math.abs(a.dx) > 6) {
      a.movido = true;
      setArrastrando(true);
    }
    if (a.movido) carruselRef.current.scrollLeft = a.inicioScroll - a.dx;
  };
  const alSoltar = () => {
    const a = arrastre.current;
    if (!a.activo) return;
    a.activo = false;
    if (a.movido) {
      const el = carruselRef.current;
      let destino = Math.round(a.inicioScroll / el.clientWidth);
      if (a.dx < -60) destino += 1;
      else if (a.dx > 60) destino -= 1;
      setArrastrando(false);
      irAPagina(destino);
      setTimeout(() => { arrastre.current.movido = false; }, 0);
    }
  };
  // Si fue un arrastre, no se abre la categoría sobre la que se soltó
  const bloquearClickTrasArrastre = (e) => {
    if (arrastre.current.movido) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

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

          {/* Lista de categorías: páginas que se deslizan */}
          {hayResultados && (
            <div className="categorias-carrusel-wrap">
              <div
                ref={carruselRef}
                className={`categorias-carrusel ${arrastrando ? 'categorias-carrusel-arrastrando' : ''}`}
                onScroll={alDeslizar}
                onPointerDown={alPresionar}
                onPointerMove={alMover}
                onPointerUp={alSoltar}
                onPointerLeave={alSoltar}
                onPointerCancel={alSoltar}
                onClickCapture={bloquearClickTrasArrastre}
              >
                {paginas.map((grupo, i) => (
                  <div
                    key={i}
                    className="category-list categorias-pagina"
                    aria-hidden={i !== pagina}
                    role="group"
                    aria-label={`Página ${i + 1} de ${totalPaginas}`}
                  >
                    {grupo.map((cat) => (
                      <div key={cat.id} className="category-card-wrapper">
                        <CategoryCard
                          title={cat.title}
                          icon={cat.icon}
                          onSelect={handleSelectCategory}
                        />
                        {busqueda.trim() && cat.serviciosCoincidentes > 0 && (
                          <div className="category-badge">
                            {cat.serviciosCoincidentes} {type === 'servicio' ? 'oficio' : 'negocio'}
                            {cat.serviciosCoincidentes === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {totalPaginas > 1 && (
                <nav className="categorias-paginacion" aria-label="Páginas de categorías">
                  <button
                    type="button"
                    className="categorias-pag-flecha"
                    onClick={() => irAPagina(pagina - 1)}
                    disabled={pagina === 0}
                    aria-label="Página anterior"
                  >
                    <span className="material-icons">chevron_left</span>
                  </button>

                  <div className="categorias-pag-centro">
                    <span className="categorias-pag-contador" aria-live="polite">
                      <strong>{pagina + 1}</strong> / {totalPaginas}
                    </span>
                    {totalPaginas <= 8 ? (
                      <div className="categorias-pag-puntos">
                        {paginas.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`categorias-pag-punto ${i === pagina ? 'categorias-pag-punto-activo' : ''}`}
                            onClick={() => irAPagina(i)}
                            aria-label={`Ir a la página ${i + 1}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="categorias-pag-barra" aria-hidden="true">
                        <span style={{ width: `${((pagina + 1) / totalPaginas) * 100}%` }} />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="categorias-pag-flecha"
                    onClick={() => irAPagina(pagina + 1)}
                    disabled={pagina === totalPaginas - 1}
                    aria-label="Página siguiente"
                  >
                    <span className="material-icons">chevron_right</span>
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryList;