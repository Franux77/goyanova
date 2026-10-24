// src/components/panel/admin/ServiciosAdmin.jsx — Publicaciones (admin)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { analizarWhatsapp, enlaceWhatsapp } from '../../../utils/whatsapp';
import Loading from '../../loading/Loading';
import { Modal, useAvisos, hace, fechaCorta, normalizarTexto } from './adminComun';

const MOTIVO_GENERAL =
  'Motivo de suspensión de su servicio fue por incumplimiento de normativas de la web y servicios a la comunidad.';

const MOTIVOS = [
  'La publicación está en una categoría que no corresponde.',
  'La información o las fotos no corresponden a un servicio real.',
  'Recibimos reportes de la comunidad sobre esta publicación.',
  'El número de WhatsApp no funciona. Actualizalo para volver a aparecer.',
  MOTIVO_GENERAL,
];

const ORDENES = {
  nuevos: { titulo: 'Más nuevos', fn: (a, b) => new Date(b.creado_en) - new Date(a.creado_en) },
  viejos: { titulo: 'Más viejos', fn: (a, b) => new Date(a.creado_en) - new Date(b.creado_en) },
  nombre: { titulo: 'A → Z', fn: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
  rating: { titulo: 'Mejor calificados', fn: (a, b) => (b.rating_promedio || 0) - (a.rating_promedio || 0) },
};

// Qué le falta o qué está mal en una publicación
const problemasDe = (s) => {
  const lista = [];
  if (!s.contacto_whatsapp) lista.push({ clave: 'wsp', texto: 'Sin WhatsApp', grave: true });
  else if (!analizarWhatsapp(s.contacto_whatsapp).valido)
    lista.push({ clave: 'wsp', texto: 'WhatsApp con problemas', grave: true });
  if (!s.foto_portada) lista.push({ clave: 'foto', texto: 'Sin foto' });
  if ((s.reportes_acumulados || 0) > 0)
    lista.push({ clave: 'reportes', texto: `${s.reportes_acumulados} ${s.reportes_acumulados === 1 ? 'reporte' : 'reportes'}`, grave: true });
  if (s.oculto_por_reportes) lista.push({ clave: 'oculto', texto: 'Oculto por reportes', grave: true });
  return lista;
};

const ServiciosAdmin = () => {
  const navigate = useNavigate();
  const { avisar, Avisos } = useAvisos();
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [orden, setOrden] = useState('nuevos');
  const [mostrar, setMostrar] = useState(20);
  const [suspendiendo, setSuspendiendo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    const [{ data, error: err }, { data: suspensiones }] = await Promise.all([
      supabase
        .from('servicios')
        .select(`
          id, nombre, estado, tipo, suspendido_por, categoria_id, usuario_id, creado_en,
          foto_portada, contacto_whatsapp, es_premium, badge_texto, rating_promedio,
          reportes_acumulados, oculto_por_reportes,
          categorias(nombre, icon, color),
          perfiles_usuarios(nombre, apellido, email)
        `)
        .order('creado_en', { ascending: false }),
      supabase.from('suspensiones').select('entidad_id, motivo').eq('entidad', 'servicio'),
    ]);

    if (err) {
      setError('No se pudieron cargar las publicaciones.');
      setCargando(false);
      return;
    }

    const idsSuspendidos = new Set((suspensiones || []).map((x) => x.entidad_id));
    setServicios(
      (data || []).map((s) => {
        const duenio = s.perfiles_usuarios || {};
        return {
          ...s,
          categoria: s.categorias?.nombre || 'Sin categoría',
          categoriaIcono: s.categorias?.icon || 'category',
          categoriaColor: s.categorias?.color || '#64748b',
          duenio: `${duenio.nombre || ''} ${duenio.apellido || ''}`.trim() || duenio.email || 'Sin dueño',
          emailDuenio: duenio.email || '',
          estado: idsSuspendidos.has(s.id) ? 'suspendido' : s.estado || 'activo',
          motivoSuspension: (suspensiones || []).find((x) => x.entidad_id === s.id)?.motivo || null,
        };
      })
    );
    setError('');
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setMostrar(20);
  }, [busqueda, estado, tipo, soloProblemas, orden]);

  const conProblemas = useMemo(() => servicios.map((s) => ({ ...s, problemas: problemasDe(s) })), [servicios]);

  const resumen = useMemo(
    () => ({
      total: servicios.length,
      activos: servicios.filter((s) => s.estado === 'activo').length,
      suspendidos: servicios.filter((s) => s.estado === 'suspendido').length,
      premium: servicios.filter((s) => s.es_premium).length,
      problemas: conProblemas.filter((s) => s.problemas.length > 0).length,
    }),
    [servicios, conProblemas]
  );

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return conProblemas
      .filter((s) => estado === 'todos' || (estado === 'premium' ? s.es_premium : s.estado === estado))
      .filter((s) => tipo === 'todos' || s.tipo === tipo)
      .filter((s) => !soloProblemas || s.problemas.length > 0)
      .filter((s) => !q || normalizarTexto(`${s.nombre} ${s.duenio} ${s.emailDuenio} ${s.categoria}`).includes(q))
      .sort(ORDENES[orden].fn);
  }, [conProblemas, busqueda, estado, tipo, soloProblemas, orden]);

  const hayFiltros = busqueda || estado !== 'todos' || tipo !== 'todos' || soloProblemas;
  const limpiar = () => {
    setBusqueda('');
    setEstado('todos');
    setTipo('todos');
    setSoloProblemas(false);
  };

  // ---------- Acciones (misma lógica de antes) ----------
  const confirmarSuspension = async () => {
    const s = suspendiendo;
    setTrabajando(true);
    const motivoFinal = motivo.trim() || MOTIVO_GENERAL;
    const { error: e1 } = await supabase
      .from('servicios')
      .update({ estado: 'suspendido', suspendido_por: 'admin' })
      .eq('id', s.id);
    const { error: e2 } = e1
      ? { error: e1 }
      : await supabase
          .from('suspensiones')
          .insert([{ entidad: 'servicio', entidad_id: s.id, motivo: motivoFinal, fecha: new Date().toISOString() }]);
    setTrabajando(false);
    if (e1 || e2) {
      avisar('No se pudo suspender', 'error');
      return;
    }
    setSuspendiendo(null);
    avisar(`"${s.nombre}" quedó suspendida`);
    cargar();
  };

  const reactivar = async (s) => {
    setTrabajando(true);
    const { error: e1 } = await supabase
      .from('servicios')
      .update({ estado: 'activo', suspendido_por: null })
      .eq('id', s.id);
    if (!e1) {
      await supabase.from('suspensiones').delete().eq('entidad', 'servicio').eq('entidad_id', s.id);
    }
    setTrabajando(false);
    if (e1) {
      avisar('No se pudo reactivar', 'error');
      return;
    }
    avisar(`"${s.nombre}" está activa de nuevo`);
    cargar();
  };

  const confirmarEliminar = async () => {
    const s = eliminando;
    setTrabajando(true);
    const { error: err } = await supabase.from('servicios').delete().eq('id', s.id);
    setTrabajando(false);
    if (err) {
      avisar(`No se pudo eliminar: ${err.message}`, 'error');
      return;
    }
    setEliminando(null);
    setServicios((prev) => prev.filter((x) => x.id !== s.id));
    avisar(`"${s.nombre}" eliminada`);
  };

  if (cargando) return <Loading message="Cargando publicaciones..." />;

  const visibles = filtrados.slice(0, mostrar);

  return (
    <section className="adm">
      <header className="adm-cabecera">
        <div>
          <h2>Publicaciones</h2>
          <p>Revisá, editá o suspendé lo que se publica en GoyaNova.</p>
        </div>
        <div className="adm-cabecera-acciones">
          <button type="button" className="adm-boton-sec" onClick={cargar}>
            <span className="material-icons">refresh</span>
            Actualizar
          </button>
        </div>
      </header>

      <div className="adm-resumen">
        <button type="button" className={`adm-dato ${!hayFiltros ? 'activo' : ''}`} onClick={limpiar}>
          <strong>{resumen.total}</strong>
          <span>En total</span>
        </button>
        <button type="button" className={`adm-dato ${estado === 'activo' ? 'activo' : ''}`} onClick={() => setEstado('activo')}>
          <strong>{resumen.activos}</strong>
          <span>Activas</span>
        </button>
        <button type="button" className={`adm-dato ${estado === 'suspendido' ? 'activo' : ''}`} onClick={() => setEstado('suspendido')}>
          <strong>{resumen.suspendidos}</strong>
          <span>Suspendidas</span>
        </button>
        <button type="button" className={`adm-dato ${estado === 'premium' ? 'activo' : ''}`} onClick={() => setEstado('premium')}>
          <strong>{resumen.premium}</strong>
          <span>Con plan</span>
        </button>
        {resumen.problemas > 0 && (
          <button type="button" className={`adm-dato alerta ${soloProblemas ? 'activo' : ''}`} onClick={() => setSoloProblemas((v) => !v)}>
            <strong>{resumen.problemas}</strong>
            <span>Para revisar</span>
          </button>
        )}
      </div>

      <div className="adm-herramientas">
        <div className="adm-buscador">
          <span className="material-icons">search</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por publicación, dueño, email o categoría…"
            aria-label="Buscar publicaciones"
          />
        </div>
        <div className="adm-filtros">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
            <option value="todos">Oficios y negocios</option>
            <option value="servicio">Solo oficios</option>
            <option value="producto">Solo negocios</option>
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="todos">Cualquier estado</option>
            <option value="activo">Activas</option>
            <option value="suspendido">Suspendidas</option>
            <option value="premium">Con plan</option>
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Orden">
            {Object.entries(ORDENES).map(([v, o]) => <option key={v} value={v}>{o.titulo}</option>)}
          </select>
        </div>
        {hayFiltros && (
          <div className="adm-info-filtro">
            <span>{filtrados.length} {filtrados.length === 1 ? 'publicación' : 'publicaciones'}</span>
            <button type="button" className="adm-link" onClick={limpiar}>Quitar filtros</button>
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
          <span className="material-icons">inventory_2</span>
          <p>{servicios.length === 0 ? 'Todavía no hay publicaciones.' : 'No hay publicaciones con estos filtros.'}</p>
        </div>
      ) : (
        <>
          <ul className="adm-lista">
            {visibles.map((s) => {
              const suspendida = s.estado === 'suspendido';
              const wsp = s.contacto_whatsapp ? enlaceWhatsapp(s.contacto_whatsapp, `Hola ${s.duenio.split(' ')[0]}, te escribimos de GoyaNova por tu publicación "${s.nombre}".`) : null;
              return (
                <li key={s.id} className={`adm-tarjeta ${suspendida ? 'apagada' : ''}`}>
                  <div className="adm-tarjeta-principal">
                    {s.foto_portada ? (
                      <img src={s.foto_portada} alt="" className="adm-foto" loading="lazy" />
                    ) : (
                      <span className="adm-foto adm-foto-vacia" style={{ background: s.categoriaColor }}>
                        <span className="material-icons">{s.categoriaIcono}</span>
                      </span>
                    )}
                    <div className="adm-cuerpo">
                      <div className="adm-titulo-fila">
                        <h3>{s.nombre}</h3>
                        <span className={`adm-etiqueta ${suspendida ? 'e-rojo' : 'e-verde'}`}>
                          {suspendida ? 'Suspendida' : 'Activa'}
                        </span>
                        {s.es_premium && (
                          <span className="adm-etiqueta e-violeta">
                            <span className="material-icons">workspace_premium</span>
                            {s.badge_texto || 'Plan'}
                          </span>
                        )}
                      </div>
                      <div className="adm-meta">
                        <span className="adm-cat" style={{ color: s.categoriaColor }}>
                          <span className="material-icons">{s.categoriaIcono}</span>
                          {s.categoria}
                        </span>
                        <span className={`adm-etiqueta ${s.tipo === 'producto' ? 'e-naranja' : 'e-azul'}`}>
                          {s.tipo === 'producto' ? 'Negocio' : 'Oficio'}
                        </span>
                      </div>
                      <div className="adm-meta">
                        <span><span className="material-icons">person</span>{s.duenio}</span>
                        <span title={fechaCorta(s.creado_en)}><span className="material-icons">schedule</span>{hace(s.creado_en)}</span>
                        {s.rating_promedio > 0 && (
                          <span><span className="material-icons" style={{ color: '#f5b301' }}>star</span>{Number(s.rating_promedio).toFixed(1)}</span>
                        )}
                      </div>
                      {s.problemas.length > 0 && (
                        <div className="adm-avisos">
                          {s.problemas.map((p) => (
                            <span key={p.clave} className={`adm-aviso ${p.grave ? 'rojo' : ''}`}>
                              <span className="material-icons">{p.grave ? 'error' : 'info'}</span>
                              {p.texto}
                            </span>
                          ))}
                        </div>
                      )}
                      {suspendida && s.motivoSuspension && <p className="adm-motivo">{s.motivoSuspension}</p>}
                    </div>
                  </div>
                  <div className="adm-acciones">
                    <Link to={`/perfil/${s.id}`} className="adm-accion">
                      <span className="material-icons">visibility</span>
                      <span className="adm-accion-texto">Ver</span>
                    </Link>
                    <button type="button" className="adm-accion" onClick={() => navigate(`/panel/admin/publicar/${s.id}`)}>
                      <span className="material-icons">edit</span>
                      <span className="adm-accion-texto">Editar</span>
                    </button>
                    {wsp && (
                      <a href={wsp} target="_blank" rel="noopener noreferrer" className="adm-accion verde">
                        <span className="material-icons">chat</span>
                        <span className="adm-accion-texto">Escribirle</span>
                      </a>
                    )}
                    {suspendida ? (
                      <button type="button" className="adm-accion verde" onClick={() => reactivar(s)} disabled={trabajando}>
                        <span className="material-icons">check_circle</span>
                        <span className="adm-accion-texto">Reactivar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-accion ambar"
                        onClick={() => { setSuspendiendo(s); setMotivo(''); }}
                      >
                        <span className="material-icons">block</span>
                        <span className="adm-accion-texto">Suspender</span>
                      </button>
                    )}
                    <button type="button" className="adm-accion rojo" onClick={() => setEliminando(s)} aria-label={`Eliminar ${s.nombre}`}>
                      <span className="material-icons">delete</span>
                    </button>
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

      {suspendiendo && (
        <Modal
          titulo={`Suspender "${suspendiendo.nombre}"`}
          subtitulo="Deja de aparecer en GoyaNova hasta que la reactives."
          onCerrar={() => setSuspendiendo(null)}
          pie={
            <>
              <button type="button" className="adm-boton-sec" onClick={() => setSuspendiendo(null)}>Cancelar</button>
              <button type="button" className="adm-boton-peligro" onClick={confirmarSuspension} disabled={trabajando}>
                <span className="material-icons">block</span>
                {trabajando ? 'Suspendiendo…' : 'Suspender'}
              </button>
            </>
          }
        >
          <div className="adm-campo">
            <span>Motivos frecuentes</span>
            <div className="adm-motivos">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" onClick={() => setMotivo(m)}>{m}</button>
              ))}
            </div>
          </div>
          <div className="adm-campo">
            <label htmlFor="adm-motivo">Motivo que va a ver el dueño</label>
            <textarea id="adm-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 400))} placeholder="Si lo dejás vacío, se usa el motivo general." />
          </div>
        </Modal>
      )}

      {eliminando && (
        <Modal
          titulo={`Eliminar "${eliminando.nombre}"`}
          subtitulo={`De ${eliminando.duenio}`}
          onCerrar={() => setEliminando(null)}
          pie={
            <>
              {eliminando.estado !== 'suspendido' && (
                <button type="button" className="adm-boton-sec" onClick={() => { setSuspendiendo(eliminando); setMotivo(''); setEliminando(null); }}>
                  Suspender en vez de borrar
                </button>
              )}
              <button type="button" className="adm-boton-peligro" onClick={confirmarEliminar} disabled={trabajando}>
                <span className="material-icons">delete</span>
                {trabajando ? 'Eliminando…' : 'Eliminar para siempre'}
              </button>
            </>
          }
        >
          <p className="adm-alerta-texto">
            La publicación se borra de GoyaNova. <strong>No se puede deshacer.</strong> Si es algo que se puede corregir, mejor suspendela.
          </p>
        </Modal>
      )}

      <Avisos />
    </section>
  );
};

export default ServiciosAdmin;
