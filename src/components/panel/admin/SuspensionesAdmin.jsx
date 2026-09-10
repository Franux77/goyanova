import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import Loading from '../../loading/Loading';
import './SuspensionesAdmin.css';

const TIPOS_ENTIDAD = [
  { key: 'usuario', label: 'Usuarios', icon: 'person' },
  { key: 'servicio', label: 'Servicios', icon: 'work' },
  { key: 'categoria', label: 'Categorías', icon: 'category' }
];

const SuspensionesAdmin = () => {
  const { user } = useAuth();
  const [tabEntidad, setTabEntidad] = useState('usuario');
  const [suspensiones, setSuspensiones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [tipoSuspension, setTipoSuspension] = useState('temporal');
  const [diasSuspension, setDiasSuspension] = useState(7);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarSuspensiones();
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabEntidad]);

  const resetForm = () => {
    setMostrarForm(false);
    setBusqueda('');
    setResultados([]);
    setSeleccionado(null);
    setMotivo('');
    setTipoSuspension('temporal');
    setDiasSuspension(7);
  };

  const cargarSuspensiones = async () => {
    setLoading(true);
    try {
      const { data: susp } = await supabase
        .from('suspensiones')
        .select('*')
        .eq('entidad', tabEntidad)
        .order('fecha', { ascending: false });

      const lista = susp || [];
      const ids = [...new Set(lista.map(s => s.entidad_id))];

      let nombres = {};
      if (ids.length > 0) {
        if (tabEntidad === 'usuario') {
          const { data } = await supabase
            .from('perfiles_usuarios')
            .select('id, nombre, apellido, email')
            .in('id', ids);
          data?.forEach(u => { nombres[u.id] = `${u.nombre} ${u.apellido}`; });
        } else if (tabEntidad === 'servicio') {
          const { data } = await supabase
            .from('servicios')
            .select('id, nombre')
            .in('id', ids);
          data?.forEach(s => { nombres[s.id] = s.nombre; });
        } else if (tabEntidad === 'categoria') {
          const { data } = await supabase
            .from('categorias')
            .select('id, nombre')
            .in('id', ids);
          data?.forEach(c => { nombres[c.id] = c.nombre; });
        }
      }

      setSuspensiones(lista.map(s => ({ ...s, nombre_entidad: nombres[s.entidad_id] || 'Desconocido' })));
    } catch (err) {
      console.error('Error al cargar suspensiones:', err);
    } finally {
      setLoading(false);
    }
  };

  const buscarEntidad = async (texto) => {
    setBusqueda(texto);
    setSeleccionado(null);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      if (tabEntidad === 'usuario') {
        const { data } = await supabase
          .from('perfiles_usuarios')
          .select('id, nombre, apellido, email, estado')
          .or(`nombre.ilike.%${texto}%,apellido.ilike.%${texto}%,email.ilike.%${texto}%`)
          .limit(8);
        setResultados((data || []).map(u => ({ id: u.id, label: `${u.nombre} ${u.apellido}`, sub: u.email, estado: u.estado })));
      } else if (tabEntidad === 'servicio') {
        const { data } = await supabase
          .from('servicios')
          .select('id, nombre, estado')
          .ilike('nombre', `%${texto}%`)
          .limit(8);
        setResultados((data || []).map(s => ({ id: s.id, label: s.nombre, sub: s.estado, estado: s.estado })));
      } else {
        const { data } = await supabase
          .from('categorias')
          .select('id, nombre, estado')
          .ilike('nombre', `%${texto}%`)
          .limit(8);
        setResultados((data || []).map(c => ({ id: c.id, label: c.nombre, sub: c.estado, estado: c.estado })));
      }
    } catch (err) {
      console.error('Error al buscar:', err);
    } finally {
      setBuscando(false);
    }
  };

  const aplicarSancion = async () => {
    if (!seleccionado || !motivo.trim()) return;
    setGuardando(true);
    try {
      const fechaFin = tipoSuspension === 'temporal'
        ? new Date(Date.now() + diasSuspension * 86400000).toISOString()
        : null;

      await supabase.from('suspensiones').insert({
        entidad: tabEntidad,
        entidad_id: seleccionado.id,
        motivo: motivo.trim(),
        tipo_suspension: tipoSuspension,
        dias_suspension: tipoSuspension === 'temporal' ? diasSuspension : null,
        fecha_fin: fechaFin,
        activa: tipoSuspension !== 'advertencia',
        creado_por: user.id
      });

      // Actualizar estado en la tabla de la entidad (solo si no es advertencia)
      if (tipoSuspension !== 'advertencia') {
        if (tabEntidad === 'usuario') {
          await supabase.from('perfiles_usuarios').update({ estado: 'suspendido' }).eq('id', seleccionado.id);
        } else if (tabEntidad === 'servicio') {
          await supabase.from('servicios').update({
            estado: 'suspendido',
            motivo_suspension: motivo.trim(),
            suspendido_por: user.id
          }).eq('id', seleccionado.id);
        } else if (tabEntidad === 'categoria') {
          await supabase.from('categorias').update({ estado: 'suspendida' }).eq('id', seleccionado.id);
        }
      }

      resetForm();
      cargarSuspensiones();
    } catch (err) {
      console.error('Error al aplicar sanción:', err);
      alert('Error al aplicar la sanción');
    } finally {
      setGuardando(false);
    }
  };

  const levantarSancion = async (susp) => {
    if (!window.confirm('¿Levantar esta sanción y reactivar?')) return;
    try {
      await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('id', susp.id);

      if (tabEntidad === 'usuario') {
        await supabase.from('perfiles_usuarios').update({ estado: 'activo' }).eq('id', susp.entidad_id);
      } else if (tabEntidad === 'servicio') {
        await supabase.from('servicios').update({
          estado: 'activo',
          motivo_suspension: null,
          suspendido_por: null
        }).eq('id', susp.entidad_id);
      } else if (tabEntidad === 'categoria') {
        await supabase.from('categorias').update({ estado: 'activa' }).eq('id', susp.entidad_id);
      }

      cargarSuspensiones();
    } catch (err) {
      console.error('Error al levantar sanción:', err);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading && suspensiones.length === 0) {
    return <Loading message="Cargando sanciones..." />;
  }

  const activas = suspensiones.filter(s => s.activa);
  const historial = suspensiones.filter(s => !s.activa);

  return (
    <div className="susp-admin">
      <div className="susp-header">
        <h1>Sanciones y Suspensiones</h1>
        <p>Gestioná suspensiones de usuarios, servicios y categorías</p>
      </div>

      <div className="susp-tabs">
        {TIPOS_ENTIDAD.map(t => (
          <button
            key={t.key}
            className={`susp-tab-btn ${tabEntidad === t.key ? 'active' : ''}`}
            onClick={() => setTabEntidad(t.key)}
          >
            <span className="material-icons">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <button className="susp-nueva-btn" onClick={() => setMostrarForm(!mostrarForm)}>
        <span className="material-icons">{mostrarForm ? 'close' : 'add'}</span>
        {mostrarForm ? 'Cancelar' : 'Nueva sanción'}
      </button>

      {mostrarForm && (
        <div className="susp-form">
          <div className="susp-form-campo">
            <label>Buscar {tabEntidad}</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => buscarEntidad(e.target.value)}
              placeholder={`Nombre${tabEntidad === 'usuario' ? ' o email' : ''}...`}
            />
            {buscando && <span className="susp-buscando">Buscando...</span>}
            {resultados.length > 0 && !seleccionado && (
              <div className="susp-resultados">
                {resultados.map(r => (
                  <button key={r.id} className="susp-resultado-item" onClick={() => { setSeleccionado(r); setResultados([]); setBusqueda(r.label); }}>
                    <strong>{r.label}</strong>
                    <span>{r.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {seleccionado && (
            <>
              <div className="susp-seleccionado">
                <span className="material-icons">check_circle</span>
                Seleccionado: <strong>{seleccionado.label}</strong>
              </div>

              <div className="susp-form-campo">
                <label>Motivo</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describí el motivo de la sanción..."
                  rows={3}
                />
              </div>

              <div className="susp-form-row">
                <div className="susp-form-campo">
                  <label>Tipo</label>
                  <select value={tipoSuspension} onChange={(e) => setTipoSuspension(e.target.value)}>
                    <option value="advertencia">Advertencia (sin suspender)</option>
                    <option value="temporal">Temporal</option>
                    <option value="permanente">Permanente</option>
                  </select>
                </div>

                {tipoSuspension === 'temporal' && (
                  <div className="susp-form-campo susp-dias">
                    <label>Días</label>
                    <input
                      type="number"
                      min="1"
                      value={diasSuspension}
                      onChange={(e) => setDiasSuspension(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <button
                className="susp-confirmar-btn"
                onClick={aplicarSancion}
                disabled={!motivo.trim() || guardando}
              >
                {guardando ? 'Aplicando...' : 'Aplicar sanción'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="susp-seccion">
        <h2>
          <span className="material-icons">block</span>
          Sanciones activas ({activas.length})
        </h2>
        {activas.length === 0 ? (
          <p className="susp-vacio">No hay sanciones activas</p>
        ) : (
          <div className="susp-lista">
            {activas.map(s => (
              <div key={s.id} className={`susp-card susp-${s.tipo_suspension}`}>
                <div className="susp-card-info">
                  <strong>{s.nombre_entidad}</strong>
                  <p>{s.motivo}</p>
                  <div className="susp-card-meta">
                    <span className={`susp-badge susp-badge-${s.tipo_suspension}`}>{s.tipo_suspension}</span>
                    <span>Desde {formatearFecha(s.fecha_inicio || s.fecha)}</span>
                    {s.fecha_fin && <span>Hasta {formatearFecha(s.fecha_fin)}</span>}
                  </div>
                </div>
                <button className="susp-levantar-btn" onClick={() => levantarSancion(s)}>
                  <span className="material-icons">restore</span>
                  Levantar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="susp-seccion">
        <h2>
          <span className="material-icons">history</span>
          Historial ({historial.length})
        </h2>
        {historial.length === 0 ? (
          <p className="susp-vacio">Sin historial</p>
        ) : (
          <div className="susp-lista">
            {historial.slice(0, 10).map(s => (
              <div key={s.id} className="susp-card susp-inactiva">
                <div className="susp-card-info">
                  <strong>{s.nombre_entidad}</strong>
                  <p>{s.motivo}</p>
                  <div className="susp-card-meta">
                    <span className={`susp-badge susp-badge-${s.tipo_suspension}`}>{s.tipo_suspension}</span>
                    <span>{formatearFecha(s.fecha_inicio || s.fecha)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspensionesAdmin;