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

export const diaArgentina = (fecha = new Date()) =>
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

export const BLOQUES = [
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

// ---------- agrupar eventos ----------

const bandaDelDia = (iso) => {
  const h = horaDe(iso);
  if (h < 9) return { orden: 0, texto: 'Hasta las 9:00 (resumen de la mañana)' };
  if (h < 20) return { orden: 1, texto: 'De 9:00 a 20:00 (resumen de la noche)' };
  return { orden: 2, texto: 'Después de las 20:00 (va en el resumen de mañana 9:00)' };
};

const agrupar = (eventos, modo) => {
  const grupos = new Map();
  eventos.forEach((e) => {
    let clave;
    let texto;
    let orden;
    if (modo === 'dia') {
      const b = bandaDelDia(e.fecha);
      clave = `b${b.orden}`;
      texto = b.texto;
      orden = -b.orden; // lo más reciente primero
    } else {
      clave = diaArgentina(e.fecha);
      texto = fmtDiaLargo(e.fecha);
      orden = -inicioDia(clave).getTime();
    }
    if (!grupos.has(clave)) grupos.set(clave, { clave, texto, orden, items: [] });
    grupos.get(clave).items.push(e);
  });
  return [...grupos.values()].sort((a, b) => a.orden - b.orden);
};

// ---------- pantalla ----------

const NovedadesAdmin = () => {
  const [tab, setTab] = useState('novedades'); // novedades | resumenes | correos
  const [dia, setDia] = useState(diaArgentina());
  const [modo, setModo] = useState('dia'); // dia | semana | ventana
  const [ventana, setVentana] = useState(null); // { desde, hasta, texto } al venir de un resumen
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroBloque, setFiltroBloque] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 80;

  const rango = useMemo(() => {
    if (modo === 'ventana' && ventana) return { desde: new Date(ventana.desde), hasta: new Date(ventana.hasta) };
    if (modo === 'semana') {
      const hasta = new Date();
      return { desde: new Date(hasta.getTime() - 7 * DIA_MS), hasta };
    }
    const desde = inicioDia(dia);
    return { desde, hasta: new Date(desde.getTime() + DIA_MS) };
  }, [modo, dia, ventana]);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_novedades', {
      p_desde: rango.desde.toISOString(),
      p_hasta: rango.hasta.toISOString(),
    });
    if (err) {
      setError('No se pudieron cargar las novedades.');
    } else {
      setDatos(data);
      setError('');
    }
    setCargando(false);
  }, [rango]);

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

  const eventos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos?.eventos || []).filter(
      (e) =>
        (filtroBloque === 'todos' || e.bloque === filtroBloque) &&
        (!q || `${e.titulo || ''} ${e.detalle || ''} ${e.actor || ''}`.toLowerCase().includes(q))
    );
  }, [datos, filtroBloque, busqueda]);

  const visibles = eventos.slice(0, pagina * POR_PAGINA);
  const grupos = useMemo(() => agrupar(visibles, modo === 'dia' ? 'dia' : 'semana'), [visibles, modo]);
  const hoy = diaArgentina();

  const irADia = (d) => { setModo('dia'); setVentana(null); setDia(d); };

  const tituloRango = () => {
    if (modo === 'ventana' && ventana) return ventana.texto;
    if (modo === 'semana') return 'Últimos 7 días';
    if (dia === hoy) return 'Hoy';
    if (dia === sumarDias(hoy, -1)) return 'Ayer';
    if (dia === sumarDias(hoy, -2)) return 'Anteayer';
    return fmtDiaLargo(inicioDia(dia));
  };

  const verVentana = (r) => {
    setVentana({
      desde: r.desde,
      hasta: r.hasta,
      texto: `${NOMBRE_CORTE[r.corte] || 'Resumen'} · ${fmtDiaCorto(r.desde)} ${fmtHora(r.desde)} → ${fmtDiaCorto(r.hasta)} ${fmtHora(r.hasta)}`,
    });
    setModo('ventana');
    setTab('novedades');
  };

  return (
    <div className="nov-admin">
      <header className="nov-cab">
        <div>
          <h1>Novedades</h1>
          <p>Todo lo que pasa en GoyaNova en un solo lugar: usuarios, servicios, reseñas, soporte, moderación y pagos.</p>
        </div>
        <button type="button" className="nov-refrescar" onClick={cargar} title="Actualizar">
          <span className="material-icons">refresh</span>
        </button>
      </header>

      <div className="nov-tabs" role="tablist">
        {[
          ['novedades', 'Novedades', 'newspaper'],
          ['resumenes', 'Resúmenes', 'history'],
          ['correos', 'Correos', 'forward_to_inbox'],
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
          <div className="nov-fechas">
            <div className="nov-atajos">
              <button type="button" className={modo === 'dia' && dia === hoy ? 'sel' : ''} onClick={() => irADia(hoy)}>Hoy</button>
              <button type="button" className={modo === 'dia' && dia === sumarDias(hoy, -1) ? 'sel' : ''} onClick={() => irADia(sumarDias(hoy, -1))}>Ayer</button>
              <button type="button" className={modo === 'dia' && dia === sumarDias(hoy, -2) ? 'sel' : ''} onClick={() => irADia(sumarDias(hoy, -2))}>Anteayer</button>
              <button type="button" className={modo === 'semana' ? 'sel' : ''} onClick={() => { setModo('semana'); setVentana(null); }}>7 días</button>
            </div>
            <div className="nov-selector">
              <button type="button" onClick={() => irADia(sumarDias(dia, -1))} aria-label="Día anterior">
                <span className="material-icons">chevron_left</span>
              </button>
              <input
                type="date"
                value={dia}
                max={hoy}
                onChange={(e) => e.target.value && irADia(e.target.value)}
                aria-label="Elegir fecha"
              />
              <button type="button" onClick={() => irADia(sumarDias(dia, 1))} disabled={dia >= hoy} aria-label="Día siguiente">
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>

          <h2 className="nov-titulo-rango">
            {tituloRango()}
            {modo === 'dia' && <small>{fmtDiaLargo(inicioDia(dia))}</small>}
          </h2>

          {cargando && <p className="nov-estado">Cargando…</p>}
          {error && <p className="nov-estado nov-error">{error}</p>}

          {datos && (
            <>
              {Array.isArray(datos.alertas) && datos.alertas.length > 0 && (
                <div className="nov-alertas">
                  <strong><span className="material-icons">warning_amber</span> Para atender</strong>
                  <ul>
                    {datos.alertas.map((a) => (
                      <li key={a.clave}>
                        <Link to={a.ruta}>{a.texto}: <b>{a.cantidad}</b></Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="nov-tarjetas">
                <button
                  type="button"
                  className={`nov-tarjeta c-gris ${filtroBloque === 'todos' ? 'sel' : ''}`}
                  onClick={() => setFiltroBloque('todos')}
                >
                  <span className="material-icons">dashboard</span>
                  <strong>{datos.total}</strong>
                  <span className="t">Todo</span>
                </button>
                {BLOQUES.map((b) => (
                  <button
                    key={b.clave}
                    type="button"
                    className={`nov-tarjeta c-${b.color} ${filtroBloque === b.clave ? 'sel' : ''}`}
                    onClick={() => setFiltroBloque(filtroBloque === b.clave ? 'todos' : b.clave)}
                  >
                    <span className="material-icons">{b.icono}</span>
                    <strong>{datos.por_bloque?.[b.clave] || 0}</strong>
                    <span className="t">{b.texto}</span>
                  </button>
                ))}
              </div>

              <input
                type="search"
                className="nov-buscar"
                placeholder="Buscar por usuario, servicio o texto…"
                value={busqueda}
                onChange={(e) => setBusqueda(limpiarTexto(e.target.value))}
              />

              {datos.truncado && (
                <p className="nov-nota">Hay muchísimas novedades en este período: se muestran las 1500 más recientes.</p>
              )}

              {grupos.map((g) => (
                <section key={g.clave} className="nov-grupo">
                  <h3>{g.texto}<span>{g.items.length}</span></h3>
                  <ul className="nov-lista">
                    {g.items.map((e, i) => {
                      const bloque = BLOQUES.find((b) => b.clave === e.bloque);
                      const enlace = enlaceDe(e);
                      return (
                        <li key={`${e.tipo}-${e.ref_id}-${e.fecha}-${i}`} className="nov-fila">
                          <span className={`nov-icono c-${bloque?.color || 'gris'}`}>
                            <span className="material-icons">{ICONO_TIPO[e.tipo] || 'notifications'}</span>
                          </span>
                          <div className="nov-datos">
                            <strong>{e.titulo}</strong>
                            {e.detalle && <span className="nov-detalle">{e.detalle}</span>}
                            {e.actor && <small>Por {e.actor}</small>}
                          </div>
                          <div className="nov-cuando">
                            <strong>{fmtHora(e.fecha)}</strong>
                            <small>{fmtDiaCorto(e.fecha)}</small>
                            {enlace && <Link to={enlace} className="nov-ver">Ver</Link>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {!cargando && eventos.length === 0 && (
                <p className="nov-vacio">No hay novedades en este período{filtroBloque !== 'todos' || busqueda ? ' con ese filtro' : ''}.</p>
              )}

              {visibles.length < eventos.length && (
                <button type="button" className="nov-mas" onClick={() => setPagina((p) => p + 1)}>
                  Ver más ({eventos.length - visibles.length} restantes)
                </button>
              )}
            </>
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
