// src/components/mapa/ExplorarMapa.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './ExplorarMapa.css';
import { X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import ScrollControl from './ScrollControl';
import MapFlyTo from './MapFlyTo';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import UbicacionActual from './UbicacionActual';
import { BarraMapa, FichaLugar, ListaLugares } from './ui/PanelMapa';
import MenuMapa from './ui/MenuMapa';

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
   - Zoom lejano (el de apertura): puntitos chicos de color, dibujados en canvas
     (rápido aunque haya miles). Si dos se pisan, queda solo el de mayor prioridad.
   - Desde ZOOM_ICONOS: los que entran se ven como pin con ícono, y en el espacio
     que sobra los demás siguen como puntitos.
   - Zoom máximo (>= ZOOM_TODOS): se ven todos con pin; los que están en el mismo
     lugar se abren en ronda.
   `espacio` = distancia mínima en píxeles entre dos marcadores visibles.
   Cuando dos se pisan, gana el de mayor prioridad (plan > calificación).
   ============================================================ */
const ZOOM_ICONOS = 15;
const ZOOM_TODOS = 20;

const NIVELES = [
  { zoomMin: 0,          icono: false, tam: 8,  espacio: 10 },
  { zoomMin: 13,         icono: false, tam: 9,  espacio: 11 }, // zoom de apertura
  { zoomMin: 14,         icono: false, tam: 11, espacio: 13 },
  { zoomMin: ZOOM_ICONOS, icono: true, tam: 24, espacio: 30 },
  { zoomMin: 16,         icono: true,  tam: 28, espacio: 34 },
  { zoomMin: 17,         icono: true,  tam: 32, espacio: 38 },
  { zoomMin: 18,         icono: true,  tam: 36, espacio: 42 },
  { zoomMin: ZOOM_TODOS, icono: true,  tam: 38, espacio: 0 },  // 0 = se muestran todos
];

// Puntitos de relleno entre los pines (zoom con íconos)
const PUNTO_RELLENO = { tam: 9, espacio: 11 };
// Tamaño del pin para el marcador seleccionado cuando el zoom está en modo puntitos
const TAM_PIN_FORZADO = 30;
// Lado de cada celda de la grilla de colisiones (>= suma de dos radios posibles)
const CELDA = 48;

const nivelDeZoom = (zoom) => {
  let nivel = NIVELES[0];
  NIVELES.forEach((n) => {
    if (zoom >= n.zoomMin) nivel = n;
  });
  return nivel;
};

// Grilla para saber rápido si un círculo (x, y, r) se pisa con otro ya colocado
const crearGrilla = () => {
  const celdas = new Map();
  const clave = (cx, cy) => `${cx}_${cy}`;
  return {
    choca(x, y, r) {
      const cx = Math.floor(x / CELDA);
      const cy = Math.floor(y / CELDA);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const lista = celdas.get(clave(cx + dx, cy + dy));
          if (lista && lista.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r)) return true;
        }
      }
      return false;
    },
    agregar(x, y, r) {
      const k = clave(Math.floor(x / CELDA), Math.floor(y / CELDA));
      if (!celdas.has(k)) celdas.set(k, []);
      celdas.get(k).push({ x, y, r });
    },
  };
};

// Registra un pin en la grilla: el cuerpo (arriba del punto) y la punta
const registrarPin = (grilla, p, tam, espacio) => {
  grilla.agregar(p.x, p.y - tam * 0.8, espacio / 2);
  grilla.agregar(p.x, p.y, 4);
};

/* Decide qué se ve como pin y qué como puntito, sin que se encimen.
   `marcadores` viene ordenado por prioridad. Los "forzados" (seleccionado o
   recién localizado) siempre se ven como pin. */
