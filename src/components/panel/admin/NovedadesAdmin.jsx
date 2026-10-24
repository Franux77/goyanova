import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { limpiarTexto } from '../../../utils/limpiarTexto';
import './NovedadesAdmin.css';

const ZONA = 'America/Argentina/Buenos_Aires';
const MIN_MS = 60 * 1000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;

// ---------- fechas (siempre hora de Argentina, igual que los mails) ----------

const diaArgentina = (fecha = new Date()) =>
  new Date(fecha).toLocaleDateString('en-CA', { timeZone: ZONA }); // AAAA-MM-DD

// Argentina es UTC-3 todo el año
const inicioDia = (dia) => new Date(`${dia}T00:00:00-03:00`);
const sumarDias = (dia, n) => diaArgentina(new Date(inicioDia(dia).getTime() + n * DIA_MS + 12 * HORA_MS));

const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDiaCorto = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: ZONA, day: '2-digit', month: '2-digit' });
const fmtDiaLargo = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });
const horaDe = (iso) => Number(new Date(iso).toLocaleTimeString('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }));

// ---------- catálogo de tipos ----------

const BLOQUES = [
  { clave: 'usuarios', texto: 'Usuarios', icono: 'people', color: 'azul' },
  { clave: 'servicios', texto: 'Servicios', icono: 'build', color: 'verde' },
  { clave: 'opiniones', texto: 'Reseñas y comentarios', icono: 'reviews', color: 'ambar' },
  { clave: 'soporte', texto: 'Soporte', icono: 'support_agent', color: 'violeta' },
  { clave: 'moderacion', texto: 'Moderación', icono: 'gavel', color: 'rojo' },
  { clave: 'dinero', texto: 'Pagos y membresías', icono: 'payments', color: 'celeste' },
];

const ICONO_TIPO = {
  usuario_nuevo: 'person_add',
  servicio_nuevo: 'add_business',
  servicio_editado: 'edit',
  servicio_estado: 'toggle_on',
  servicio_eliminado: 'delete',
  perfil_editado: 'manage_accounts',
  perfil_estado: 'manage_accounts',
  perfil_rol: 'admin_panel_settings',
  perfil_verificado: 'verified',
  perfil_eliminado: 'person_off',
  opinion_nueva: 'star',
  opinion_respuesta: 'reply',
  comentario_nuevo: 'chat',
  comentario_respuesta: 'reply',
  soporte_nuevo: 'mail',
  soporte_respondido: 'mark_email_read',
  solicitud_eliminacion: 'delete_sweep',
  reporte_nuevo: 'flag',
  reporte_resuelto: 'task_alt',
  verificacion_pedida: 'badge',
  verificacion_resuelta: 'verified_user',
  suspension: 'block',
  moderacion: 'gavel',
  pago: 'payments',
  membresia_nueva: 'card_membership',
  codigo_canjeado: 'confirmation_number',
};

const enlaceDe = (e) => {
  switch (e.ref_tipo) {
    case 'servicio':
      return e.ref_id ? `/perfil/${e.ref_id}` : null;
    case 'usuario':
      return '/panel/admin/usuarios';
    case 'mensaje':
      return '/panel/admin/mensajes-soporte';
    case 'reporte':
      return '/panel/admin/reportes';
    case 'verificacion':
      return '/panel/admin/verificaciones';
    case 'solicitud':
      return '/panel/admin/solicitudes-eliminacion';
    case 'comentario':
      return '/panel/admin/comentarios';
    default:
      return null;
  }
};

const ESTADO_MAIL = {
  sin_envio: { texto: 'Sin mail', clase: 'gris' },
  pendiente: { texto: 'Enviando…', clase: 'azul' },
  enviando: { texto: 'Enviando…', clase: 'azul' },
  enviado: { texto: 'Enviado', clase: 'verde' },
  error: { texto: 'Error al enviar', clase: 'rojo' },
  vencido: { texto: 'No se envió', clase: 'ambar' },
};

const NOMBRE_CORTE = { manana: 'Resumen de las 9:00', noche: 'Resumen de las 20:00', manual: 'Resumen manual' };

const FUNCION_MAIL = '/.netlify/functions/novedades-resumen';
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// ---------- agrupar y ordenar ----------

// Cambios chicos (ediciones): se juntan por publicación/persona y van plegados al final
const TIPOS_MENORES = new Set(['servicio_editado', 'perfil_editado']);

// Los números grandes de arriba (y su comparación con el período anterior)
const METRICAS = [
  { clave: 'usuarios', texto: 'Usuarios nuevos', uno: 'usuario nuevo', varios: 'usuarios nuevos', icono: 'person_add', tipos: ['usuario_nuevo'], color: 'azul' },
  { clave: 'publicaciones', texto: 'Publicaciones nuevas', uno: 'publicación nueva', varios: 'publicaciones nuevas', icono: 'add_business', tipos: ['servicio_nuevo'], color: 'verde' },
  { clave: 'resenas', texto: 'Reseñas', uno: 'reseña', varios: 'reseñas', icono: 'star', tipos: ['opinion_nueva', 'comentario_nuevo'], color: 'ambar' },
  { clave: 'planes', texto: 'Planes activados', uno: 'plan activado', varios: 'planes activados', icono: 'workspace_premium', tipos: ['membresia_nueva'], color: 'celeste' },
];

const contarTipos = (porTipo, tipos) => tipos.reduce((s, t) => s + (Number(porTipo?.[t]) || 0), 0);

const partes = (detalle) => String(detalle || '').split(' · ').map((p) => p.trim()).filter(Boolean);

// "Cortar Pastos · nombre, categoría" + "Cortar Pastos · categoría" → 1 fila con 2 cambios
const juntarMenores = (eventos) => {
  const mapa = new Map();
  eventos.forEach((e) => {
    const [quien, ...resto] = partes(e.detalle);
    const clave = `${e.tipo}|${e.ref_id || quien || e.titulo}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, { ...e, quien: quien || e.titulo, campos: new Set(), actores: new Set(), veces: 0, ultima: e.fecha });
    }
    const g = mapa.get(clave);
    g.veces += 1;
    resto.join(', ').split(',').map((c) => c.trim()).filter(Boolean).forEach((c) => g.campos.add(c));
    if (e.actor) g.actores.add(e.actor);
    if (new Date(e.fecha) > new Date(g.ultima)) g.ultima = e.fecha;
  });
  return [...mapa.values()].sort((a, b) => new Date(b.ultima) - new Date(a.ultima));
};

const porDia = (eventos) => {
  const grupos = new Map();
  eventos.forEach((e) => {
    const clave = diaArgentina(e.fecha);
    if (!grupos.has(clave)) grupos.set(clave, { clave, items: [] });
    grupos.get(clave).items.push(e);
  });
  return [...grupos.values()].sort((a, b) => (a.clave < b.clave ? 1 : -1));
};

const hace = (iso) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / MIN_MS);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return fmtHora(iso);
};

// Fila de un evento: qué pasó (etiqueta), quién/qué (principal) y el resto
const FilaEvento = ({ e }) => {
  const bloque = BLOQUES.find((b) => b.clave === e.bloque);
  const enlace = enlaceDe(e);
  const [principal, ...resto] = partes(e.detalle);
  const contenido = (
    <>
      <span className={`nov-icono c-${bloque?.color || 'gris'}`}>
        <span className="material-icons">{ICONO_TIPO[e.tipo] || 'notifications'}</span>
      </span>
      <span className="nov-datos">
        <span className={`nov-etiqueta c-${bloque?.color || 'gris'}`}>{e.titulo}</span>
        <strong>{principal || e.titulo}</strong>
        {(resto.length > 0 || e.actor) && (
          <small>
            {resto.join(' · ')}
            {resto.length > 0 && e.actor ? ' · ' : ''}
            {e.actor ? `por ${e.actor}` : ''}
          </small>
        )}
      </span>
      <span className="nov-cuando">
        <span>{hace(e.fecha)}</span>
        {enlace && <span className="material-icons">chevron_right</span>}
      </span>
    </>
  );
  return (
    <li>
      {enlace ? (
        <Link to={enlace} className="nov-fila">{contenido}</Link>
      ) : (
        <div className="nov-fila">{contenido}</div>
      )}
    </li>
  );
};

// ---------- pantalla ----------

const NovedadesAdmin = () => {
  const [tab, setTab] = useState('novedades'); // novedades | resumenes | correos
  const [dia, setDia] = useState(diaArgentina());
  const [modo, setModo] = useState('dia'); // dia | semana | mes | ventana
  const [ventana, setVentana] = useState(null); // { desde, hasta, texto } al venir de un resumen
  const [datos, setDatos] = useState(null);
  const [anterior, setAnterior] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroBloque, setFiltroBloque] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [verMenores, setVerMenores] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 60;

  const rango = useMemo(() => {
    if (modo === 'ventana' && ventana) return { desde: new Date(ventana.desde), hasta: new Date(ventana.hasta) };
    if (modo === 'semana' || modo === 'mes') {
      const hasta = new Date();
      return { desde: new Date(hasta.getTime() - (modo === 'semana' ? 7 : 30) * DIA_MS), hasta };
    }
    const desde = inicioDia(dia);
    return { desde, hasta: new Date(desde.getTime() + DIA_MS) };
  }, [modo, dia, ventana]);

  const cargar = useCallback(async () => {
    const largo = rango.hasta.getTime() - rango.desde.getTime();
    const [actual, previo] = await Promise.all([
      supabase.rpc('admin_novedades', { p_desde: rango.desde.toISOString(), p_hasta: rango.hasta.toISOString() }),
      // Mismo largo, justo antes: para comparar (↑ / ↓)
      modo === 'ventana'
        ? Promise.resolve({ data: null })
        : supabase.rpc('admin_novedades', {
            p_desde: new Date(rango.desde.getTime() - largo).toISOString(),
            p_hasta: rango.desde.toISOString(),
          }),
    ]);
    if (actual.error) {
      setError('No se pudieron cargar las novedades.');
    } else {
      setDatos(actual.data);
      setError('');
    }
    setAnterior(previo?.data || null);
    setCargando(false);
  }, [rango, modo]);

  useEffect(() => {
    setCargando(true);
    cargar();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [cargar]);

  // Al abrir la sección y al salir se marca todo como visto (baja el numerito del menú)
  useEffect(() => {
    supabase.rpc('admin_novedades_marcar_visto').then(() => {}, () => {});
    return () => {
      supabase.rpc('admin_novedades_marcar_visto').then(() => {}, () => {});
    };
  }, []);

  useEffect(() => { setPagina(1); }, [filtroBloque, busqueda, modo, dia, ventana]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos?.eventos || []).filter(
      (e) =>
        (filtroBloque === 'todos' || e.bloque === filtroBloque) &&
        (!q || `${e.titulo || ''} ${e.detalle || ''} ${e.actor || ''}`.toLowerCase().includes(q))
    );
  }, [datos, filtroBloque, busqueda]);

  const importantes = useMemo(() => filtrados.filter((e) => !TIPOS_MENORES.has(e.tipo)), [filtrados]);
  const menores = useMemo(() => juntarMenores(filtrados.filter((e) => TIPOS_MENORES.has(e.tipo))), [filtrados]);
  const visibles = importantes.slice(0, pagina * POR_PAGINA);
  const dias = useMemo(() => porDia(visibles), [visibles]);

  // Actividad por hora (hora de Argentina)
  const porHora = useMemo(() => {
    const horas = Array(24).fill(0);
    (datos?.eventos || []).forEach((e) => { horas[horaDe(e.fecha)] += 1; });
    return horas;
  }, [datos]);
  const maxHora = Math.max(1, ...porHora);
  const horaPico = porHora.indexOf(Math.max(...porHora));

  const hoy = diaArgentina();
  const irADia = (d) => { setModo('dia'); setVentana(null); setDia(d); };
  const elegirModo = (m) => { setModo(m); setVentana(null); };

  const tituloRango = () => {
    if (modo === 'ventana' && ventana) return ventana.texto;
    if (modo === 'semana') return 'Últimos 7 días';
    if (modo === 'mes') return 'Últimos 30 días';
    if (dia === hoy) return 'Hoy';
    if (dia === sumarDias(hoy, -1)) return 'Ayer';
    return fmtDiaLargo(inicioDia(dia));
  };
  const textoAnterior = modo === 'dia' ? 'el día anterior' : modo === 'semana' ? 'los 7 días anteriores' : 'los 30 días anteriores';

  const verVentana = (r) => {
    setVentana({
      desde: r.desde,
      hasta: r.hasta,
      texto: `${NOMBRE_CORTE[r.corte] || 'Resumen'} · ${fmtDiaCorto(r.desde)} ${fmtHora(r.desde)} → ${fmtDiaCorto(r.hasta)} ${fmtHora(r.hasta)}`,
    });
    setModo('ventana');
    setTab('novedades');
  };

  // Frase de resumen: "53 usuarios nuevos, 2 publicaciones y 3 reseñas"
  const frase = useMemo(() => {
    if (!datos) return '';
    const piezas = METRICAS.map((m) => ({ n: contarTipos(datos.por_tipo, m.tipos), m }))
      .filter((p) => p.n > 0)
      .map((p) => `${p.n} ${p.n === 1 ? p.m.uno : p.m.varios}`);
    if (piezas.length === 0) return datos.total > 0 ? 'Solo hubo cambios menores (ediciones).' : 'No pasó nada en este período.';
    const ultima = piezas.pop();
    return `${piezas.length ? `${piezas.join(', ')} y ` : ''}${ultima}.`;
  }, [datos]);

  return (
    <div className="nov-admin">
      <header className="nov-cab">
        <div>
          <h1>Novedades</h1>
          <p>Lo que pasa en GoyaNova, ordenado por importancia.</p>
        </div>
        <button type="button" className="nov-refrescar" onClick={cargar} title="Actualizar" aria-label="Actualizar">
          <span className="material-icons">refresh</span>
        </button>
      </header>

      <div className="nov-tabs" role="tablist">
        {[
          ['novedades', 'Actividad', 'bolt'],
          ['resumenes', 'Resúmenes', 'history'],
          ['correos', 'Mails', 'forward_to_inbox'],
        ].map(([clave, texto, icono]) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={tab === clave}
            className={tab === clave ? 'sel' : ''}
            onClick={() => setTab(clave)}
          >
            <span className="material-icons">{icono}</span>
            {texto}
          </button>
        ))}
      </div>

      {tab === 'novedades' && (
        <>
          {/* Período */}
          <div className="nov-periodo">
            <div className="nov-segmento" role="group" aria-label="Período">
              <button type="button" className={modo === 'dia' && dia === hoy ? 'sel' : ''} onClick={() => irADia(hoy)}>Hoy</button>
              <button type="button" className={modo === 'dia' && dia === sumarDias(hoy, -1) ? 'sel' : ''} onClick={() => irADia(sumarDias(hoy, -1))}>Ayer</button>
              <button type="button" className={modo === 'semana' ? 'sel' : ''} onClick={() => elegirModo('semana')}>7 días</button>
              <button type="button" className={modo === 'mes' ? 'sel' : ''} onClick={() => elegirModo('mes')}>30 días</button>
            </div>
            <div className="nov-selector">
              <button type="button" onClick={() => irADia(sumarDias(modo === 'dia' ? dia : hoy, -1))} aria-label="Día anterior">
                <span className="material-icons">chevron_left</span>
              </button>
              <input type="date" value={dia} max={hoy} onChange={(e) => e.target.value && irADia(e.target.value)} aria-label="Elegir fecha" />
              <button type="button" onClick={() => irADia(sumarDias(dia, 1))} disabled={modo !== 'dia' || dia >= hoy} aria-label="Día siguiente">
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>

          {error && <p className="nov-estado nov-error">{error}</p>}
          {cargando && !datos && <p className="nov-estado">Cargando…</p>}

          {datos && (
            <div className={cargando ? 'nov-cargando' : ''}>
              {/* Resumen */}
              <section className="nov-resumen">
                <p className="nov-resumen-rango">{tituloRango()}</p>
                <h2>{frase}</h2>
                <div className="nov-metricas">
                  {METRICAS.map((m) => {
                    const n = contarTipos(datos.por_tipo, m.tipos);
                    const antes = anterior ? contarTipos(anterior.por_tipo, m.tipos) : null;
                    const dif = antes === null ? null : n - antes;
                    return (
                      <div key={m.clave} className={`nov-metrica c-${m.color}`}>
                        <span className="material-icons">{m.icono}</span>
                        <strong>{n}</strong>
                        <span>{m.texto}</span>
                        {dif !== null && (
                          <small className={dif > 0 ? 'sube' : dif < 0 ? 'baja' : ''} title={`Comparado con ${textoAnterior}: ${antes}`}>
                            {dif > 0 ? `↑ ${dif}` : dif < 0 ? `↓ ${Math.abs(dif)}` : '='} vs {textoAnterior}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Para atender */}
              {Array.isArray(datos.alertas) && datos.alertas.length > 0 && (
                <section className="nov-atender">
                  <h3><span className="material-icons">priority_high</span> Para atender ahora</h3>
                  <div className="nov-atender-lista">
                    {datos.alertas.map((a) => (
                      <Link key={a.clave} to={a.ruta} className="nov-atender-item">
                        <strong>{a.cantidad}</strong>
                        <span>{a.texto}</span>
                        <span className="material-icons">chevron_right</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Actividad por hora */}
              {datos.total > 0 && (
                <section className="nov-horas">
                  <div className="nov-horas-cab">
                    <h3>¿A qué hora se mueve GoyaNova?</h3>
                    <span>Pico: {String(horaPico).padStart(2, '0')}:00 h</span>
                  </div>
                  <div className="nov-horas-barras" role="img" aria-label={`Actividad por hora. El momento con más movimiento es a las ${horaPico} horas.`}>
                    {porHora.map((n, h) => (
                      <span key={h} className={h === horaPico ? 'pico' : ''} style={{ height: `${Math.max(4, (n / maxHora) * 100)}%` }} title={`${h}:00 · ${n}`} />
                    ))}
                  </div>
                  <div className="nov-horas-eje"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>
                </section>
              )}

              {/* Filtros */}
              <div className="nov-filtros">
                <div className="nov-chips">
                  <button type="button" className={filtroBloque === 'todos' ? 'sel' : ''} onClick={() => setFiltroBloque('todos')}>
                    Todo <b>{datos.total}</b>
                  </button>
                  {BLOQUES.filter((b) => (datos.por_bloque?.[b.clave] || 0) > 0).map((b) => (
                    <button
                      key={b.clave}
                      type="button"
                      className={`c-${b.color} ${filtroBloque === b.clave ? 'sel' : ''}`}
                      onClick={() => setFiltroBloque(filtroBloque === b.clave ? 'todos' : b.clave)}
                    >
                      <span className="material-icons">{b.icono}</span>
                      {b.texto} <b>{datos.por_bloque[b.clave]}</b>
                    </button>
                  ))}
                </div>
                <div className="nov-buscar">
                  <span className="material-icons">search</span>
                  <input
                    type="search"
                    placeholder="Buscar persona, publicación o texto…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(limpiarTexto(e.target.value))}
                    aria-label="Buscar en novedades"
                  />
                </div>
              </div>

              {datos.truncado && (
                <p className="nov-nota">Hubo muchísimo movimiento: se muestran las 1500 novedades más recientes.</p>
              )}

              {/* Lo importante */}
              <section className="nov-bloque">
                <h3 className="nov-bloque-titulo">
                  <span className="material-icons">star</span>
                  Lo importante <span>{importantes.length}</span>
                </h3>
                {importantes.length === 0 ? (
                  <p className="nov-vacio">
                    {filtroBloque !== 'todos' || busqueda
                      ? 'Nada importante con ese filtro.'
                      : 'Sin registros nuevos, publicaciones ni reseñas en este período.'}
                  </p>
                ) : (
                  dias.map((g) => (
                    <div key={g.clave} className="nov-dia">
                      {(modo !== 'dia' || dias.length > 1) && (
                        <h4>{g.clave === hoy ? 'Hoy' : g.clave === sumarDias(hoy, -1) ? 'Ayer' : fmtDiaLargo(inicioDia(g.clave))}</h4>
                      )}
                      <ul className="nov-lista">
                        {g.items.map((e, i) => <FilaEvento key={`${e.tipo}-${e.ref_id}-${e.fecha}-${i}`} e={e} />)}
                      </ul>
                    </div>
                  ))
                )}
                {visibles.length < importantes.length && (
                  <button type="button" className="nov-mas" onClick={() => setPagina((p) => p + 1)}>
                    Ver más ({importantes.length - visibles.length})
                  </button>
                )}
              </section>

              {/* Cambios menores */}
              {menores.length > 0 && (
                <section className="nov-bloque nov-menores">
                  <button type="button" className="nov-menores-cab" onClick={() => setVerMenores((v) => !v)} aria-expanded={verMenores}>
                    <span className="material-icons">edit_note</span>
                    <span>
                      <strong>Cambios menores</strong>
                      <small>
                        {menores.reduce((s, m) => s + m.veces, 0)} ediciones de perfiles y publicaciones
                      </small>
                    </span>
                    <span className="material-icons">{verMenores ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {verMenores && (
                    <ul className="nov-lista">
                      {menores.map((m) => {
                        const enlace = enlaceDe(m);
                        const cuerpo = (
                          <>
                            <span className="nov-icono c-gris"><span className="material-icons">{ICONO_TIPO[m.tipo]}</span></span>
                            <span className="nov-datos">
                              <span className="nov-etiqueta c-gris">{m.tipo === 'servicio_editado' ? 'Publicación editada' : 'Perfil editado'}{m.veces > 1 ? ` · ${m.veces} veces` : ''}</span>
                              <strong>{m.quien}</strong>
                              <small>
                                {[...m.campos].join(', ') || 'cambios'}
                                {m.actores.size > 0 ? ` · por ${[...m.actores].join(', ')}` : ''}
                              </small>
                            </span>
                            <span className="nov-cuando"><span>{hace(m.ultima)}</span>{enlace && <span className="material-icons">chevron_right</span>}</span>
                          </>
                        );
                        return (
                          <li key={`${m.tipo}-${m.ref_id || m.quien}`}>
                            {enlace ? <Link to={enlace} className="nov-fila">{cuerpo}</Link> : <div className="nov-fila">{cuerpo}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'resumenes' && <PestanaResumenes onVer={verVentana} />}
      {tab === 'correos' && <PestanaCorreos />}
    </div>
  );
};

// ---------- Resúmenes (cortes de las 9:00 y 20:00) ----------

const PestanaResumenes = ({ onVer }) => {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_novedades_cortes', { p_limite: 60 });
    if (err) setError('No se pudo cargar el historial de resúmenes.');
    else { setLista(data || []); setError(''); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const generarAhora = async () => {
    setOcupado('generar'); setMensaje('');
    const { error: err } = await supabase.rpc('admin_novedades_generar_ahora');
    setOcupado('');
    if (err) { setMensaje(err.message || 'No se pudo generar.'); return; }
    setMensaje('Listo: se guardó un resumen con lo ocurrido desde el último corte.');
    cargar();
  };

  const enviarMail = async (r) => {
    if (!window.confirm('¿Enviar este resumen por mail a todos los destinatarios activos?')) return;
    setOcupado(r.id); setMensaje('');
    const { data, error: err } = await supabase.rpc('admin_novedades_reenviar', { p_id: r.id });
    if (err) { setOcupado(''); setMensaje(err.message || 'No se pudo preparar el envío.'); return; }
    try {
      const resp = await fetch(FUNCION_MAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumen_id: data?.id || r.id }),
      });
      const out = await resp.json().catch(() => ({}));
      setMensaje(resp.ok && out.ok ? `Mail enviado a ${out.enviados} ${out.enviados === 1 ? 'persona' : 'personas'}.` : (out.error || 'No se pudo enviar el mail.'));
    } catch {
      setMensaje('No se pudo conectar con el servicio de mails.');
    }
    setOcupado('');
    cargar();
  };

  return (
    <div className="nov-resumenes">
      <div className="nov-acciones">
        <p>
          Cada día a las <b>9:00</b> y a las <b>20:00</b> se guarda un resumen de lo ocurrido desde el corte anterior
          y se envía por mail a los destinatarios (solo si hubo novedades).
        </p>
        <button type="button" className="nov-btn" onClick={generarAhora} disabled={ocupado === 'generar'}>
          <span className="material-icons">bolt</span>
          {ocupado === 'generar' ? 'Generando…' : 'Generar resumen ahora'}
        </button>
      </div>

      {mensaje && <p className="nov-aviso">{mensaje}</p>}
      {error && <p className="nov-estado nov-error">{error}</p>}
      {!lista && !error && <p className="nov-estado">Cargando…</p>}
      {lista && lista.length === 0 && <p className="nov-vacio">Todavía no hay resúmenes. El primero se genera hoy a las 20:00.</p>}

      <ul className="nov-cortes">
        {(lista || []).map((r) => {
          const est = r.total === 0 ? { texto: 'Sin novedades', clase: 'gris' } : (ESTADO_MAIL[r.envio_estado] || ESTADO_MAIL.sin_envio);
          const puedeEnviar = r.total > 0 && !['pendiente', 'enviando'].includes(r.envio_estado);
          const porBloque = r.cifras?.por_bloque || {};
          return (
            <li key={r.id} className="nov-corte">
              <div className="nov-corte-cab">
                <div>
                  <strong>{NOMBRE_CORTE[r.corte] || 'Resumen'}</strong>
                  <small>{fmtDiaLargo(r.hasta)} · {fmtHora(r.desde)} → {fmtHora(r.hasta)}</small>
                </div>
                <span className={`nov-pill p-${est.clase}`}>
                  {est.texto}{r.envio_estado === 'enviado' && r.enviado_a ? ` (${r.enviado_a})` : ''}
                </span>
              </div>
              <div className="nov-corte-cifras">
                <span className="nov-total">{r.total} {r.total === 1 ? 'novedad' : 'novedades'}</span>
                {BLOQUES.filter((b) => porBloque[b.clave] > 0).map((b) => (
                  <span key={b.clave} className={`nov-chip c-${b.color}`}>{b.texto}: {porBloque[b.clave]}</span>
                ))}
              </div>
              {r.error_detalle && <small className="nov-error-detalle">{r.error_detalle}</small>}
              <div className="nov-corte-botones">
                <button type="button" className="nov-btn sec" onClick={() => onVer(r)}>
                  <span className="material-icons">visibility</span> Ver
                </button>
                {puedeEnviar && (
                  <button type="button" className="nov-btn sec" onClick={() => enviarMail(r)} disabled={ocupado === r.id}>
                    <span className="material-icons">send</span> {ocupado === r.id ? 'Enviando…' : r.envio_estado === 'enviado' ? 'Reenviar mail' : 'Enviar por mail'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ---------- Correos que reciben el resumen ----------

const traducirError = (err) => {
  const msg = err?.message || '';
  if (err?.code === '23505') return 'Ese correo ya está en la lista.';
  if (err?.code === '23514') return 'El correo no es válido.';
  if (msg.includes('Máximo 10')) return 'Se pueden cargar hasta 10 correos.';
  return 'No se pudo guardar. Probá de nuevo.';
};

const PestanaCorreos = () => {
  const [lista, setLista] = useState(null);
  const [activos, setActivos] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editando, setEditando] = useState(null); // { id, email, nombre }
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [dest, conf] = await Promise.all([
      supabase.from('novedades_destinatarios').select('id, email, nombre, activo').order('id'),
      supabase.rpc('admin_novedades_config'),
    ]);
    if (dest.error) setError('No se pudieron cargar los correos.');
    else { setLista(dest.data || []); setError(''); }
    if (!conf.error && conf.data) setActivos(conf.data.mails_activos !== false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async (ev) => {
    ev.preventDefault();
    setAviso('');
    const email = nuevoEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setAviso('Escribí un correo válido.'); return; }
    setGuardando(true);
    const { error: err } = await supabase
      .from('novedades_destinatarios')
      .insert({ email, nombre: limpiarTexto(nuevoNombre).trim() || null });
    setGuardando(false);
    if (err) { setAviso(traducirError(err)); return; }
    setNuevoEmail(''); setNuevoNombre('');
    setAviso('Correo agregado.');
    cargar();
  };

  const guardarEdicion = async () => {
    setAviso('');
    const email = editando.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setAviso('Escribí un correo válido.'); return; }
    setGuardando(true);
    const { error: err } = await supabase
      .from('novedades_destinatarios')
      .update({ email, nombre: limpiarTexto(editando.nombre || '').trim() || null })
      .eq('id', editando.id);
    setGuardando(false);
    if (err) { setAviso(traducirError(err)); return; }
    setEditando(null);
    setAviso('Cambios guardados.');
    cargar();
  };

  const alternar = async (d) => {
    setAviso('');
    const { error: err } = await supabase.from('novedades_destinatarios').update({ activo: !d.activo }).eq('id', d.id);
    if (err) setAviso(traducirError(err)); else cargar();
  };

  const quitar = async (d) => {
    if (!window.confirm(`¿Quitar ${d.email} de la lista? Dejará de recibir los resúmenes.`)) return;
    setAviso('');
    const { error: err } = await supabase.from('novedades_destinatarios').delete().eq('id', d.id);
    if (err) setAviso(traducirError(err)); else { setAviso('Correo quitado.'); cargar(); }
  };

  const cambiarInterruptor = async () => {
    const nuevo = !activos;
    setActivos(nuevo);
    const { error: err } = await supabase.rpc('admin_novedades_config_guardar', { p_mails_activos: nuevo });
    if (err) { setActivos(!nuevo); setAviso('No se pudo cambiar el envío automático.'); }
  };

  return (
    <div className="nov-correos">
      <div className="nov-interruptor">
        <div>
          <strong>Envío automático de resúmenes</strong>
          <small>
            A las 9:00 y a las 20:00, solo si hubo novedades. {activos ? 'Está activado.' : 'Está pausado: no se manda ningún mail.'}
          </small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activos}
          className={`nov-switch ${activos ? 'on' : ''}`}
          onClick={cambiarInterruptor}
        >
          <span />
        </button>
      </div>

      <form className="nov-form" onSubmit={agregar}>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={nuevoEmail}
          onChange={(e) => setNuevoEmail(e.target.value)}
          maxLength={254}
          required
        />
        <input
          type="text"
          placeholder="Nombre (opcional)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(limpiarTexto(e.target.value))}
          maxLength={60}
        />
        <button type="submit" className="nov-btn" disabled={guardando}>
          <span className="material-icons">person_add</span> Agregar
        </button>
      </form>

      {aviso && <p className="nov-aviso">{aviso}</p>}
      {error && <p className="nov-estado nov-error">{error}</p>}
      {!lista && !error && <p className="nov-estado">Cargando…</p>}
      {lista && lista.length === 0 && <p className="nov-vacio">No hay correos cargados: no se enviará ningún resumen.</p>}

      <ul className="nov-dest">
        {(lista || []).map((d) => (
          <li key={d.id} className={`nov-dest-fila ${d.activo ? '' : 'inactivo'}`}>
            {editando?.id === d.id ? (
              <>
                <div className="nov-dest-edit">
                  <input
                    type="email"
                    value={editando.email}
                    onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                    maxLength={254}
                  />
                  <input
                    type="text"
                    value={editando.nombre || ''}
                    placeholder="Nombre"
                    onChange={(e) => setEditando({ ...editando, nombre: limpiarTexto(e.target.value) })}
                    maxLength={60}
                  />
                </div>
                <div className="nov-dest-botones">
                  <button type="button" className="nov-btn" onClick={guardarEdicion} disabled={guardando}>Guardar</button>
                  <button type="button" className="nov-btn sec" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div className="nov-dest-datos">
                  <div className="nov-avatar">{(d.nombre || d.email).charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{d.nombre || 'Sin nombre'}</strong>
                    <span>{d.email}</span>
                  </div>
                </div>
                <div className="nov-dest-botones">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={d.activo}
                    className={`nov-switch chico ${d.activo ? 'on' : ''}`}
                    onClick={() => alternar(d)}
                    title={d.activo ? 'Recibe los resúmenes' : 'Pausado'}
                  >
                    <span />
                  </button>
                  <button type="button" className="nov-icono-btn" onClick={() => setEditando({ id: d.id, email: d.email, nombre: d.nombre || '' })} title="Editar">
                    <span className="material-icons">edit</span>
                  </button>
                  <button type="button" className="nov-icono-btn peligro" onClick={() => quitar(d)} title="Quitar">
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="nov-nota">Podés cargar hasta 10 correos. Cada uno recibe el mismo resumen.</p>
    </div>
  );
};

export default NovedadesAdmin;
