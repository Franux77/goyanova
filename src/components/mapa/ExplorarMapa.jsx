// src/components/mapa/ExplorarMapa.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './ExplorarMapa.css';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const ADMIN_EMAILS = [
  '12torresfranco@gmail.com',
  'claudiaoviedo509@gmail.com',
  'maximocenturion.07@gmail.com'
];

// Los servicios se traen de a lotes: el primero abre el mapa rápido y el resto
// se carga en segundo plano, así en el mapa aparecen TODOS (no solo los primeros).
const LOTE_SERVICIOS = 200;
const POR_PAGINA_LISTA = 50; // paginación propia de "Explorar resultados" (el mapa muestra todos)
const SELECT_SERVICIOS = `
  id, nombre, descripcion, tipo, categoria_id, latitud, longitud,
  direccion_escrita, referencia, foto_portada,
  contacto_whatsapp, contacto_email, contacto_instagram, contacto_facebook,
  es_premium, badge_texto, pin_color,
  prioridad, rating_promedio, creado_en
`;

const traerLoteServicios = (desde) =>
  supabase
    .from('servicios')
    .select(SELECT_SERVICIOS)
    .eq('estado', 'activo')
    .eq('oculto_por_reportes', false)
    .order('prioridad', { ascending: false })
    .order('rating_promedio', { ascending: false })
    .order('creado_en', { ascending: true })
    .order('id', { ascending: true })
    .range(desde, desde + LOTE_SERVICIOS - 1);

const mapearServicio = (serv) => ({
  ...serv,
  ratingPromedio: Number(serv.rating_promedio) || 0
});

/* ============================================================
   MARCADORES SEGÚN EL ZOOM (comportamiento tipo Google Maps)
   - Zoom lejano: puntitos chicos, separados entre sí.
   - Al acercar: aparecen más, y se agrandan hasta mostrar el pin con su ícono.
   - Zoom máximo (>= ZOOM_TODOS): se ven todos, pin completo.
   `espacio` = distancia mínima en píxeles entre dos marcadores visibles.
   Cuando dos se pisan, queda el de mayor prioridad (plan > calificación).
   ============================================================ */
const ZOOM_TODOS = 20;

const NIVELES = [
  { zoomMin: 0,          tam: 20, icono: true, espacio: 25 }, // zoom estándar (13 y menos)
  { zoomMin: 14,         tam: 22, icono: true, espacio: 28 },
  { zoomMin: 15,         tam: 26, icono: true, espacio: 32 },
  { zoomMin: 16,         tam: 30, icono: true, espacio: 36 },
  { zoomMin: 17,         tam: 34, icono: true, espacio: 38 },
  { zoomMin: 18,         tam: 38, icono: true, espacio: 40 },
  { zoomMin: ZOOM_TODOS, tam: 38, icono: true, espacio: 0 },  // 0 = se muestran todos
];

const nivelDeZoom = (zoom) => {
  let nivel = NIVELES[0];
  NIVELES.forEach((n) => {
    if (zoom >= n.zoomMin) nivel = n;
  });
  return nivel;
};

// Elige qué marcadores mostrar para que no se encimen. `proyectar` devuelve {x, y} en píxeles.
// Los "forzados" (el seleccionado / el que se está localizando) siempre se muestran.
const seleccionarSinEncimar = (marcadores, proyectar, espacio, forzados) => {
  if (!espacio) return marcadores;

  const grilla = new Map();
  const visibles = [];

  const hayCerca = (p) => {
    const cx = Math.floor(p.x / espacio);
    const cy = Math.floor(p.y / espacio);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const lista = grilla.get(`${cx + dx}_${cy + dy}`);
        if (lista && lista.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < espacio)) return true;
      }
    }
    return false;
  };

  const registrar = (p) => {
    const clave = `${Math.floor(p.x / espacio)}_${Math.floor(p.y / espacio)}`;
    if (!grilla.has(clave)) grilla.set(clave, []);
    grilla.get(clave).push(p);
  };

  marcadores.forEach((m) => {
    if (!forzados.has(m.id)) return;
    registrar(proyectar(m));
    visibles.push(m);
  });

  marcadores.forEach((m) => {
    if (forzados.has(m.id)) return;
    const p = proyectar(m);
    if (hayCerca(p)) return;
    registrar(p);
    visibles.push(m);
  });

  return visibles;
};