const elegirVisibles = (marcadores, proyectar, nivel, forzados) => {
  if (!nivel.espacio) return { pines: marcadores, puntos: [] };

  const grilla = crearGrilla();
  const pines = [];
  const puntos = [];
  const usados = new Set();
  const tamPin = nivel.icono ? nivel.tam : TAM_PIN_FORZADO;
  const espacioPin = nivel.icono ? nivel.espacio : TAM_PIN_FORZADO + 6;

  // 1) Forzados: siempre como pin
  marcadores.forEach((m) => {
    if (!forzados.has(m.id)) return;
    registrarPin(grilla, proyectar(m), tamPin, espacioPin);
    pines.push(m);
    usados.add(m.id);
  });

  // 2) Pines con ícono (solo con zoom cercano)
  if (nivel.icono) {
    marcadores.forEach((m) => {
      if (usados.has(m.id)) return;
      const p = proyectar(m);
      if (grilla.choca(p.x, p.y - nivel.tam * 0.8, nivel.espacio / 2) || grilla.choca(p.x, p.y, 4)) return;
      registrarPin(grilla, p, nivel.tam, nivel.espacio);
      pines.push(m);
      usados.add(m.id);
    });
  }

  // 3) Puntitos en el espacio libre
  const punto = nivel.icono ? PUNTO_RELLENO : nivel;
  marcadores.forEach((m) => {
    if (usados.has(m.id)) return;
    const p = proyectar(m);
    const r = punto.espacio / 2;
    if (grilla.choca(p.x, p.y, r)) return;
    grilla.agregar(p.x, p.y, r);
    puntos.push(m);
  });

  return { pines, puntos };
};

