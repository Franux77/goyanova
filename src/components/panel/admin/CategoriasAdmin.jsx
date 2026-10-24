// CategoriasAdmin.jsx — Panel de categorías (admin)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading';
import FormCategoria from './categorias/FormCategoria';
import { ModalEliminar, ModalGrupos } from './categorias/ModalesCategorias';
import { NOMBRE_TIPO, iconoSeVeEnMapa, normalizar } from './categorias/utilsCategorias';
import { prepararCategorias, buscarCategorias } from '../../publicar/utils/categoriasSugeridas';
import './categorias/CategoriasPanel.css';

const NUEVA = {
  id: null,
  nombre: '',
  descripcion: '',
  tipo: 'servicio',
  grupo: null,
  color: '#1774f6',
  icon: '',
  iconType: 'icons',
  activa: true,
};

const ORDENES = {
  nombre: { titulo: 'A → Z', fn: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
  publicaciones: { titulo: 'Más publicaciones', fn: (a, b, c) => (c[b.id]?.total || 0) - (c[a.id]?.total || 0) },
};

const CategoriasAdmin = () => {
  const [categorias, setCategorias] = useState([]);
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [fuentesListas, setFuentesListas] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todas');
  const [estado, setEstado] = useState('activas');
  const [grupo, setGrupo] = useState('');
  const [orden, setOrden] = useState('nombre');
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [soloVacias, setSoloVacias] = useState(false);
  const [gruposCerrados, setGruposCerrados] = useState({});

  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [viendoGrupos, setViendoGrupos] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const idAviso = useRef(0);

  // ---------- Avisos (en lugar de alert) ----------
  const avisar = useCallback((texto, tipoAviso = 'ok') => {
    idAviso.current += 1;
    const id = idAviso.current;
    setAvisos((a) => [...a, { id, texto, tipo: tipoAviso }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4200);
  }, []);

  // ---------- Carga ----------
  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    const [cats, servs] = await Promise.all([
      supabase.from('categorias').select('id, nombre, descripcion, tipo, estado, color, icon, icontype, grupo'),
      supabase.from('servicios').select('categoria_id, estado'),
    ]);
    if (cats.error) {
      setErrorCarga('No pudimos cargar las categorías. Probá de nuevo.');
      setCargando(false);
      return;
    }
    setCategorias(
      (cats.data || []).map((c) => ({
        ...c,
        grupo: c.grupo?.trim() || null,
        activa: c.estado === 'activa',
        iconType: c.icontype || 'icons',
      }))
    );
    const cuenta = {};
    (servs.data || []).forEach((s) => {
      if (!s.categoria_id) return;
      if (!cuenta[s.categoria_id]) cuenta[s.categoria_id] = { total: 0, activas: 0 };
      cuenta[s.categoria_id].total += 1;
      if (s.estado === 'activo') cuenta[s.categoria_id].activas += 1;
    });
    setConteos(cuenta);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    // Los íconos se revisan cuando la fuente ya cargó (si no, todos parecen rotos)
    document.fonts?.load('24px "Material Icons"').then(() => setFuentesListas(true)).catch(() => setFuentesListas(true));
  }, [cargar]);

  // ---------- Problemas a revisar ----------
  const problemasDe = useCallback(
    (c) => {
      const lista = [];
      if (fuentesListas && c.icon && !iconoSeVeEnMapa(c.icon)) lista.push('El ícono no se ve en el mapa');
      if (!c.icon) lista.push('Sin ícono');
      if (!c.grupo) lista.push('Sin grupo');
      return lista;
    },
    [fuentesListas]
  );

  // ---------- Filtros ----------
  const preparadas = useMemo(() => prepararCategorias(categorias), [categorias]);

  const gruposDisponibles = useMemo(() => {
    const set = new Set(categorias.filter((c) => tipo === 'todas' || c.tipo === tipo).map((c) => c.grupo || 'Sin grupo'));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [categorias, tipo]);

  const filtradas = useMemo(() => {
    let lista = categorias;
    if (tipo !== 'todas') lista = lista.filter((c) => c.tipo === tipo);
    if (estado === 'activas') lista = lista.filter((c) => c.activa);
    if (estado === 'suspendidas') lista = lista.filter((c) => !c.activa);
    if (grupo) lista = lista.filter((c) => (c.grupo || 'Sin grupo') === grupo);
    if (soloProblemas) lista = lista.filter((c) => problemasDe(c).length > 0);
    if (soloVacias) lista = lista.filter((c) => !conteos[c.id]?.activas);

    const q = normalizar(busqueda);
    if (q.length >= 2) {
      // Por nombre/grupo y también por palabras que usa la gente ("pasto" → Cortador de pasto)
      const porSinonimo = new Set(buscarCategorias(busqueda, preparadas, 30).map((c) => c.id));
      lista = lista.filter((c) => normalizar(`${c.nombre} ${c.grupo || ''} ${c.descripcion || ''}`).includes(q) || porSinonimo.has(c.id));
    }
    return [...lista].sort((a, b) => ORDENES[orden].fn(a, b, conteos));
  }, [categorias, tipo, estado, grupo, soloProblemas, soloVacias, busqueda, preparadas, orden, conteos, problemasDe]);

  const porGrupo = useMemo(() => {
    const mapa = {};
    filtradas.forEach((c) => {
      const clave = `${c.tipo}|${c.grupo || 'Sin grupo'}`;
      if (!mapa[clave]) mapa[clave] = { tipo: c.tipo, grupo: c.grupo || 'Sin grupo', cats: [] };
      mapa[clave].cats.push(c);
    });
    return Object.values(mapa).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.grupo.localeCompare(b.grupo, 'es'));
  }, [filtradas]);

  const resumen = useMemo(() => {
    const activas = categorias.filter((c) => c.activa);
    return {
      activas: activas.length,
      oficios: activas.filter((c) => c.tipo === 'servicio').length,
      negocios: activas.filter((c) => c.tipo === 'producto').length,
      vacias: activas.filter((c) => !conteos[c.id]?.activas).length,
      suspendidas: categorias.length - activas.length,
      problemas: activas.filter((c) => problemasDe(c).length > 0).length,
    };
  }, [categorias, conteos, problemasDe]);

  const hayFiltros = busqueda || tipo !== 'todas' || estado !== 'activas' || grupo || soloProblemas || soloVacias;
  const limpiarFiltros = () => {
    setBusqueda('');
    setTipo('todas');
    setEstado('activas');
    setGrupo('');
    setSoloProblemas(false);
    setSoloVacias(false);
  };

  // ---------- Acciones ----------
  const cambiarEstado = async (cat, activar) => {
    setTrabajando(true);
    const { error } = await supabase
      .from('categorias')
      .update({ estado: activar ? 'activa' : 'suspendida' })
      .eq('id', cat.id);
    setTrabajando(false);
    if (error) {
      avisar('No se pudo cambiar el estado', 'error');
      return false;
    }
    setCategorias((prev) => prev.map((c) => (c.id === cat.id ? { ...c, activa: activar, estado: activar ? 'activa' : 'suspendida' } : c)));
    avisar(activar ? `"${cat.nombre}" está activa de nuevo` : `"${cat.nombre}" quedó suspendida (ya no aparece al publicar)`);
    return true;
  };

  const guardar = async (datos) => {
    setTrabajando(true);
    const fila = {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      tipo: datos.tipo,
      grupo: datos.grupo.trim(),
      color: datos.color,
      icon: datos.icon,
      icontype: datos.iconType || 'icons',
    };

    if (datos.id) {
      const anterior = categorias.find((c) => c.id === datos.id);
      const { error } = await supabase.from('categorias').update(fila).eq('id', datos.id);
      if (error) {
        setTrabajando(false);
        avisar('No se pudieron guardar los cambios', 'error');
        return;
      }
      // Si cambió de Oficios a Negocios (o al revés), sus publicaciones también
      if (anterior && anterior.tipo !== datos.tipo) {
        const { error: errTipo } = await supabase.from('servicios').update({ tipo: datos.tipo }).eq('categoria_id', datos.id);
        if (errTipo) avisar('La categoría se guardó, pero no se pudo cambiar el tipo de sus publicaciones', 'error');
      }
      setCategorias((prev) => prev.map((c) => (c.id === datos.id ? { ...c, ...fila, iconType: fila.icontype } : c)));
      avisar(`"${datos.nombre}" actualizada`);
    } else {
      const { data, error } = await supabase.from('categorias').insert([{ ...fila, estado: 'activa' }]).select();
      if (error || !data?.[0]) {
        setTrabajando(false);
        avisar('No se pudo crear la categoría', 'error');
        return;
      }
      setCategorias((prev) => [...prev, { ...data[0], activa: true, iconType: data[0].icontype || 'icons' }]);
      avisar(`"${datos.nombre}" creada`);
    }
    setTrabajando(false);
    setEditando(null);
  };

  const eliminar = async (destino) => {
    const cat = eliminando;
    setTrabajando(true);
    if (destino) {
      const { error } = await supabase
        .from('servicios')
        .update({ categoria_id: destino.id, tipo: destino.tipo })
        .eq('categoria_id', cat.id);
      if (error) {
        setTrabajando(false);
        avisar('No se pudieron mover las publicaciones. No se borró nada.', 'error');
        return;
      }
    }
    const { error } = await supabase.from('categorias').delete().eq('id', cat.id);
    setTrabajando(false);
    if (error) {
      avisar(destino ? 'Las publicaciones se movieron, pero la categoría no se pudo borrar' : 'No se pudo borrar', 'error');
      cargar();
      return;
    }
    setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
    if (destino) {
      setConteos((prev) => {
        const sig = { ...prev };
        const movidas = prev[cat.id] || { total: 0, activas: 0 };
        const actual = prev[destino.id] || { total: 0, activas: 0 };
        sig[destino.id] = { total: actual.total + movidas.total, activas: actual.activas + movidas.activas };
        delete sig[cat.id];
        return sig;
      });
    }
    avisar(destino ? `Publicaciones pasadas a "${destino.nombre}" y categoría borrada` : `"${cat.nombre}" borrada`);
    setEliminando(null);
  };

  const renombrarGrupo = async (tipoGrupo, viejo, nuevo) => {
    setTrabajando(true);
    const { error } = await supabase.from('categorias').update({ grupo: nuevo }).eq('tipo', tipoGrupo).eq('grupo', viejo);
    setTrabajando(false);
    if (error) {
      avisar('No se pudo renombrar el grupo', 'error');
      return;
    }
    setCategorias((prev) => prev.map((c) => (c.tipo === tipoGrupo && c.grupo === viejo ? { ...c, grupo: nuevo } : c)));
    if (grupo === viejo) setGrupo(nuevo);
    avisar(`Grupo "${viejo}" ahora se llama "${nuevo}"`);
  };

  const alternarGrupo = (clave) => setGruposCerrados((g) => ({ ...g, [clave]: !g[clave] }));

  // ---------- Vista ----------
  return (
    <section className="cat-panel">
      <header className="cat-panel-cabecera">
        <div>
          <h2>Categorías</h2>
          <p>Lo que la gente elige al publicar y lo que ve al buscar.</p>
        </div>
        <div className="cat-panel-acciones">
          <button type="button" className="cat-boton-sec" onClick={() => setViendoGrupos(true)}>
            <span className="material-icons">folder</span>
            Grupos
          </button>
          <button type="button" className="cat-boton" onClick={() => setEditando({ ...NUEVA })}>
            <span className="material-icons">add</span>
            Nueva categoría
          </button>
        </div>
      </header>

      {/* Resumen */}
      <div className="cat-resumen">
        <button type="button" className={`cat-dato ${!hayFiltros ? 'activo' : ''}`} onClick={limpiarFiltros}>
          <strong>{resumen.activas}</strong>
          <span>Activas</span>
        </button>
        <button type="button" className={`cat-dato ${tipo === 'servicio' ? 'activo' : ''}`} onClick={() => setTipo('servicio')}>
          <strong>{resumen.oficios}</strong>
          <span>Oficios</span>
        </button>
        <button type="button" className={`cat-dato ${tipo === 'producto' ? 'activo' : ''}`} onClick={() => setTipo('producto')}>
          <strong>{resumen.negocios}</strong>
          <span>Negocios</span>
        </button>
        <button type="button" className={`cat-dato ${soloVacias ? 'activo' : ''}`} onClick={() => setSoloVacias((v) => !v)}>
          <strong>{resumen.vacias}</strong>
          <span>Sin publicaciones</span>
        </button>
        <button type="button" className={`cat-dato ${estado === 'suspendidas' ? 'activo' : ''}`} onClick={() => setEstado('suspendidas')}>
          <strong>{resumen.suspendidas}</strong>
          <span>Suspendidas</span>
        </button>
        {resumen.problemas > 0 && (
          <button type="button" className={`cat-dato cat-dato-alerta ${soloProblemas ? 'activo' : ''}`} onClick={() => setSoloProblemas(true)}>
            <strong>{resumen.problemas}</strong>
            <span>Para revisar</span>
          </button>
        )}
      </div>

      {/* Herramientas */}
      <div className="cat-herramientas">
        <div className="cat-buscador cat-buscador-grande">
          <span className="material-icons">search</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscá: golosinas, pasto, uñas… (también por palabras parecidas)"
            aria-label="Buscar categoría"
          />
        </div>
        <div className="cat-filtros">
          <div className="cat-segmento" role="group" aria-label="Tipo">
            {[['todas', 'Todas'], ['servicio', 'Oficios'], ['producto', 'Negocios']].map(([v, t]) => (
              <button key={v} type="button" className={tipo === v ? 'activo' : ''} onClick={() => { setTipo(v); setGrupo(''); }}>
                {t}
              </button>
            ))}
          </div>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo">
            <option value="">Todos los grupos</option>
            {gruposDisponibles.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="activas">Activas</option>
            <option value="suspendidas">Suspendidas</option>
            <option value="todas">Activas y suspendidas</option>
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Orden">
            {Object.entries(ORDENES).map(([v, o]) => <option key={v} value={v}>{o.titulo}</option>)}
          </select>
        </div>
        {hayFiltros && (
          <p className="cat-filtro-info">
            {filtradas.length} {filtradas.length === 1 ? 'categoría' : 'categorías'}
            {soloProblemas && ' para revisar'}
            {soloVacias && ' sin publicaciones'}
            <button type="button" className="cat-link-inline" onClick={limpiarFiltros}>Quitar filtros</button>
          </p>
        )}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="cat-cargando"><Loading message="Cargando categorías..." /></div>
      ) : errorCarga ? (
        <div className="cat-vacio">
          <span className="material-icons">cloud_off</span>
          <p>{errorCarga}</p>
          <button type="button" className="cat-boton" onClick={cargar}>Reintentar</button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="cat-vacio">
          <span className="material-icons">search_off</span>
          <p>{busqueda ? `No hay ninguna categoría parecida a "${busqueda}".` : 'No hay categorías con estos filtros.'}</p>
          {busqueda && (
            <button type="button" className="cat-boton" onClick={() => setEditando({ ...NUEVA, nombre: busqueda.charAt(0).toUpperCase() + busqueda.slice(1) })}>
              <span className="material-icons">add</span>
              Crear "{busqueda}"
            </button>
          )}
        </div>
      ) : (
        <div className="cat-grupos">
          {porGrupo.map(({ tipo: t, grupo: g, cats }) => {
            const clave = `${t}|${g}`;
            const cerrado = gruposCerrados[clave];
            return (
              <section key={clave} className="cat-grupo">
                <button type="button" className="cat-grupo-cabecera" onClick={() => alternarGrupo(clave)} aria-expanded={!cerrado}>
                  <span className="material-icons cat-grupo-flecha">{cerrado ? 'chevron_right' : 'expand_more'}</span>
                  <strong>{g}</strong>
                  <span className={`cat-etiqueta cat-etiqueta-${t}`}>{NOMBRE_TIPO[t]}</span>
                  <span className="cat-grupo-cantidad">{cats.length}</span>
                </button>
                {!cerrado && (
                  <ul className="cat-filas">
                    {cats.map((c) => {
                      const n = conteos[c.id]?.activas || 0;
                      const problemas = problemasDe(c);
                      return (
                        <li key={c.id} className={`cat-filas-item ${c.activa ? '' : 'suspendida'}`}>
                          <button type="button" className="cat-filas-principal" onClick={() => setEditando({ ...c })}>
                            <span className="cat-icono-redondo" style={{ background: c.color || '#64748b' }}>
                              <span className={c.iconType === 'symbols' ? 'material-symbols-outlined' : 'material-icons'}>{c.icon || 'category'}</span>
                            </span>
                            <span className="cat-filas-textos">
                              <strong>{c.nombre}</strong>
                              <small>
                                {n === 0 ? 'Sin publicaciones' : n === 1 ? '1 publicación' : `${n} publicaciones`}
                                {!c.activa && <em className="cat-estado-susp"> · Suspendida</em>}
                              </small>
                              {problemas.length > 0 && (
                                <span className="cat-problema">
                                  <span className="material-icons">warning</span>
                                  {problemas.join(' · ')}
                                </span>
                              )}
                            </span>
                          </button>
                          <div className="cat-filas-acciones">
                            <button type="button" className="cat-icono-boton" onClick={() => setEditando({ ...c })} title="Editar" aria-label={`Editar ${c.nombre}`}>
                              <span className="material-icons">edit</span>
                            </button>
                            <button
                              type="button"
                              className="cat-icono-boton"
                              onClick={() => cambiarEstado(c, !c.activa)}
                              disabled={trabajando}
                              title={c.activa ? 'Suspender' : 'Reactivar'}
                              aria-label={c.activa ? `Suspender ${c.nombre}` : `Reactivar ${c.nombre}`}
                            >
                              <span className="material-icons">{c.activa ? 'visibility_off' : 'visibility'}</span>
                            </button>
                            <button type="button" className="cat-icono-boton cat-peligro" onClick={() => setEliminando(c)} title="Eliminar" aria-label={`Eliminar ${c.nombre}`}>
                              <span className="material-icons">delete</span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editando && (
        <FormCategoria
          key={editando.id || 'nueva'}
          inicial={editando}
          categorias={categorias}
          conteos={conteos}
          guardando={trabajando}
          onGuardar={guardar}
          onCerrar={() => setEditando(null)}
          onEditarOtra={(c) => setEditando({ ...c })}
          onReactivar={async (c) => {
            if (await cambiarEstado(c, true)) setEditando({ ...c, activa: true });
          }}
        />
      )}

      {eliminando && (
        <ModalEliminar
          cat={eliminando}
          categorias={categorias}
          publicaciones={conteos[eliminando.id]?.total || 0}
          trabajando={trabajando}
          onConfirmar={eliminar}
          onSuspender={async () => {
            if (await cambiarEstado(eliminando, false)) setEliminando(null);
          }}
          onCerrar={() => setEliminando(null)}
        />
      )}

      {viendoGrupos && (
        <ModalGrupos categorias={categorias} trabajando={trabajando} onRenombrar={renombrarGrupo} onCerrar={() => setViendoGrupos(false)} />
      )}

      <div className="cat-avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`cat-aviso-flotante ${a.tipo}`}>
            <span className="material-icons">{a.tipo === 'error' ? 'error' : 'check_circle'}</span>
            {a.texto}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoriasAdmin;
