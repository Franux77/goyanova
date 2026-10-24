// UsuariosAdmin.jsx — Usuarios (admin)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import { analizarWhatsapp, enlaceWhatsapp } from '../../../utils/whatsapp';
import Loading from '../../loading/Loading';
import { Modal, useAvisos, hace, fechaCorta, normalizarTexto } from './adminComun';

const DIA = 24 * 60 * 60 * 1000;

const FILTROS = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'publican', texto: 'Publican' },
  { clave: 'sinPublicar', texto: 'No publicaron' },
  { clave: 'nuevos', texto: 'Nuevos (7 días)' },
  { clave: 'inactivos', texto: 'Sin entrar hace 30 días' },
  { clave: 'suspendidos', texto: 'Suspendidos' },
  { clave: 'admin', texto: 'Admins' },
];

const ORDENES = {
  nuevos: { titulo: 'Registro más nuevo', fn: (a, b) => new Date(b.creado_en) - new Date(a.creado_en) },
  viejos: { titulo: 'Registro más viejo', fn: (a, b) => new Date(a.creado_en) - new Date(b.creado_en) },
  actividad: { titulo: 'Última vez que entró', fn: (a, b) => new Date(b.ultima_actividad || 0) - new Date(a.ultima_actividad || 0) },
  nombre: { titulo: 'A → Z', fn: (a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es') },
  publicaciones: { titulo: 'Más publicaciones', fn: (a, b) => b.publicaciones.length - a.publicaciones.length },
};

const MOTIVOS = [
  'Publicaciones falsas o engañosas.',
  'Uso indebido de la plataforma o spam.',
  'Trato inapropiado hacia otros usuarios.',
  'Varias publicaciones reportadas por la comunidad.',
];

const iniciales = (nombre) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const UsuariosAdmin = () => {
  const { user } = useAuth();
  const { avisar, Avisos } = useAvisos();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [orden, setOrden] = useState('nuevos');
  const [mostrar, setMostrar] = useState(20);
  const [abierto, setAbierto] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [suspendiendo, setSuspendiendo] = useState(null);
  const [tipoSusp, setTipoSusp] = useState('temporal');
  const [diasSusp, setDiasSusp] = useState(7);
  const [motivoSusp, setMotivoSusp] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [u, s, sp] = await Promise.all([
        supabase.from('perfiles_usuarios').select('*').order('creado_en', { ascending: false }),
        supabase.from('servicios').select('id, nombre, usuario_id, estado, categorias(nombre)'),
        supabase.from('suspensiones').select('*').eq('activa', true).order('fecha_inicio', { ascending: false }),
      ]);
      if (u.error) throw u.error;
      if (s.error) throw s.error;
      if (sp.error) throw sp.error;

      const susp = (sp.data || []).filter((x) => x.entidad === 'usuario' && x.activa);
      setUsuarios(
        (u.data || []).map((p) => {
          const publicaciones = (s.data || []).filter((x) => x.usuario_id === p.id);
          const suspension = susp.find((x) => x.entidad_id?.toString() === p.id?.toString()) || null;
          const esAdmin = p.rol === 'admin';
          return {
            ...p,
            nombreCompleto: `${p.nombre || ''} ${p.apellido || ''}`.trim() || p.email || 'Sin nombre',
            publicaciones,
            rol: esAdmin ? 'admin' : publicaciones.length ? 'prestador' : 'cliente',
            suspendido: !!suspension,
            suspension,
          };
        })
      );
      setError('');
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setMostrar(20);
  }, [busqueda, filtro, orden]);

  const [ahora] = useState(() => Date.now());
  const cumple = useCallback(
    (u, clave) => {
      switch (clave) {
        case 'publican': return u.publicaciones.length > 0;
        case 'sinPublicar': return u.publicaciones.length === 0 && u.rol !== 'admin';
        case 'nuevos': return u.creado_en && ahora - new Date(u.creado_en).getTime() < 7 * DIA;
        case 'inactivos': return !u.ultima_actividad || ahora - new Date(u.ultima_actividad).getTime() > 30 * DIA;
        case 'suspendidos': return u.suspendido;
        case 'admin': return u.rol === 'admin';
        default: return true;
      }
    },
    [ahora]
  );

  const conteo = useMemo(() => {
    const c = {};
    FILTROS.forEach((f) => { c[f.clave] = usuarios.filter((u) => cumple(u, f.clave)).length; });
    return c;
  }, [usuarios, cumple]);

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return usuarios
      .filter((u) => cumple(u, filtro))
      .filter((u) => !q || normalizarTexto(`${u.nombreCompleto} ${u.email} ${u.telefono || ''} ${u.publicaciones.map((p) => p.nombre).join(' ')}`).includes(q))
      .sort(ORDENES[orden].fn);
  }, [usuarios, busqueda, filtro, orden, cumple]);

  const copiarEmails = async () => {
    const emails = filtrados.map((u) => u.email).filter(Boolean);
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      avisar(`${emails.length} ${emails.length === 1 ? 'mail copiado' : 'mails copiados'}`);
    } catch {
      avisar('No se pudieron copiar los mails', 'error');
    }
  };

  // ---------- Acciones (misma lógica de antes) ----------
  const abrirEdicion = (u) => {
    setEditando(u);
    setForm({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', telefono: u.telefono || '' });
  };

  const guardarEdicion = async () => {
    setTrabajando(true);
    const { error: err } = await supabase.from('perfiles_usuarios').update(form).eq('id', editando.id);
    setTrabajando(false);
    if (err) {
      avisar('No se pudo guardar', 'error');
      return;
    }
    setEditando(null);
    avisar('Datos actualizados');
    cargar();
  };

  const abrirSuspension = (u) => {
    setSuspendiendo(u);
    setTipoSusp('temporal');
    setDiasSusp(7);
    setMotivoSusp('');
  };

  const confirmarSuspension = async () => {
    if (!motivoSusp.trim()) {
      avisar('Escribí el motivo de la suspensión', 'error');
      return;
    }
    const u = suspendiendo;
    setTrabajando(true);
    try {
      const inicio = new Date();
      const dias = tipoSusp === 'temporal' ? parseInt(diasSusp, 10) || 7 : null;
      const fin = dias ? new Date(inicio.getTime() + dias * DIA) : null;

      const { error: e1 } = await supabase.from('suspensiones').insert([{
        entidad: 'usuario',
        entidad_id: u.id,
        motivo: motivoSusp.trim(),
        tipo_suspension: tipoSusp,
        dias_suspension: dias,
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin ? fin.toISOString() : null,
        activa: true,
        creado_por: user?.id || null,
      }]);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('perfiles_usuarios').update({ estado: 'suspendido' }).eq('id', u.id);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('servicios').update({ estado: 'suspendido', suspendido_por: 'admin' }).eq('usuario_id', u.id);
      if (e3) throw e3;

      setSuspendiendo(null);
      avisar(`${u.nombreCompleto} quedó suspendido`);
      cargar();
    } catch (err) {
      console.error('Error al suspender usuario:', err);
      avisar('No se pudo suspender', 'error');
    } finally {
      setTrabajando(false);
    }
  };

  const reactivar = async (u) => {
    setTrabajando(true);
    try {
      const { error: e1 } = await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('entidad', 'usuario')
        .eq('entidad_id', u.id)
        .eq('activa', true);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('perfiles_usuarios').update({ estado: 'activo' }).eq('id', u.id);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('servicios').update({ estado: 'activo', suspendido_por: null }).eq('usuario_id', u.id);
      if (e3) throw e3;
      avisar(`${u.nombreCompleto} está activo de nuevo`);
      cargar();
    } catch (err) {
      console.error('Error reactivando usuario:', err);
      avisar('No se pudo reactivar', 'error');
    } finally {
      setTrabajando(false);
    }
  };

  const confirmarEliminar = async () => {
    const u = eliminando;
    setTrabajando(true);
    try {
      const { data, error: err } = await supabase.rpc('eliminar_usuario_completo', { p_usuario_id: u.id });
      if (err) throw err;
      if (!data?.success) throw new Error(data?.error || 'Error desconocido');
      setEliminando(null);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      avisar(`${u.nombreCompleto} eliminado (${data.datos_eliminados?.servicios || 0} publicaciones)`);
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      avisar(`No se pudo eliminar: ${err.message}`, 'error');
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) return <Loading message="Cargando usuarios..." />;

  const visibles = filtrados.slice(0, mostrar);

  return (
    <section className="adm">
      <header className="adm-cabecera">
        <div>
          <h2>Usuarios</h2>
          <p>Quiénes se registraron, qué publicaron y cuándo entraron por última vez.</p>
        </div>
        <div className="adm-cabecera-acciones">
          <button type="button" className="adm-boton-sec" onClick={copiarEmails} disabled={!filtrados.length}>
            <span className="material-icons">content_copy</span>
            Copiar mails ({filtrados.length})
          </button>
        </div>
      </header>

      <div className="adm-resumen">
        <button type="button" className={`adm-dato ${filtro === 'todos' ? 'activo' : ''}`} onClick={() => setFiltro('todos')}>
          <strong>{usuarios.length}</strong>
          <span>Registrados</span>
        </button>
        <button type="button" className={`adm-dato ${filtro === 'publican' ? 'activo' : ''}`} onClick={() => setFiltro('publican')}>
          <strong>{conteo.publican}</strong>
          <span>Publican</span>
        </button>
        <button type="button" className={`adm-dato alerta ${filtro === 'sinPublicar' ? 'activo' : ''}`} onClick={() => setFiltro('sinPublicar')}>
          <strong>{conteo.sinPublicar}</strong>
          <span>No publicaron</span>
        </button>
        <button type="button" className={`adm-dato ${filtro === 'nuevos' ? 'activo' : ''}`} onClick={() => setFiltro('nuevos')}>
          <strong>{conteo.nuevos}</strong>
          <span>Nuevos esta semana</span>
        </button>
      </div>

      <div className="adm-herramientas">
        <div className="adm-buscador">
          <span className="material-icons">search</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, mail, teléfono o publicación…"
            aria-label="Buscar usuarios"
          />
        </div>
        <div className="adm-chips" role="group" aria-label="Filtrar usuarios">
          {FILTROS.map((f) => (
            <button key={f.clave} type="button" className={filtro === f.clave ? 'activo' : ''} onClick={() => setFiltro(f.clave)}>
              {f.texto} <b>{conteo[f.clave]}</b>
            </button>
          ))}
        </div>
        <div className="adm-filtros">
          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Orden">
            {Object.entries(ORDENES).map(([v, o]) => <option key={v} value={v}>Orden: {o.titulo}</option>)}
          </select>
        </div>
        {(busqueda || filtro !== 'todos') && (
          <div className="adm-info-filtro">
            <span>{filtrados.length} {filtrados.length === 1 ? 'usuario' : 'usuarios'}</span>
            <button type="button" className="adm-link" onClick={() => { setBusqueda(''); setFiltro('todos'); }}>Quitar filtros</button>
          </div>
        )}
      </div>

      {error ? (
        <div className="adm-vacio">
          <span className="material-icons">cloud_off</span>
          <p>{error}</p>
          <button type="button" className="adm-boton" onClick={cargar}>Reintentar</button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="adm-vacio">
          <span className="material-icons">person_search</span>
          <p>No hay usuarios con estos filtros.</p>
        </div>
      ) : (
        <>
          <ul className="adm-lista">
            {visibles.map((u) => {
              const tel = u.telefono ? analizarWhatsapp(u.telefono) : null;
              const wsp = tel?.valido ? enlaceWhatsapp(tel.numero, `Hola ${u.nombre || ''}, te escribimos de GoyaNova.`) : null;
              const verDetalle = abierto === u.id;
              return (
                <li key={u.id} className={`adm-tarjeta ${u.suspendido ? 'apagada' : ''}`}>
                  <div className="adm-tarjeta-principal">
                    {u.foto_url ? (
                      <img src={u.foto_url} alt="" className="adm-avatar" loading="lazy" />
                    ) : (
                      <span className="adm-avatar" aria-hidden="true">{iniciales(u.nombreCompleto)}</span>
                    )}
                    <div className="adm-cuerpo">
                      <div className="adm-titulo-fila">
                        <h3>{u.nombreCompleto}</h3>
                        {u.rol === 'admin' && <span className="adm-etiqueta e-violeta">Admin</span>}
                        {u.rol === 'prestador' && <span className="adm-etiqueta e-azul">Publica</span>}
                        {u.rol === 'cliente' && <span className="adm-etiqueta e-gris">No publicó</span>}
                        {u.identidad_verificada && (
                          <span className="adm-etiqueta e-verde"><span className="material-icons">verified</span>Verificado</span>
                        )}
                        {u.suspendido && <span className="adm-etiqueta e-rojo">Suspendido</span>}
                      </div>
                      <div className="adm-meta">
                        <span><span className="material-icons">mail</span>{u.email}</span>
                      </div>
                      <div className="adm-meta">
                        <span title={fechaCorta(u.creado_en)}><span className="material-icons">person_add</span>Se registró {hace(u.creado_en)}</span>
                        <span><span className="material-icons">login</span>Entró {hace(u.ultima_actividad)}</span>
                        {u.publicaciones.length > 0 && (
                          <span><span className="material-icons">storefront</span>{u.publicaciones.length} {u.publicaciones.length === 1 ? 'publicación' : 'publicaciones'}</span>
                        )}
                      </div>
                      {u.suspendido && u.suspension && (
                        <p className="adm-motivo">
                          {u.suspension.tipo_suspension === 'temporal'
                            ? `Suspensión de ${u.suspension.dias_suspension} días (hasta ${fechaCorta(u.suspension.fecha_fin)})`
                            : 'Suspensión permanente'}
                          {u.suspension.motivo ? ` · ${u.suspension.motivo}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {verDetalle && (
                    <div className="adm-detalle">
                      <div className="adm-detalle-grilla">
                        <div><small>Teléfono</small>{u.telefono || '—'}</div>
                        <div><small>Edad</small>{u.edad || '—'}</div>
                        <div><small>Registro</small>{fechaCorta(u.creado_en)}</div>
                        <div><small>Última actividad</small>{fechaCorta(u.ultima_actividad)}</div>
                      </div>
                      <h4>Publicaciones</h4>
                      {u.publicaciones.length === 0 ? (
                        <p style={{ fontSize: '0.86rem', color: '#64748b' }}>Todavía no publicó nada.</p>
                      ) : (
                        <ul className="adm-mini-lista">
                          {u.publicaciones.map((p) => (
                            <li key={p.id}>
                              <Link to={`/perfil/${p.id}`}>
                                <span className="material-icons">storefront</span>
                                <span>{p.nombre}</span>
                                <span className={`adm-etiqueta ${p.estado === 'activo' ? 'e-verde' : 'e-rojo'}`}>
                                  {p.estado === 'activo' ? 'Activa' : 'Suspendida'}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="adm-acciones">
                    <button type="button" className="adm-accion" onClick={() => setAbierto(verDetalle ? null : u.id)} aria-expanded={verDetalle}>
                      <span className="material-icons">{verDetalle ? 'expand_less' : 'expand_more'}</span>
                      <span className="adm-accion-texto">{verDetalle ? 'Menos' : 'Ver más'}</span>
                    </button>
                    {wsp && (
                      <a href={wsp} target="_blank" rel="noopener noreferrer" className="adm-accion verde">
                        <span className="material-icons">chat</span>
                        <span className="adm-accion-texto">WhatsApp</span>
                      </a>
                    )}
                    {u.email && (
                      <a href={`mailto:${u.email}`} className="adm-accion">
                        <span className="material-icons">mail</span>
                        <span className="adm-accion-texto">Mail</span>
                      </a>
                    )}
                    <button type="button" className="adm-accion" onClick={() => abrirEdicion(u)}>
                      <span className="material-icons">edit</span>
                      <span className="adm-accion-texto">Editar</span>
                    </button>
                    {u.rol !== 'admin' && (u.suspendido ? (
                      <button type="button" className="adm-accion verde" onClick={() => reactivar(u)} disabled={trabajando}>
                        <span className="material-icons">check_circle</span>
                        <span className="adm-accion-texto">Reactivar</span>
                      </button>
                    ) : (
                      <button type="button" className="adm-accion ambar" onClick={() => abrirSuspension(u)}>
                        <span className="material-icons">block</span>
                        <span className="adm-accion-texto">Suspender</span>
                      </button>
                    ))}
                    {u.rol !== 'admin' && (
                      <button type="button" className="adm-accion rojo" onClick={() => { setEliminando(u); setConfirmacion(''); }} aria-label={`Eliminar a ${u.nombreCompleto}`}>
                        <span className="material-icons">delete</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {visibles.length < filtrados.length && (
            <button type="button" className="adm-mas" onClick={() => setMostrar((m) => m + 20)}>
              Ver más ({filtrados.length - visibles.length})
            </button>
          )}
        </>
      )}

      {editando && (
        <Modal
          titulo="Editar datos"
          subtitulo={editando.nombreCompleto}
          onCerrar={() => setEditando(null)}
          pie={
            <>
              <button type="button" className="adm-boton-sec" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="button" className="adm-boton" onClick={guardarEdicion} disabled={trabajando}>
                <span className="material-icons">save</span>
                {trabajando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          <div className="adm-dos-col">
            <div className="adm-campo">
              <label htmlFor="ua-nombre">Nombre</label>
              <input id="ua-nombre" type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="adm-campo">
              <label htmlFor="ua-apellido">Apellido</label>
              <input id="ua-apellido" type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
            </div>
          </div>
          <div className="adm-campo">
            <label htmlFor="ua-email">Mail</label>
            <input id="ua-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <small>Cambia el mail que se muestra en el perfil, no el de inicio de sesión.</small>
          </div>
          <div className="adm-campo">
            <label htmlFor="ua-tel">Teléfono</label>
            <input id="ua-tel" type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
        </Modal>
      )}

      {suspendiendo && (
        <Modal
          titulo={`Suspender a ${suspendiendo.nombreCompleto}`}
          subtitulo={`Sus ${suspendiendo.publicaciones.length} publicaciones también dejan de verse.`}
          onCerrar={() => setSuspendiendo(null)}
          pie={
            <>
              <button type="button" className="adm-boton-sec" onClick={() => setSuspendiendo(null)}>Cancelar</button>
              <button type="button" className="adm-boton-peligro" onClick={confirmarSuspension} disabled={trabajando || !motivoSusp.trim()}>
                <span className="material-icons">block</span>
                {trabajando ? 'Suspendiendo…' : 'Suspender'}
              </button>
            </>
          }
        >
          <div className="adm-campo">
            <span>¿Por cuánto tiempo?</span>
            <div className="adm-opciones">
              {[3, 7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={tipoSusp === 'temporal' && Number(diasSusp) === d ? 'activo' : ''}
                  onClick={() => { setTipoSusp('temporal'); setDiasSusp(d); }}
                >
                  {d} días
                </button>
              ))}
              <button type="button" className={tipoSusp === 'permanente' ? 'activo' : ''} onClick={() => setTipoSusp('permanente')}>
                Sin fecha de fin
              </button>
            </div>
            {tipoSusp === 'temporal' && (
              <small>
                Otra cantidad:{' '}
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={diasSusp}
                  onChange={(e) => setDiasSusp(e.target.value)}
                  style={{ width: 90, minHeight: 34, padding: '4px 8px', display: 'inline-block' }}
                  aria-label="Días de suspensión"
                />{' '}
                días
              </small>
            )}
          </div>
          <div className="adm-campo">
            <span>Motivos frecuentes</span>
            <div className="adm-motivos">
              {MOTIVOS.map((m) => <button key={m} type="button" onClick={() => setMotivoSusp(m)}>{m}</button>)}
            </div>
          </div>
          <div className="adm-campo">
            <label htmlFor="ua-motivo">Motivo (obligatorio)</label>
            <textarea id="ua-motivo" value={motivoSusp} onChange={(e) => setMotivoSusp(e.target.value.slice(0, 400))} placeholder="Escribí por qué se suspende…" />
          </div>
        </Modal>
      )}

      {eliminando && (
        <Modal
          titulo={`Eliminar a ${eliminando.nombreCompleto}`}
          subtitulo={eliminando.email}
          onCerrar={() => setEliminando(null)}
          pie={
            <>
              {!eliminando.suspendido && (
                <button type="button" className="adm-boton-sec" onClick={() => { abrirSuspension(eliminando); setEliminando(null); }}>
                  Suspender en vez de borrar
                </button>
              )}
              <button type="button" className="adm-boton-peligro" onClick={confirmarEliminar} disabled={trabajando || confirmacion.trim().toUpperCase() !== 'ELIMINAR'}>
                <span className="material-icons">delete_forever</span>
                {trabajando ? 'Eliminando…' : 'Eliminar para siempre'}
              </button>
            </>
          }
        >
          <div className="adm-alerta-texto">
            <strong>Esto no se puede deshacer.</strong> Se borra:
            <ul>
              <li>Su cuenta (ya no puede entrar)</li>
              <li>Sus {eliminando.publicaciones.length} publicaciones</li>
              <li>Sus membresías, opiniones y notificaciones</li>
            </ul>
          </div>
          <div className="adm-campo">
            <label htmlFor="ua-confirmar">Para confirmar, escribí <strong>ELIMINAR</strong></label>
            <input id="ua-confirmar" type="text" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" />
          </div>
        </Modal>
      )}

      <Avisos />
    </section>
  );
};

export default UsuariosAdmin;