// Ícono según categoría, nivel de zoom, color de plan (anillo) y si está destacado.
const construirIcono = (categoria, nivel, pinColor, destacado, cantidad = 1, rama = null) => {
  const color = categoria?.color || '#607d8b';
  const icon = categoria?.icon || 'location_on';
  const tam = destacado ? Math.max(nivel.tam, 34) : nivel.tam;
  const conIcono = destacado ? true : nivel.icono;
  const grosorAnillo = tam >= 30 ? 3 : 2;

  const anillo = pinColor
    ? `box-shadow: 0 0 0 ${grosorAnillo}px ${pinColor}, 0 0 8px 2px ${pinColor}88;`
    : '';
  const insignia = cantidad > 1
    ? `<span style="position:absolute; top:-7px; right:-9px; min-width:16px; height:16px; padding:0 4px; box-sizing:border-box; border-radius:8px; background:#ef4444; color:#fff; border:2px solid #fff; font:700 10px/12px sans-serif; text-align:center; z-index:2;">${cantidad}</span>`
    : '';
  // Rama punteada desde la punta del pin hasta el punto real (dentro del mismo ícono: no se desfasa)
  const ramaSvg = rama
    ? `<svg style="position:absolute; left:0; top:0; width:1px; height:1px; overflow:visible; pointer-events:none; z-index:-1;"><line x1="${tam / 2}" y1="${tam + Math.round(tam * 0.3)}" x2="${tam / 2 + rama.dx}" y2="${tam + Math.round(tam * 0.3) + rama.dy}" stroke="#334155" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/></svg>`
    : '';
  const brillo = destacado ? 'filter: drop-shadow(0 0 6px rgba(0,119,255,0.9));' : '';

  // Puntito chico (zoom lejano)
  if (!conIcono) {
    return L.divIcon({
      className: 'custom-icon-pin',
      html: `<div class="pin" style="background:${color}; width:${tam}px; height:${tam}px; border:2px solid #fff; box-sizing:border-box; ${anillo}"></div>`,
      iconSize: [tam, tam],
      iconAnchor: [tam / 2, tam / 2],
      popupAnchor: [0, -tam / 2],
    });
  }

  // Pin con ícono y punta
  const cola = Math.round(tam * 0.3);
  const ladoCola = Math.round(tam * 0.17);
  return L.divIcon({
    className: 'custom-icon-pin',
    html: `
      <div class="pin" style="background:${color}; width:${tam}px; height:${tam}px; align-self:flex-start; ${anillo} ${brillo}">
        <span class="material-icons icono-pin" style="font-size:${Math.round(tam * 0.6)}px;">${icon}</span>
        ${insignia}
        ${ramaSvg}
        <div class="pin-point" style="
          border-top-color:${color};
          border-left-width:${ladoCola}px;
          border-right-width:${ladoCola}px;
          border-top-width:${cola}px;
          bottom:-${cola - 1}px;
        "></div>
      </div>
    `,
    iconSize: [tam, tam + cola],
    iconAnchor: [tam / 2, tam + cola],
    popupAnchor: [0, -(tam + cola)],
  });
};