// Pin con ícono según categoría, color de plan (anillo) y si está destacado.
const construirIcono = (categoria, tamBase, pinColor, destacado, cantidad = 1, rama = null) => {
  const color = categoria?.color || '#607d8b';
  const icon = categoria?.icon || 'location_on';
  const tam = destacado ? Math.max(tamBase, 34) : tamBase;
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
  const [limites, setLimites] = useState(() => map.getBounds().pad(0.4));
  const cacheIconos = useRef(new Map());
  const cacheEstilos = useRef(new Map());
  // Canvas propio para los puntitos: miles de puntos sin trabar el mapa.
  // `tolerance` agranda la zona tocable (útil en celular).
  const lienzo = useMemo(() => L.canvas({ padding: 0.5, tolerance: 7 }), []);

  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
      setLimites(map.getBounds().pad(0.4));
    },
    moveend: () => setLimites(map.getBounds().pad(0.4)),
  });

  const nivel = nivelDeZoom(zoom);

  const forzados = useMemo(() => {
    const ids = new Set();
    if (markerDestacado != null) ids.add(markerDestacado);
    if (perfilSeleccionadoId != null) ids.add(perfilSeleccionadoId);
    return ids;
  }, [markerDestacado, perfilSeleccionadoId]);

  const obtenerIcono = (categoria, tam, pinColor, destacado, cantidad, rama) => {
    const clave = [
      categoria?.color, categoria?.icon, tam, pinColor, destacado ? 1 : 0, cantidad,
      rama ? `${Math.round(rama.dx)}_${Math.round(rama.dy)}` : '',
    ].join('|');
    let icono = cacheIconos.current.get(clave);
    if (!icono) {
      icono = construirIcono(categoria, tam, pinColor, destacado, cantidad, rama);
      cacheIconos.current.set(clave, icono);
    }
    return icono;
  };

  // Estilo del puntito (cacheado: si el objeto cambia, Leaflet redibuja)
  const obtenerEstilo = (color, pinColor, agrupado) => {
    const clave = `${color}|${pinColor || ''}|${agrupado ? 1 : 0}`;
    let estilo = cacheEstilos.current.get(clave);
    if (!estilo) {
      estilo = {
        fillColor: color,
        fillOpacity: 1,
        color: pinColor || (agrupado ? '#1e293b' : '#ffffff'),
        weight: pinColor || agrupado ? 2 : 1.5,
        opacity: 1,
      };
      cacheEstilos.current.set(clave, estilo);
    }
    return estilo;
  };

  // Qué se ve y cómo (solo depende del zoom, no del desplazamiento del mapa)
  const { pines, puntos } = useMemo(() => {
    const { pines: elegidos, puntos: libres } = elegirVisibles(
      marcadores,
      (m) => map.project([m.anclaLat, m.anclaLng], zoom),
      nivel,
      forzados
    );

    const pinesConPos = elegidos.map((m) => {
      // Varios negocios en el mismo lugar: recién al zoom máximo se abren en ronda
      if (zoom < ZOOM_TODOS || m.grupoTam < 2) {
        return { m, pos: [m.anclaLat, m.anclaLng], aproximado: false, rama: null };
      }
      const centro = map.project([m.anclaLat, m.anclaLng], zoom);
      const n = m.grupoTam;
      const radio = Math.max(nivel.tam * 1.1, (nivel.tam * 0.95) / Math.sin(Math.PI / n));
      const angulo = -Math.PI / 2 + (2 * Math.PI * m.grupoIdx) / n;
      const punto = L.point(centro.x + radio * Math.cos(angulo), centro.y + radio * Math.sin(angulo));
      const ll = map.unproject(punto, zoom);
      return { m, pos: [ll.lat, ll.lng], aproximado: true, rama: { dx: centro.x - punto.x, dy: centro.y - punto.y } };
    });

    return { pines: pinesConPos, puntos: libres };
  }, [marcadores, zoom, nivel, forzados, map]);

  const abrirOAcercar = (m) => {
    // Varios en el mismo lugar: se acerca hasta abrirlos en ronda
    if (m.grupoTam > 1 && zoom < ZOOM_TODOS) {
      map.flyTo([m.anclaLat, m.anclaLng], ZOOM_TODOS, { duration: 0.6 });
    } else {
      onClickMarcador(m);
    }
  };
  const refAbrir = useRef(abrirOAcercar);
  refAbrir.current = abrirOAcercar;

  // Puntitos: se arman solo cuando cambia la selección (no al mover el mapa)
  const elementosPuntos = useMemo(() => puntos.map((m) => {
    const categoria = categoriasMap[m.categoria_id];
    if (!categoria) return null;
    const agrupado = m.grupoTam > 1;
    const tam = nivel.icono ? PUNTO_RELLENO.tam : nivel.tam;
    return (
      <CircleMarker
        key={`p-${m.id}`}
        center={[m.anclaLat, m.anclaLng]}
        radius={tam / 2 + (agrupado ? 1 : 0)}
        renderer={lienzo}
        pathOptions={obtenerEstilo(categoria.color || '#607d8b', m.pin_color, agrupado)}
        eventHandlers={{ click: () => refAbrir.current(m) }}
      >
        <Tooltip direction="top" offset={[0, -tam / 2]}>
          {agrupado ? `${m.nombre} y ${m.grupoTam - 1} más` : m.nombre}
        </Tooltip>
      </CircleMarker>
    );
  }), [puntos, categoriasMap, nivel, lienzo]);

  // Pines: solo los que están cerca de la pantalla (menos elementos en la página)
  const pinesEnPantalla = pines.filter(
    ({ m, pos }) => forzados.has(m.id) || limites.contains(pos)
  );
  const tamPin = nivel.icono ? nivel.tam : TAM_PIN_FORZADO;

  return (
    <>
      {elementosPuntos}

      {/* Punto central de cada grupo abierto en ramas */}
      {pinesEnPantalla.filter(p => p.aproximado && p.m.grupoIdx === 0).map(({ m }) => (
        <Marker
          key={`centro-${m.id}`}
          position={[m.anclaLat, m.anclaLng]}
          icon={ICONO_CENTRO}
          interactive={false}
          zIndexOffset={-500}
        />
      ))}
      {pinesEnPantalla.map(({ m, pos, aproximado, rama }) => {
        const categoria = categoriasMap[m.categoria_id];
        if (!categoria) return null;
        const destacado = m.id === markerDestacado;
        const apilado = m.grupoTam > 1 && zoom < ZOOM_TODOS;
        return (
          <Marker
            key={m.id}
            position={pos}
            icon={obtenerIcono(categoria, tamPin, m.pin_color, destacado, apilado ? m.grupoTam : 1, rama)}
            zIndexOffset={destacado ? 1000 : (m.pin_color ? 500 : 0)}
            eventHandlers={{ click: () => abrirOAcercar(m) }}
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
  const [, setTotalServicios] = useState(0);
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

  // Al escribir se abre la lista; al borrar la búsqueda no se cierra sola
  useEffect(() => {
    if (query.trim()) setPanelVisible(true);
  }, [query]);

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

  // Marcadores: solo los que tienen coordenadas. Los que están en el mismo lugar
  // (a menos de ~15 m) forman un grupo: se muestran juntos en el punto del de mayor
  // prioridad (con el número) y se abren en ronda con el zoom máximo.
  const marcadores = useMemo(() => {
    const UMBRAL = 0.00014; // ~15 metros: "mismo lugar"

    const celdas = new Map(); // celda -> grupos con ancla en esa celda
    const grupos = [];
    filtradosBase.forEach(perfil => {
      if (perfil?.latitud == null || perfil?.longitud == null) return;
      const lat = Number(perfil.latitud);
      const lng = Number(perfil.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!categoriasMap[perfil.categoria_id]) return;

      const cx = Math.floor(lat / UMBRAL);
      const cy = Math.floor(lng / UMBRAL);

      // Busca un grupo cercano mirando la celda y sus vecinas (así no se cortan
      // grupos que caen justo en el borde de una celda)
      let grupo = null;
      for (let dx = -1; dx <= 1 && !grupo; dx += 1) {
        for (let dy = -1; dy <= 1 && !grupo; dy += 1) {
          const lista = celdas.get(`${cx + dx}_${cy + dy}`);
          if (lista) {
            grupo = lista.find(g => Math.abs(g.lat - lat) < UMBRAL && Math.abs(g.lng - lng) < UMBRAL) || null;
          }
        }
      }

      if (!grupo) {
        grupo = { lat, lng, miembros: [] };
        grupos.push(grupo);
        const k = `${cx}_${cy}`;
        if (!celdas.has(k)) celdas.set(k, []);
        celdas.get(k).push(grupo);
      }
      grupo.miembros.push({ ...perfil, latitud: lat, longitud: lng });
    });

    // filtradosBase ya viene por prioridad, así que el resultado mantiene ese orden
    const porId = new Map();
    grupos.forEach(g => {
      g.miembros.forEach((perfil, i) => {
        porId.set(perfil.id, {
          ...perfil,
          anclaLat: g.lat,
          anclaLng: g.lng,
          grupoIdx: i,
          grupoTam: g.miembros.length,
        });
      });
    });
    return filtradosBase.filter(p => porId.has(p.id)).map(p => porId.get(p.id));
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

  // Solo categorías que tienen algo en el mapa (y del tipo elegido)
  const categoriasDisponibles = useMemo(() => {
    const conLugares = new Set(servicios.map((s) => s.categoria_id));
    return Object.values(categoriasMap)
      .filter((cat) => (!tipo || cat.tipo === tipo) && conLugares.has(cat.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [categoriasMap, tipo, servicios]);

  const [esPC, setEsPC] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const alCambiar = () => setEsPC(window.innerWidth >= 1024);
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  // Abrir la ficha de un lugar desde la lista: muestra la ficha y lleva el mapa hasta ahí
  const abrirFicha = (perfil) => {
    setPerfilSeleccionado(perfil);
    handleLocalizar(perfil);
  };
  const cerrarFicha = useCallback(() => setPerfilSeleccionado(null), []);
  const cerrarMenu = useCallback(() => setMenuOpen(false), []);

  const limpiarTodo = () => {
    setQuery('');
    setTipo('');
    setCategoria('');
    setCalificacion('');
  };

  const handleVolverClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const propsBarra = {
    query, setQuery, tipo, setTipo, categoria, setCategoria, calificacion, setCalificacion,
    categoriasDisponibles,
    onVolver: handleVolverClick,
    onMenu: () => setMenuOpen((v) => !v),
  };

  const propsLista = {
    perfiles: perfilesLista,
    total: perfilesFiltrados.length,
    categoriasMap,
    hayMas: hayMasEnLista,
    onCargarMas: cargarMasLista,
    onAbrir: abrirFicha,
    onLocalizar: handleLocalizar,
    query,
    onLimpiar: limpiarTodo,
  };

  const total = perfilesFiltrados.length;
  const textoTotal = `${total} ${total === 1 ? 'lugar' : 'lugares'}`;

  return (
    <div className={`explorar-mapa-container pm-pagina ${esPC ? 'pm-pc' : 'pm-cel'}`}>
      {esPC ? (
        <aside className="pm-lateral" aria-label="Buscar en el mapa">
          <div className="pm-lateral-marca">
            <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="" />
            <div>
              <strong>Mapa de Goya</strong>
              <span>{cargando ? 'Cargando…' : `${textoTotal}${cargandoMas ? ' (cargando más…)' : ''}`}</span>
            </div>
          </div>
          <BarraMapa {...propsBarra} />
          <div className="pm-lateral-contenido">
            {perfilSeleccionado ? (
              <FichaLugar
                perfil={perfilSeleccionado}
                categoria={categoriasMap[perfilSeleccionado.categoria_id]}
                onCerrar={cerrarFicha}
                enPanel
              />
            ) : !cargando ? (
              <ListaLugares {...propsLista} />
            ) : null}
          </div>
        </aside>
      ) : (
        <div className="pm-flotante">
          <BarraMapa {...propsBarra} />
        </div>
      )}

      <MenuMapa
        abierto={menuOpen}
        onCerrar={cerrarMenu}
        rutaPanel={obtenerRutaPanel()}
        esPC={esPC}
      />

      <div className="pm-mapa">
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
      </div>

      {/* Celular: ficha o lista que suben desde abajo */}
      {!esPC && !cargando && (
        perfilSeleccionado ? (
          <div className="pm-hoja pm-hoja-ficha">
            <span className="pm-hoja-manija" aria-hidden="true" />
            <FichaLugar
              perfil={perfilSeleccionado}
              categoria={categoriasMap[perfilSeleccionado.categoria_id]}
              onCerrar={cerrarFicha}
            />
          </div>
        ) : panelVisible ? (
          <>
            <div className="pm-hoja-fondo" onClick={() => setPanelVisible(false)} />
            <div className="pm-hoja pm-hoja-lista" role="dialog" aria-label="Lugares encontrados">
              <div className="pm-hoja-cabecera">
                <span className="pm-hoja-manija" aria-hidden="true" />
                <strong>{textoTotal}{query ? ` para "${query}"` : ''}</strong>
                <button type="button" className="pm-icono-boton" onClick={() => setPanelVisible(false)} aria-label="Ver el mapa">
                  <span className="material-icons">map</span>
                </button>
              </div>
              <div className="pm-hoja-cuerpo">
                <ListaLugares {...propsLista} />
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={`pm-ver-lista ${hayResultados ? '' : 'vacio'}`}
            onClick={() => setPanelVisible(true)}
          >
            <span className="material-icons">{hayResultados ? 'format_list_bulleted' : 'search_off'}</span>
            {hayResultados ? `Ver ${textoTotal}` : 'Sin resultados'}
          </button>
        )
      )}
    </div>
  );
};

export default ExplorarMapa;
