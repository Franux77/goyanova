// src/components/mapa/ExplorarMapa.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './ExplorarMapa.css';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import '../mapa/MarkerCluster.css';

import CardPerfilExplorar from './CardPerfilExplorar';
import BarraBusquedaExplorar from './BarraBusquedaExplorar';
import FiltrosExplorar from './FiltrosExplorar';
import ListaPerfilesExplorar from './ListaPerfilesExplorar';
import DetallesServicio from './DetallesServicio';
import ScrollControl from './ScrollControl';
import MapFlyTo from './MapFlyTo';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import UbicacionActual from './UbicacionActual';

const ADMIN_EMAIL = "12torresfranco@gmail.com";

const ExplorarMapa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rol, setRol] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mapRef = useRef();
  const [localizarPerfil, setLocalizarPerfil] = useState(null);
  const [markerDestacado, setMarkerDestacado] = useState(null);

  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [panelVisible, setPanelVisible] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(13);

  const [servicios, setServicios] = useState([]);
  const [categoriasMap, setCategoriasMap] = useState({});
  const [cargando, setCargando] = useState(true);
  
  const location = useLocation();

  useEffect(() => {
    if (user) {
      setRol(user.email === ADMIN_EMAIL ? "admin" : "prestador");
    } else {
      setRol(null);
    }
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const obtenerRutaPanel = () => {
    if (!rol) return '/';
    return rol === 'admin' ? '/panel/admin' : '/panel/dashboard';
  };

  useEffect(() => setPanelVisible(query.trim().length > 0), [query]);

  // Fetch optimizado - Solo categorías y servicios en paralelo
  useEffect(() => {
    const fetchData = async () => {
      setCargando(true);
      
      try {
        // Ejecutar ambas queries en paralelo
        const [categoriasRes, serviciosRes] = await Promise.all([
          supabase
            .from('categorias')
            .select('id, nombre, tipo, icon, color')
            .eq('estado', 'activa'),
         supabase
  .from('servicios')
  .select(`
    id, nombre, descripcion, tipo, categoria_id, latitud, longitud,
    direccion_escrita, referencia,
    foto_portada, 
    contacto_whatsapp, 
    contacto_email, 
    contacto_instagram, 
    contacto_facebook,
    es_premium, badge_texto,
    prioridad, rating_promedio, creado_en,
    opiniones(puntuacion)
  `)
  .eq('estado', 'activo')
  .eq('oculto_por_reportes', false)
  .order('prioridad', { ascending: false })
  .order('rating_promedio', { ascending: false })
  .order('creado_en', { ascending: true })
        ]);

        // Procesar categorías
        if (!categoriasRes.error && categoriasRes.data) {
          const catMap = {};
          categoriasRes.data.forEach(cat => (catMap[cat.id] = cat));
          setCategoriasMap(catMap);
        }

        // Procesar servicios con rating
if (!serviciosRes.error && serviciosRes.data) {
  const serviciosConRating = serviciosRes.data.map(serv => {
    const opiniones = serv.opiniones || [];
    const totalOpiniones = opiniones.length;
    return { 
      ...serv, 
      ratingPromedio: Number(serv.rating_promedio) || 0,
      totalOpiniones
    };
  });
  setServicios(serviciosConRating);
}
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchData();
  }, []);

  // Manejar navegación desde otros componentes
  useEffect(() => {
    if (location.state?.latitud && location.state?.longitud) {
      const { perfilId, latitud, longitud } = location.state;
      const lat = Number(latitud);
      const lng = Number(longitud);

      if (!isNaN(lat) && !isNaN(lng)) {
        setLocalizarPerfil({ latitud: lat, longitud: lng });
        setMarkerDestacado(perfilId);

        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom();
          if (currentZoom !== 16) {
            mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
          } else {
            mapRef.current.setView([lat, lng], 16);
          }
        }

        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.state, navigate, location.pathname]);

  // Búsqueda optimizada con useMemo
  const buscarEnPerfil = (perfil, query, categoriasMap) => {
    if (!query || query.trim() === '') return true;
    
    const queryLower = query.toLowerCase().trim();
    
    return (
      (perfil?.nombre || '').toLowerCase().includes(queryLower) ||
      (perfil?.descripcion || '').toLowerCase().includes(queryLower) ||
      (categoriasMap[perfil?.categoria_id]?.nombre || '').toLowerCase().includes(queryLower) ||
      (perfil?.direccion_escrita || '').toLowerCase().includes(queryLower) ||
      (perfil?.tipo || '').toLowerCase().includes(queryLower)
    );
  };

  // Filtrado y ordenamiento memoizado
  const perfilesFiltrados = useMemo(() => {
    if (!Object.keys(categoriasMap).length) return [];

    let filtrados = servicios.filter(perfil => {
      const catNombre = categoriasMap[perfil?.categoria_id]?.nombre || '';
      
      return (
        (!tipo || perfil?.tipo === tipo) &&
        (!categoria || catNombre === categoria) &&
        buscarEnPerfil(perfil, query, categoriasMap)
      );
    });

    // Ordenar
    if (calificacion === 'mayor') {
      filtrados.sort((a, b) => b.ratingPromedio - a.ratingPromedio);
    } else if (calificacion === 'menor') {
      filtrados.sort((a, b) => a.ratingPromedio - b.ratingPromedio);
    }

    return filtrados;
  }, [servicios, categoriasMap, tipo, categoria, query, calificacion]);

  const handleLocalizar = (perfil) => {
    const lat = Number(perfil.latitud);
    const lng = Number(perfil.longitud);

    if (!isNaN(lat) && !isNaN(lng)) {
      setLocalizarPerfil({ latitud: lat, longitud: lng });
      setMarkerDestacado(perfil.id);

      if (mapRef.current) {
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom !== 16) {
          mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
        } else {
          mapRef.current.setView([lat, lng], 16);
        }
      }

      setPanelVisible(false);
      setTimeout(() => setMarkerDestacado(null), 3000);
    }
  };

  // Iconos memoizados para mejor performance
  const getCategoriaIcono = useMemo(() => {
    return (categoriaId, zoom = 13) => {
      const categoria = categoriasMap[categoriaId];
      if (!categoria) return L.divIcon({});
      
      const icon = categoria.icon || 'location_on';
      const color = categoria.color || '#607d8b';
      const baseSize = Math.max(16, Math.min(zoom * 1.5, 28));
      
      return L.divIcon({
        className: 'custom-icon-pin',
        html: `
          <div class="pin" style="background:${color}; width:${baseSize}px; height:${baseSize}px;">
            <span class="material-icons icono-pin" style="font-size:${baseSize * 0.6}px;">${icon}</span>
            <div class="pin-point" style="
              border-top-color:${color};
              border-left-width:${baseSize * 0.17}px;
              border-right-width:${baseSize * 0.17}px;
              border-top-width:${baseSize * 0.3}px;
            "></div>
          </div>
        `,
        iconSize: [baseSize, baseSize + 12],
        iconAnchor: [baseSize / 2, baseSize + 12],
        popupAnchor: [0, -(baseSize + 10)],
      });
    };
  }, [categoriasMap]);

  const hayResultados = perfilesFiltrados.length > 0;
  const categoriasDisponibles = useMemo(() => 
    Object.values(categoriasMap).filter(cat => !tipo || cat.tipo === tipo),
    [categoriasMap, tipo]
  );

  const navLinks = [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/nosotros', label: 'Nosotros', icon: 'group' },
    { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
  ];

  const handleVolverClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="explorar-mapa-container">
      <div className="superior-fijo-explorar">
        <div className="header-explorar-actions">
          <button className="boton-volver-explorar" onClick={handleVolverClick}>
            <ArrowLeft size={20} /> Volver
          </button>

          <button 
            className="boton-menu-explorar"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="contenedor-busqueda-filtros">
          <BarraBusquedaExplorar query={query} setQuery={setQuery} />
          <FiltrosExplorar
            tipo={tipo}
            setTipo={setTipo}
            categoria={categoria}
            setCategoria={setCategoria}
            calificacion={calificacion}
            setCalificacion={setCalificacion}
            categoriasDisponibles={categoriasDisponibles}
          />
        </div>
      </div>

      <div className={`menu-lateral-explorar ${menuOpen ? 'menu-lateral-open' : ''}`}>
        <div className="menu-lateral-header">
          <h3>Navegación</h3>
          <button 
            className="menu-lateral-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>
        
        <ul className="menu-lateral-links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link 
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="menu-lateral-link"
              >
                <span className="material-icons">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
          
          {rol && (
            <li>
              <Link 
                to={obtenerRutaPanel()}
                onClick={() => setMenuOpen(false)}
                className="menu-lateral-link"
              >
                <span className="material-icons">dashboard</span>
                <span>Mi Panel</span>
              </Link>
            </li>
          )}
        </ul>
      </div>

      <div 
        className={`menu-overlay-explorar ${menuOpen ? 'menu-overlay-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      {cargando ? (
        <div className="explorar-loading-overlay">
          <div className="explorar-loader">
            <div className="explorar-loader-ring"></div>
            <div className="explorar-loader-ring"></div>
            <div className="explorar-loader-ring"></div>
            <div className="explorar-loader-pulse"></div>
          </div>
          <p className="explorar-loader-text">Cargando el mapa...</p>
        </div>
      ) : (
        <MapContainer
          center={[-29.1425, -59.2625]}
          zoom={13}
          scrollWheelZoom
          className="mapa-leaflet"
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          onzoomend={(e) => setZoomLevel(e.target.getZoom())}
          preferCanvas={true}
        >
          <ScrollControl />
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenIdle={true}
            keepBuffer={2}
          />
          <UbicacionActual />

          {localizarPerfil && (
            <MapFlyTo
              target={localizarPerfil}
              onComplete={() => setLocalizarPerfil(null)}
            />
          )}

          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            zoomToBoundsOnClick
            maxClusterRadius={zoomLevel < 13 ? 5 : zoomLevel < 15 ? 5 : 0}
            iconCreateFunction={cluster => {
              const count = cluster.getChildCount();
              const baseSize = 36;
              return L.divIcon({
                html: `
                  <div class="pin cluster-pin" style="width:${baseSize}px; height:${baseSize}px;">
                    <span class="cluster-count">${count}</span>
                    <div class="pin-point"></div>
                  </div>
                `,
                className: 'custom-cluster',
                iconSize: L.point(baseSize, baseSize + 12, true),
                iconAnchor: [baseSize / 2, baseSize + 12],
                popupAnchor: [0, -(baseSize + 10)],
              });
            }}
          >
            {perfilesFiltrados.map(perfil => {
              if (typeof perfil?.latitud !== 'number' || typeof perfil?.longitud !== 'number') return null;
              return (
                <Marker
                  key={perfil.id}
                  position={[perfil.latitud, perfil.longitud]}
                  icon={getCategoriaIcono(perfil.categoria_id, zoomLevel)}
                  eventHandlers={{
                    click: () => {
                      setPerfilSeleccionado(perfil);
                      setMarkerDestacado(perfil.id);

                      if (mapRef.current) {
                        const currentZoom = mapRef.current.getZoom();
                        mapRef.current.setView([perfil.latitud, perfil.longitud], Math.max(currentZoom, 15));
                      }
                      setPanelVisible(false);
                    },
                  }}
                  className={markerDestacado === perfil.id ? 'marker-destacado' : ''}
                >
                  <Popup>{perfil.nombre}</Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      )}
      
      <ListaPerfilesExplorar
        perfiles={perfilesFiltrados}
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        categoriasMap={categoriasMap}
        onLocalizar={handleLocalizar}
        cargando={cargando}
        mensajeVacio={!perfilesFiltrados.length ? 'No hay resultados' : ''}
      />

      {hayResultados && (
        <div className="lista-perfiles-container lista-perfiles-desktop">
          <div className="lista-perfiles-scroll">
            {perfilesFiltrados.map(perfil => {
              const catNombre = categoriasMap[perfil.categoria_id]?.nombre;
              if (!catNombre) return null;
              return (
                <CardPerfilExplorar
                  key={perfil.id}
                  perfil={perfil}
                  categoriasMap={categoriasMap}
                  onLocalizar={handleLocalizar}
                />
              );
            })}
          </div>
        </div>
      )}

      {!panelVisible && (
        <button
          className={`boton-abrir-lista ${!hayResultados ? 'sin-resultados' : ''}`}
          onClick={() => hayResultados && setPanelVisible(true)}
          disabled={!hayResultados}
        >
          {hayResultados ? 'Explorar Resultados' : 'No hay resultados'}
        </button>
      )}

      <DetallesServicio
        perfil={perfilSeleccionado}
        visible={!!perfilSeleccionado}
        onClose={() => setPerfilSeleccionado(null)}
        categoriasMap={categoriasMap}
      />
    </div>
  );
};

export default ExplorarMapa;