// Punto oscuro en la ubicación real, de donde salen las ramas
const ICONO_CENTRO = L.divIcon({
  className: 'custom-icon-pin',
  html: '<div style="width:14px; height:14px; border-radius:50%; background:#1e293b; border:2px solid #fff; box-sizing:border-box; box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Capa de marcadores: vive dentro del mapa para poder leer el zoom real.
const CapaMarcadores = ({
  marcadores,
  categoriasMap,
  markerDestacado,
  perfilSeleccionadoId,
  onClickMarcador,
}) => {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const cacheIconos = useRef(new Map());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const nivel = nivelDeZoom(zoom);

  const forzados = useMemo(() => {
    const ids = new Set();
    if (markerDestacado != null) ids.add(markerDestacado);
    if (perfilSeleccionadoId != null) ids.add(perfilSeleccionadoId);
    return ids;
  }, [markerDestacado, perfilSeleccionadoId]);

  const obtenerIcono = (categoria, pinColor, destacado, cantidad, rama) => {
    const clave = [
      categoria?.color, categoria?.icon, nivel.tam, nivel.icono, pinColor, destacado ? 1 : 0, cantidad,
      rama ? `${Math.round(rama.dx)}_${Math.round(rama.dy)}` : '',
    ].join('|');
    let icono = cacheIconos.current.get(clave);
    if (!icono) {
      icono = construirIcono(categoria, nivel, pinColor, destacado, cantidad, rama);
      cacheIconos.current.set(clave, icono);
    }
    return icono;
  };

  // Qué marcadores se ven y dónde (solo depende del zoom, no del desplazamiento del mapa)
  const posiciones = useMemo(() => {
    const visibles = seleccionarSinEncimar(
      marcadores,
      (m) => map.project([m.latitud, m.longitud], zoom),
      nivel.espacio,
      forzados
    );

    return visibles.map((m) => {
      // Varios negocios en el mismo punto: recién al zoom máximo se abren en ronda
      if (zoom < ZOOM_TODOS || m.grupoTam < 2) {
        return { m, pos: [m.latitud, m.longitud], aproximado: false, rama: null };
      }
      const centro = map.project([m.latitud, m.longitud], zoom);
      const n = m.grupoTam;
      const radio = Math.max(nivel.tam * 1.1, (nivel.tam * 0.95) / Math.sin(Math.PI / n));
      const angulo = -Math.PI / 2 + (2 * Math.PI * m.grupoIdx) / n;
      const punto = L.point(centro.x + radio * Math.cos(angulo), centro.y + radio * Math.sin(angulo));
      const ll = map.unproject(punto, zoom);
      return { m, pos: [ll.lat, ll.lng], aproximado: true, rama: { dx: centro.x - punto.x, dy: centro.y - punto.y } };
    });
  }, [marcadores, zoom, nivel, forzados, map]);

  return (
    <>
      {/* Punto central de cada grupo abierto en ramas */}
      {posiciones.filter(p => p.aproximado && p.m.grupoIdx === 0).map(({ m }) => (
        <Marker
          key={`centro-${m.id}`}
          position={[m.latitud, m.longitud]}
          icon={ICONO_CENTRO}
          interactive={false}
          zIndexOffset={-500}
        />
      ))}
      {posiciones.map(({ m, pos, aproximado, rama }) => {
        const categoria = categoriasMap[m.categoria_id];
        if (!categoria) return null;
        const destacado = m.id === markerDestacado;
        const apilado = m.grupoTam > 1 && zoom < ZOOM_TODOS;
        return (
          <Marker
            key={m.id}
            position={pos}
            icon={obtenerIcono(categoria, m.pin_color, destacado, apilado ? m.grupoTam : 1, rama)}
            zIndexOffset={destacado ? 1000 : (m.pin_color ? 500 : 0)}
            eventHandlers={{
              click: () => {
                // Varios en el mismo punto: se acerca hasta abrirlos en ronda
                if (apilado) map.flyTo([m.latitud, m.longitud], ZOOM_TODOS, { duration: 0.6 });
                else onClickMarcador(m);
              },
            }}
          >
            <Popup>
              {m.nombre}
              {aproximado && (
                <><br /><small>📍 Ubicación aproximada (muy cerca de otro negocio)</small></>
              )}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const ExplorarMapa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rol, setRol] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localizarPerfil, setLocalizarPerfil] = useState(null);
  const [markerDestacado, setMarkerDestacado] = useState(null);
  const timerDestacado = useRef(null);

  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [panelVisible, setPanelVisible] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  const [servicios, setServicios] = useState([]);
  const [categoriasMap, setCategoriasMap] = useState({});
  const [cargando, setCargando] = useState(true);
  const [totalServicios, setTotalServicios] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [limiteLista, setLimiteLista] = useState(POR_PAGINA_LISTA);

  const location = useLocation();

  useEffect(() => {
    if (user) {
      const esAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      setRol(esAdmin ? 'admin' : 'prestador');
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

  useEffect(() => () => clearTimeout(timerDestacado.current), []);

  const obtenerRutaPanel = () => {
    if (!rol) return '/';
    return rol === 'admin' ? '/panel/admin' : '/panel/dashboard';
  };

  useEffect(() => setPanelVisible(query.trim().length > 0), [query]);

  // ✅ FETCH INICIAL: categorías + primer lote de servicios; el resto sigue en segundo plano
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);

      try {
        const [categoriasRes, serviciosRes, countRes] = await Promise.all([
          supabase
            .from('categorias')
            .select('id, nombre, tipo, icon, color')
            .eq('estado', 'activa'),
          traerLoteServicios(0),
          supabase
            .from('servicios')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'activo')
            .eq('oculto_por_reportes', false)
        ]);

        if (cancelado) return;

        if (!categoriasRes.error && categoriasRes.data) {
          const catMap = {};
          categoriasRes.data.forEach(cat => (catMap[cat.id] = cat));
          setCategoriasMap(catMap);
        }

        let primerLote = [];
        if (!serviciosRes.error && serviciosRes.data) {
          primerLote = serviciosRes.data.map(mapearServicio);
          setServicios(primerLote);
        }

        if (countRes.count !== null) {
          setTotalServicios(countRes.count);
        }

        setCargando(false);

        // Resto de los servicios, de a lotes, sin frenar el mapa
        let hayMas = primerLote.length === LOTE_SERVICIOS;
        let inicio = LOTE_SERVICIOS;
        if (hayMas) setCargandoMas(true);

        while (hayMas && !cancelado) {
          const { data, error } = await traerLoteServicios(inicio);
          if (cancelado) return;
          if (error || !data) break;
          setServicios(prev => [...prev, ...data.map(mapearServicio)]);
          hayMas = data.length === LOTE_SERVICIOS;
          inicio += LOTE_SERVICIOS;
        }

        if (!cancelado) setCargandoMas(false);
      } catch (error) {
        console.error('Error cargando datos:', error);
        if (!cancelado) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const destacarMarcador = (id) => {
    setMarkerDestacado(id);
    clearTimeout(timerDestacado.current);
    timerDestacado.current = setTimeout(() => setMarkerDestacado(null), 3000);
  };

  // Manejar navegación desde otros componentes (el vuelo lo hace MapFlyTo)
  useEffect(() => {
    if (location.state?.latitud && location.state?.longitud) {
      const { perfilId, latitud, longitud } = location.state;
      const lat = Number(latitud);
      const lng = Number(longitud);

      if (!isNaN(lat) && !isNaN(lng)) {
        setLocalizarPerfil({ latitud: lat, longitud: lng });
        destacarMarcador(perfilId);
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.state, navigate, location.pathname]);

  // Búsqueda optimizada
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

  // Filtrado (respeta el orden de prioridad del plan: sirve para decidir cuál marcador gana si se pisan)
  const filtradosBase = useMemo(() => {
    if (!Object.keys(categoriasMap).length) return [];

    return servicios.filter(perfil => {
      const catNombre = categoriasMap[perfil?.categoria_id]?.nombre || '';

      return (
        (!tipo || perfil?.tipo === tipo) &&
        (!categoria || catNombre === categoria) &&
        buscarEnPerfil(perfil, query, categoriasMap)
      );
    });
  }, [servicios, categoriasMap, tipo, categoria, query]);

  // Para las listas: se ordena por calificación si el filtro lo pide
  const perfilesFiltrados = useMemo(() => {
    if (calificacion === 'mayor') {
      return [...filtradosBase].sort((a, b) => b.ratingPromedio - a.ratingPromedio);
    }
    if (calificacion === 'menor') {
      return [...filtradosBase].sort((a, b) => a.ratingPromedio - b.ratingPromedio);
    }
    return filtradosBase;
  }, [filtradosBase, calificacion]);

  // Lista de resultados: paginación independiente del mapa
  useEffect(() => setLimiteLista(POR_PAGINA_LISTA), [tipo, categoria, query, calificacion]);
  const perfilesLista = useMemo(
    () => perfilesFiltrados.slice(0, limiteLista),
    [perfilesFiltrados, limiteLista]
  );
  const hayMasEnLista = perfilesFiltrados.length > limiteLista;
  const cargarMasLista = () => setLimiteLista(n => n + POR_PAGINA_LISTA);

  // Marcadores: solo los que tienen coordenadas. Los que comparten punto (~11 m)
  // se agrupan para abrirlos en ronda cuando el zoom es máximo.
  const marcadores = useMemo(() => {
    const UMBRAL = 0.00015; // ~16 metros: "mismo punto"

    const grupos = new Map();
    filtradosBase.forEach(perfil => {
      if (perfil?.latitud == null || perfil?.longitud == null) return;
      const lat = Number(perfil.latitud);
      const lng = Number(perfil.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!categoriasMap[perfil.categoria_id]) return;

      const clave = `${Math.round(lat / UMBRAL)}_${Math.round(lng / UMBRAL)}`;
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push({ ...perfil, latitud: lat, longitud: lng });
    });

    const resultado = [];
    grupos.forEach(grupo => {
      grupo.forEach((perfil, i) => {
        resultado.push({ ...perfil, grupoIdx: i, grupoTam: grupo.length });
      });
    });

    // Se mantiene el orden de prioridad original
    const orden = new Map(filtradosBase.map((p, i) => [p.id, i]));
    resultado.sort((a, b) => orden.get(a.id) - orden.get(b.id));
    return resultado;
  }, [filtradosBase, categoriasMap]);

  const handleLocalizar = (perfil) => {
    const lat = Number(perfil.latitud);
    const lng = Number(perfil.longitud);

    if (!isNaN(lat) && !isNaN(lng)) {
      setLocalizarPerfil({ latitud: lat, longitud: lng });
      destacarMarcador(perfil.id);
      setPanelVisible(false);
    }
  };

  const handleClickMarcador = (perfil) => {
    setPerfilSeleccionado(perfil);
    destacarMarcador(perfil.id);
    setPanelVisible(false);
  };

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
                <span>Mi Cuenta</span>
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
          maxZoom={21}
          scrollWheelZoom
          className="mapa-leaflet"
        >
          <ScrollControl />
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={18}
            maxZoom={21}
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

          <CapaMarcadores
            marcadores={marcadores}
            categoriasMap={categoriasMap}
            markerDestacado={markerDestacado}
            perfilSeleccionadoId={perfilSeleccionado?.id}
            onClickMarcador={handleClickMarcador}
          />
        </MapContainer>
      )}

      <ListaPerfilesExplorar
        perfiles={perfilesLista}
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        categoriasMap={categoriasMap}
        onLocalizar={handleLocalizar}
        cargando={cargando}
        mensajeVacio={!perfilesFiltrados.length ? 'No hay resultados' : ''}
        hayMasServicios={hayMasEnLista}
        cargandoMas={false}
        onCargarMas={cargarMasLista}
        totalServicios={perfilesFiltrados.length}
        serviciosCargados={perfilesLista.length}
      />

      {hayResultados && (
        <div className="lista-perfiles-container lista-perfiles-desktop">
          <div className="lista-perfiles-scroll">
            {perfilesLista.map(perfil => {
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
            {hayMasEnLista && (
              <button
                type="button"
                onClick={cargarMasLista}
                style={{ flex: '0 0 auto', margin: '8px auto', padding: '10px 18px', border: 0, borderRadius: 999, background: '#0077ff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Cargar más ({perfilesLista.length}/{perfilesFiltrados.length})
              </button>
            )}
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