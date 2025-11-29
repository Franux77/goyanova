import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import PerfilCard from './PerfilCard';
import { supabase } from '../../utils/supabaseClient';
import './CategoryPage.css';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function calcularDistancia(lat2, lon2) {
  const lat1 = -29.1407;
  const lon1 = -59.2654;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CategoryPage = () => {
  const { tipo, categoria } = useParams();
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [orden, setOrden] = useState('default');
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // useLayoutEffect se ejecuta ANTES del render, garantizando scroll al inicio
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [tipo, categoria]);

  useEffect(() => {
    const fetchPerfiles = async () => {
      setLoading(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from('categorias')
          .select('id')
          .eq('nombre', categoria)
          .single();
        
        if (catError || !catData) {
          setPerfiles([]);
          return;
        }

        const { data: serviciosData, error: serviciosError } = await supabase
  .from('servicios')
  .select(`
    id,
    nombre,
    descripcion,
    foto_portada,
    contacto_whatsapp,
    latitud,
    longitud,
    es_premium,
    badge_texto,
    rating_promedio
  `)
  .eq('estado', 'activo')
  .eq('tipo', tipo)
  .eq('categoria_id', catData.id)
  .eq('oculto_por_reportes', false)
  .order('prioridad', { ascending: false })
  .order('rating_promedio', { ascending: false })
  .order('creado_en', { ascending: true });

        if (serviciosError || !serviciosData?.length) {
          setPerfiles([]);
          return;
        }

        const servicioIds = serviciosData.map((s) => s.id);

        const { data: opinionesData, error: opinionesError } = await supabase
          .from('opiniones')
          .select('servicio_id, puntuacion')
          .in('servicio_id', servicioIds);

        if (opinionesError) {
          setPerfiles([]);
          return;
        }

       const ratingMap = servicioIds.reduce((acc, id) => {
  const opinionesServicio = opinionesData?.filter((o) => o.servicio_id === id) || [];
  const totalOpiniones = opinionesServicio.length;
  acc[id] = { totalOpiniones };
  return acc;
}, {});

const mapped = serviciosData.map((s) => ({
  id: s.id,
  nombre: s.nombre,
  descripcionServicio: s.descripcion || '',
  fotoPerfil: s.foto_portada || null,
  rating: Number(s.rating_promedio) || 0,
  totalOpiniones: ratingMap[s.id]?.totalOpiniones || 0,
  contacto: { whatsapp: s.contacto_whatsapp || null },
  lat: s.latitud,
  lng: s.longitud,
  esPremium: s.es_premium || false,
  badgeTexto: s.badge_texto || ''
}));

        setPerfiles(mapped);
      } catch {
        setPerfiles([]);
      } finally {
        setLoading(false);
      }
    };

    if (tipo && categoria) fetchPerfiles();
  }, [tipo, categoria]);

  useEffect(() => setPagina(1), [debouncedBusqueda, orden]);

  const perfilesFiltrados = useMemo(() => {
    const busq = debouncedBusqueda.toLowerCase();
    return perfiles.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(busq) ||
        p.descripcionServicio?.toLowerCase().includes(busq)
    );
  }, [perfiles, debouncedBusqueda]);

  const perfilesOrdenados = useMemo(() => {
    const copia = [...perfilesFiltrados];
    if (orden === 'rating-desc') return copia.sort((a, b) => b.rating - a.rating);
    if (orden === 'rating-asc') return copia.sort((a, b) => a.rating - b.rating);

    return copia.sort((a, b) => {
      const distA = a.lat !== undefined && a.lng !== undefined ? calcularDistancia(a.lat, a.lng) : Infinity;
      const distB = b.lat !== undefined && b.lng !== undefined ? calcularDistancia(b.lat, b.lng) : Infinity;
      return distA - distB;
    });
  }, [perfilesFiltrados, orden]);

  const totalPaginas = Math.ceil(perfilesOrdenados.length / porPagina);
  const perfilesPagina = perfilesOrdenados.slice((pagina - 1) * porPagina, pagina * porPagina);

  return (
    <div className="category-container">
      <div className="category-header">
        <h1 className="category-title">Perfiles de {categoria}</h1>
        <p className="category-subtitle">Conectá con profesionales o emprendedores Goya.</p>

        <div className="category-filtros">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="search-input"
            />
            {busqueda && (
              <button
                className="search-clear"
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

          <div className="sort-box">
            <svg className="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10m-7 6h4"/>
            </svg>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="sort-select"
            >
              <option value="default">Ordenar por...</option>
              <option value="rating-desc">⭐ Mayor calificación</option>
              <option value="rating-asc">⭐ Menor calificación</option>
            </select>
          </div>
        </div>

        <div className="result-info">
          {loading ? (
            <span className="info-loading">Buscando perfiles...</span>
          ) : perfilesOrdenados.length ? (
            <span className="info-success">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Mostrando {perfilesPagina.length} de {perfilesOrdenados.length} perfil{perfilesOrdenados.length > 1 ? 'es' : ''}
            </span>
          ) : (
            <span className="info-empty">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              No se encontraron perfiles con esos criterios
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="modern-loader">
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <div className="loader-pulse"></div>
          </div>
          <p className="loader-text">Cargando perfiles increíbles...</p>
        </div>
      ) : (
        <>
          <div className="perfil-list">
            {perfilesPagina.map((perfil) => (
              <PerfilCard
                key={perfil.id}
                id={perfil.id}
                nombre={perfil.nombre}
                descripcionServicio={perfil.descripcionServicio}
                fotoPerfil={perfil.fotoPerfil}
                rating={perfil.rating}
                totalOpiniones={perfil.totalOpiniones}
                contacto={perfil.contacto}
                latitud={perfil.lat}
                longitud={perfil.lng}
                esPremium={perfil.esPremium}
                badgeTexto={perfil.badgeTexto}
              />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="paginacion">
              {Array.from({ length: totalPaginas }, (_, i) => (
                <button
                  key={i + 1}
                  className={`pagina-btn ${pagina === i + 1 ? 'activa' : ''}`}
                  onClick={() => setPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryPage;