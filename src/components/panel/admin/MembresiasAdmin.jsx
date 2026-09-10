import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './MembresiasAdmin.css';

const MembresiasAdmin = () => {
  const { user } = useAuth();
  const [membresias, setMembresias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [planes, setPlanes] = useState([]); // 🆕
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({});

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState(null);

  // 🆕 formulario con plan_id en vez de VIP fijo
  const [formCrear, setFormCrear] = useState({
    usuario_id: '',
    plan_id: '',
    duracion_dias: 30
  });
  const [busquedaUsuario, setBusquedaUsuario] = useState('');

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: membData, error: membError } = await supabase
        .from('membresias')
        .select(`
          *,
          usuario:perfiles_usuarios!usuario_id ( id, nombre, apellido, email )
        `)
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false });

      if (membError) throw membError;

      const membresiasProcesadas = await Promise.all(
        (membData || []).map(async (memb) => {
          const fechaFin = new Date(memb.fecha_fin);
          const hoy = new Date();
          const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));

          const { count: totalServicios } = await supabase
            .from('servicios')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', memb.usuario_id)
            .eq('estado', 'activo');

          return {
            ...memb,
            nombre_completo: memb.usuario ? `${memb.usuario.nombre} ${memb.usuario.apellido}` : 'Sin nombre',
            email: memb.usuario?.email || 'Sin email',
            dias_restantes: diasRestantes,
            total_servicios: totalServicios || 0
          };
        })
      );

      const { data: usersData, error: usersError } = await supabase
        .from('perfiles_usuarios')
        .select('id, nombre, apellido, email')
        .eq('estado', 'activo')
        .order('nombre');

      if (usersError) throw usersError;

      // 🆕 Traer los planes reales para el selector
      const { data: planesData, error: planesError } = await supabase
        .rpc('listar_planes_para_admin');

      if (planesError) throw planesError;

      setMembresias(membresiasProcesadas);
      setUsuarios(usersData || []);
      setPlanes(planesData || []);
      calcularEstadisticas(membresiasProcesadas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar membresías');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (data) => {
    const porTipo = {};
    data.forEach(m => {
      porTipo[m.tipo_membresia] = (porTipo[m.tipo_membresia] || 0) + 1;
    });
    setEstadisticas({ total: data.length, ...porTipo });
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🆕 Asignar plan real (reemplaza "crear VIP")
  const handleCrearMembresia = async (e) => {
    e.preventDefault();

    if (!formCrear.usuario_id) {
      alert('Seleccioná un usuario');
      return;
    }
    if (!formCrear.plan_id) {
      alert('Seleccioná un plan');
      return;
    }

    const planElegido = planes.find(p => p.id === Number(formCrear.plan_id));

    const confirmar = window.confirm(
      `¿Asignar "${planElegido?.nombre}" por ${formCrear.duracion_dias} días?\n\n` +
      `Se cancelará cualquier membresía activa existente de este usuario.`
    );
    if (!confirmar) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('admin_asignar_plan', {
        p_usuario_id: formCrear.usuario_id,
        p_plan_id: Number(formCrear.plan_id),
        p_duracion_dias: Number(formCrear.duracion_dias)
      });

      if (error) throw error;

      if (data.success) {
        alert(`✅ ${data.plan} asignado exitosamente`);
        setModalCrear(false);
        setFormCrear({ usuario_id: '', plan_id: '', duracion_dias: 30 });
        cargarDatos();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      console.error('Error al asignar plan:', error);
      alert('Error al asignar el plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarMembresia = async (usuarioId, nombreCompleto) => {
    const motivo = prompt(`¿Por qué deseas cancelar la membresía de ${nombreCompleto}?`, 'Cancelada por administrador');
    if (!motivo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('cancelar_membresia', {
        p_usuario_id: usuarioId,
        p_admin_id: user.id,
        p_motivo: motivo
      });

      if (error) throw error;

      if (data.success) {
        alert('✅ Membresía cancelada exitosamente');
        cargarDatos();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      console.error('Error al cancelar membresía:', error);
      alert('Error al cancelar membresía');
    } finally {
      setLoading(false);
    }
  };

  const verDetalles = async (membresia) => {
    try {
      const { data: historial, error } = await supabase
        .from('historial_membresias')
        .select('*')
        .eq('usuario_id', membresia.usuario_id)
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      setMembresiaSeleccionada({ ...membresia, historial: historial || [] });
      setModalDetalles(true);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      alert('Error al cargar detalles');
    }
  };

  const membresiasFiltradas = membresias.filter(memb => {
    const cumpleTipo = filtroTipo === 'todos' || memb.tipo_membresia === filtroTipo;
    const cumpleBusqueda =
      (memb.nombre_completo?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
      (memb.email?.toLowerCase() || '').includes(busqueda.toLowerCase());
    return cumpleTipo && cumpleBusqueda;
  });

  // 🆕 Nombre legible del tipo, tomado del plan real si existe (no hardcodeado)
  const nombreTipo = (memb) => {
    const plan = planes.find(p => p.tipo === memb.tipo_membresia);
    if (plan) return plan.nombre;
    return memb.tipo_membresia;
  };

  return (
    <div className="membresias-admin-container">
      <div className="membresias-admin-header">
        <div className="header-title-section">
          <h1 className="header-title">
            <span className="material-icons">card_membership</span>
            Gestión de Membresías
          </h1>
          <p className="header-subtitle">Asigná cualquier plan real a un usuario</p>
        </div>
        <button className="btn-crear-membresia" onClick={() => setModalCrear(true)}>
          <span className="material-icons">add</span>
          Asignar Plan
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon"><span className="material-icons">people</span></div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.total || 0}</span>
            <span className="stat-label">Total Activas</span>
          </div>
        </div>
                {planes.filter(p => p.tipo !== 'gratis').map(plan => {
          // 🆕 Ícono y color distinto por plan (antes quedaban en blanco
          // porque no tenían ninguna clase de color asignada)
          const iconoPorTipo = {
            impulso: 'rocket_launch',
            destacado: 'star',
            elite: 'workspace_premium'
          };
          const colorPorTipo = {
            impulso: '#0EA5E9',
            destacado: '#2563EB',
            elite: '#7C3AED'
          };
          const icono = iconoPorTipo[plan.tipo] || 'verified';
          const color = colorPorTipo[plan.tipo] || '#64748B';

          return (
            <div className="stat-card" key={plan.id}>
              <div className="stat-icon" style={{ background: color }}>
                <span className="material-icons">{icono}</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{estadisticas[plan.tipo] || 0}</span>
                <span className="stat-label">{plan.nombre}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="filtros-section">
        <div className="filtro-busqueda">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select className="filtro-selectt" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {planes.map(plan => (
            <option key={plan.id} value={plan.tipo}>{plan.nombre}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando membresías...</p>
        </div>
      ) : (
        <div className="tabla-membresias-container">
          <div className="tabla-membresias-wrapper">
            <table className="tabla-membresias">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Plan</th>
                  <th>Prioridad</th>
                  <th>Badge</th>
                  <th>Fotos</th>
                  <th>Servicios</th>
                  <th>Expira</th>
                  <th>Días Rest.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr><td colSpan="9" className="no-data">No se encontraron membresías</td></tr>
                ) : (
                  membresiasFiltradas.map((memb) => (
                    <tr key={memb.id}>
                      <td>
                        <div className="usuario-cell">
                          <strong>{memb.nombre_completo}</strong>
                          <small>{memb.email}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-tipo-memb badge-${memb.tipo_membresia}`}>
                          {nombreTipo(memb)}
                        </span>
                      </td>
                      <td><span className="prioridad-badge">{memb.prioridad_nivel}</span></td>
                      <td>{memb.badge_texto ? <span className="badge-text">{memb.badge_texto}</span> : <span className="no-badge">-</span>}</td>
                      <td>{memb.limite_fotos}</td>
                      <td>{memb.total_servicios}</td>
                      <td>{new Date(memb.fecha_fin).toLocaleDateString()}</td>
                      <td>
                        <span className={`dias-restantes ${memb.dias_restantes < 7 ? 'dias-criticos' : ''}`}>
                          {Math.floor(memb.dias_restantes)} días
                        </span>
                      </td>
                      <td>
                        <div className="acciones-cell">
                          <button className="btn-accion btn-ver" onClick={() => verDetalles(memb)} title="Ver detalles">
                            <span className="material-icons">visibility</span>
                          </button>
                          <button
                            className="btn-accion btn-cancelar"
                            onClick={() => handleCancelarMembresia(memb.usuario_id, memb.nombre_completo)}
                            title="Cancelar membresía"
                          >
                            <span className="material-icons">cancel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🆕 Modal Asignar Plan */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="material-icons">verified</span>Asignar Plan a un Usuario</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearMembresia}>
              <div className="form-group">
                <label>Seleccionar Usuario</label>
                <div className="buscador-usuario">
                  <span className="material-icons">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                  />
                  {busquedaUsuario && (
                    <button type="button" className="btn-limpiar-busqueda" onClick={() => setBusquedaUsuario('')}>
                      <span className="material-icons">close</span>
                    </button>
                  )}
                </div>

                <select
                  value={formCrear.usuario_id}
                  onChange={(e) => setFormCrear({ ...formCrear, usuario_id: e.target.value })}
                  required
                >
                  <option value="">-- Selecciona un usuario --</option>
                  {usuarios
                    .filter(u => {
                      if (!busquedaUsuario) return true;
                      const term = busquedaUsuario.toLowerCase();
                      return `${u.nombre} ${u.apellido}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                    })
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.email})</option>
                    ))}
                </select>
              </div>

              {/* 🆕 Selector de plan real */}
              <div className="form-group">
                <label>Plan a asignar</label>
                <select
                  value={formCrear.plan_id}
                  onChange={(e) => setFormCrear({ ...formCrear, plan_id: e.target.value })}
                  required
                >
                  <option value="">-- Selecciona un plan --</option>
                  {planes.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} — prioridad {plan.prioridad_nivel}, {plan.limite_servicios} servicios, {plan.limite_fotos} fotos
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Duración (días)</label>
                <select
                  value={formCrear.duracion_dias}
                  onChange={(e) => setFormCrear({ ...formCrear, duracion_dias: parseInt(e.target.value) })}
                  required
                >
                  <option value="7">1 Semana (7 días)</option>
                  <option value="30">1 Mes (30 días)</option>
                  <option value="90">3 Meses (90 días)</option>
                  <option value="180">6 Meses (180 días)</option>
                  <option value="365">1 Año (365 días)</option>
                  <option value="3650">10 Años (3650 días)</option>
                </select>
              </div>

              <div className="info-box">
                <span className="material-icons">info</span>
                <div>
                  <strong>Al confirmar:</strong>
                  <ul>
                    <li>Se cancela cualquier membresía activa que ya tenga</li>
                    <li>Recibe todos los beneficios del plan elegido, tal cual están configurados hoy</li>
                    <li>Le llega una notificación avisándole</li>
                  </ul>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Asignando...' : 'Asignar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalDetalles && membresiaSeleccionada && (
        <div className="modal-overlay" onClick={() => setModalDetalles(false)}>
          <div className="modal-content modal-detalles" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="material-icons">info</span>Detalles de Membresía</h2>
              <button className="modal-close" onClick={() => setModalDetalles(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="detalles-content">
              <div className="detalle-section">
                <h3><span className="material-icons">person</span>Usuario</h3>
                <div className="detalle-grid">
                  <div><label>Nombre completo:</label><span>{membresiaSeleccionada.nombre_completo}</span></div>
                  <div><label>Email:</label><span>{membresiaSeleccionada.email}</span></div>
                </div>
              </div>

              <div className="detalle-section">
                <h3><span className="material-icons">card_membership</span>Membresía Actual</h3>
                <div className="detalle-grid">
                  <div><label>Plan:</label><span className={`badge-tipo-memb badge-${membresiaSeleccionada.tipo_membresia}`}>{nombreTipo(membresiaSeleccionada)}</span></div>
                  <div><label>Prioridad:</label><span className="prioridad-badge">{membresiaSeleccionada.prioridad_nivel}</span></div>
                  <div><label>Badge:</label><span>{membresiaSeleccionada.badge_texto || 'Sin badge'}</span></div>
                  <div><label>Límite de fotos:</label><span>{membresiaSeleccionada.limite_fotos} fotos</span></div>
                  <div><label>Fecha inicio:</label><span>{new Date(membresiaSeleccionada.fecha_inicio).toLocaleString()}</span></div>
                  <div><label>Fecha fin:</label><span>{new Date(membresiaSeleccionada.fecha_fin).toLocaleString()}</span></div>
                  <div><label>Días restantes:</label><span className={membresiaSeleccionada.dias_restantes < 7 ? 'dias-criticos' : ''}>{Math.floor(membresiaSeleccionada.dias_restantes)} días</span></div>
                  {membresiaSeleccionada.codigo_usado && (
                    <div><label>Código usado:</label><span className="codigo-usado">{membresiaSeleccionada.codigo_usado}</span></div>
                  )}
                </div>
              </div>

              <div className="detalle-section">
                <h3><span className="material-icons">store</span>Servicios</h3>
                <div className="detalle-simple">
                  <span className="stat-big">{membresiaSeleccionada.total_servicios}</span>
                  <span className="stat-label">servicios activos</span>
                </div>
              </div>

              <div className="detalle-section">
                <h3><span className="material-icons">history</span>Historial de Cambios</h3>
                <div className="historial-list">
                  {membresiaSeleccionada.historial && membresiaSeleccionada.historial.length > 0 ? (
                    membresiaSeleccionada.historial.map((h, index) => (
                      <div key={index} className="historial-item">
                        <div className="historial-icon">
                          <span className="material-icons">
                            {h.accion === 'creada' ? 'add_circle' : h.accion === 'cancelada' ? 'cancel' : h.accion === 'expirada' ? 'schedule' : 'edit'}
                          </span>
                        </div>
                        <div className="historial-content">
                          <div className="historial-accion">
                            <strong>{h.accion.toUpperCase()}</strong>
                            <span className={`badge-tipo-memb badge-${h.tipo_membresia}`}>{h.tipo_membresia}</span>
                          </div>
                          <div className="historial-fecha">{new Date(h.fecha_registro).toLocaleString()}</div>
                          {h.notas && <div className="historial-notas">{h.notas}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-historial">No hay historial disponible</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModalDetalles(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembresiasAdmin;