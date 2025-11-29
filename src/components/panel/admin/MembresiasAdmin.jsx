import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './MembresiasAdmin.css';

const MembresiasAdmin = () => {
  const { user } = useAuth();
  const [membresias, setMembresias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    gratis: 0,
    codigo: 0,
    pago: 0,
    manual: 0
  });

  // Estados para filtros
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Estados para modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState(null);

  // Estados para formulario
  const [formCrear, setFormCrear] = useState({
    usuario_id: '',
    duracion_dias: 365,
    notas: ''
  });

// Cargar datos
const cargarDatos = async () => {
  try {
    setLoading(true);

    // Cargar membresías activas con JOIN a perfiles_usuarios
    const { data: membData, error: membError } = await supabase
      .from('membresias')
      .select(`
        *,
        usuario:perfiles_usuarios!usuario_id (
          id,
          nombre,
          apellido,
          email
        )
      `)
      .eq('estado', 'activa')
      .order('fecha_inicio', { ascending: false });

    if (membError) throw membError;

    // Procesar los datos y agregar campos calculados
    const membresiasProcesadas = await Promise.all(
      (membData || []).map(async (memb) => {
        // Calcular días restantes
        const fechaFin = new Date(memb.fecha_fin);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));

        // Contar servicios activos del usuario
        const { count: totalServicios } = await supabase
          .from('servicios')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', memb.usuario_id)
          .eq('estado', 'activo');

        return {
          ...memb,
          nombre_completo: memb.usuario 
            ? `${memb.usuario.nombre} ${memb.usuario.apellido}` 
            : 'Sin nombre',
          email: memb.usuario?.email || 'Sin email',
          dias_restantes: diasRestantes,
          total_servicios: totalServicios || 0
        };
      })
    );

    // Cargar todos los usuarios para el selector
    const { data: usersData, error: usersError } = await supabase
      .from('perfiles_usuarios')
      .select('id, nombre, apellido, email')
      .eq('estado', 'activo')
      .order('nombre');

    if (usersError) throw usersError;

    setMembresias(membresiasProcesadas);
    setUsuarios(usersData || []);
    calcularEstadisticas(membresiasProcesadas);
  } catch (error) {
    console.error('Error al cargar datos:', error);
    alert('Error al cargar membresías');
  } finally {
    setLoading(false);
  }
};

  // Calcular estadísticas
  const calcularEstadisticas = (data) => {
    const stats = {
      total: data.length,
      gratis: data.filter(m => m.tipo_membresia === 'gratis').length,
      codigo: data.filter(m => m.tipo_membresia === 'codigo_gratis').length,
      pago: data.filter(m => m.tipo_membresia === 'pago').length,
      manual: data.filter(m => m.tipo_membresia === 'manual_admin').length
    };
    setEstadisticas(stats);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Crear membresía manual
  const handleCrearMembresia = async (e) => {
    e.preventDefault();

    if (!formCrear.usuario_id) {
      alert('Selecciona un usuario');
      return;
    }

    const confirmar = window.confirm(
      '¿Crear membresía Premium VIP para este usuario?\n\nSe cancelará cualquier membresía activa existente.'
    );

    if (!confirmar) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('crear_membresia_manual', {
        p_usuario_id: formCrear.usuario_id,
        p_admin_id: user.id,
        p_duracion_dias: formCrear.duracion_dias,
        p_notas: formCrear.notas || null
      });

      if (error) throw error;

      if (data.success) {
        alert('✅ Membresía Premium VIP creada exitosamente');
        setModalCrear(false);
        setFormCrear({
          usuario_id: '',
          duracion_dias: 365,
          notas: ''
        });
        cargarDatos();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      console.error('Error al crear membresía:', error);
      alert('Error al crear membresía');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar membresía
  const handleCancelarMembresia = async (usuarioId, nombreCompleto) => {
    const motivo = prompt(
      `¿Por qué deseas cancelar la membresía de ${nombreCompleto}?`,
      'Cancelada por administrador'
    );

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

  // Ver detalles
  const verDetalles = async (membresia) => {
    try {
      // Cargar historial
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

  // Filtrar membresías
const membresiasFiltradas = membresias.filter(memb => {
  const cumpleTipo = filtroTipo === 'todos' || memb.tipo_membresia === filtroTipo;
  const cumpleBusqueda = 
    (memb.nombre_completo?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
    (memb.email?.toLowerCase() || '').includes(busqueda.toLowerCase());

  return cumpleTipo && cumpleBusqueda;
});

  return (
    <div className="membresias-admin-container">
      {/* Header */}
      <div className="membresias-admin-header">
        <div className="header-title-section">
          <h1 className="header-title">
            <span className="material-icons">card_membership</span>
            Gestión de Membresías
          </h1>
          <p className="header-subtitle">Administra membresías Premium y VIP de usuarios</p>
        </div>
        <button 
          className="btn-crear-membresia"
          onClick={() => setModalCrear(true)}
        >
          <span className="material-icons">add</span>
          Crear Membresía VIP
        </button>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <span className="material-icons">people</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.total}</span>
            <span className="stat-label">Total Activas</span>
          </div>
        </div>

        <div className="stat-card stat-manual">
          <div className="stat-icon">
            <span className="material-icons">verified</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.manual}</span>
            <span className="stat-label">VIP Manual</span>
          </div>
        </div>

        <div className="stat-card stat-pago">
          <div className="stat-icon">
            <span className="material-icons">payment</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.pago}</span>
            <span className="stat-label">Pagadas</span>
          </div>
        </div>

        <div className="stat-card stat-codigo">
          <div className="stat-icon">
            <span className="material-icons">local_offer</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.codigo}</span>
            <span className="stat-label">Con Código</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
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

        <select 
          className="filtro-selectt"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="todos">Todos los tipos</option>
          <option value="manual_admin">VIP Manual</option>
          <option value="pago">Pagadas</option>
          <option value="codigo_gratis">Con Código</option>
          <option value="gratis">Gratis</option>
        </select>
      </div>

      {/* Tabla */}
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
                <th>Tipo</th>
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
                <tr>
                  <td colSpan="9" className="no-data">
                    No se encontraron membresías
                  </td>
                </tr>
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
                        {memb.tipo_membresia === 'manual_admin' ? 'VIP Manual' :
                         memb.tipo_membresia === 'codigo_gratis' ? 'Código' :
                         memb.tipo_membresia === 'pago' ? 'Pago' : 'Gratis'}
                      </span>
                    </td>
                    <td>
                      <span className="prioridad-badge">
                        {memb.prioridad_nivel}
                      </span>
                    </td>
                    <td>
                      {memb.badge_texto ? (
                        <span className="badge-text">{memb.badge_texto}</span>
                      ) : (
                        <span className="no-badge">-</span>
                      )}
                    </td>
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
                        <button 
                          className="btn-accion btn-ver"
                          onClick={() => verDetalles(memb)}
                          title="Ver detalles"
                        >
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

      {/* Modal Crear Membresía */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">verified</span>
                Crear Membresía Premium VIP
              </h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearMembresia}>
              <div className="form-group">
                <label>Seleccionar Usuario</label>
                <select
                  value={formCrear.usuario_id}
                  onChange={(e) => setFormCrear({...formCrear, usuario_id: e.target.value})}
                  required
                >
                  <option value="">-- Selecciona un usuario --</option>
                  {usuarios.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nombre} {user.apellido} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Duración (días)</label>
                <select
                  value={formCrear.duracion_dias}
                  onChange={(e) => setFormCrear({...formCrear, duracion_dias: parseInt(e.target.value)})}
                  required
                >
                  <option value="30">1 Mes (30 días)</option>
                  <option value="90">3 Meses (90 días)</option>
                  <option value="180">6 Meses (180 días)</option>
                  <option value="365">1 Año (365 días)</option>
                  <option value="730">2 Años (730 días)</option>
                  <option value="3650">10 Años (3650 días)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notas (opcional)</label>
                <textarea
                  value={formCrear.notas}
                  onChange={(e) => setFormCrear({...formCrear, notas: e.target.value})}
                  placeholder="Ej: Membresía para mi mamá, cuenta familiar, etc."
                  rows="3"
                />
              </div>

              <div className="info-box">
                <span className="material-icons">info</span>
                <div>
                  <strong>Beneficios de Membresía VIP:</strong>
                  <ul>
                    <li>Prioridad máxima (300) - Aparece primero que todos</li>
                    <li>Badge "Premium VIP"</li>
                    <li>Hasta 20 fotos por servicio</li>
                    <li>Se cancelará cualquier membresía activa anterior</li>
                  </ul>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setModalCrear(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear Membresía VIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalles */}
      {modalDetalles && membresiaSeleccionada && (
        <div className="modal-overlay" onClick={() => setModalDetalles(false)}>
          <div className="modal-content modal-detalles" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">info</span>
                Detalles de Membresía
              </h2>
              <button className="modal-close" onClick={() => setModalDetalles(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="detalles-content">
              {/* Información del usuario */}
              <div className="detalle-section">
                <h3>
                  <span className="material-icons">person</span>
                  Usuario
                </h3>
                <div className="detalle-grid">
                  <div>
                    <label>Nombre completo:</label>
                    <span>{membresiaSeleccionada.nombre_completo}</span>
                  </div>
                  <div>
                    <label>Email:</label>
                    <span>{membresiaSeleccionada.email}</span>
                  </div>
                </div>
              </div>

              {/* Información de la membresía */}
              <div className="detalle-section">
                <h3>
                  <span className="material-icons">card_membership</span>
                  Membresía Actual
                </h3>
                <div className="detalle-grid">
                  <div>
                    <label>Tipo:</label>
                    <span className={`badge-tipo-memb badge-${membresiaSeleccionada.tipo_membresia}`}>
                      {membresiaSeleccionada.tipo_membresia === 'manual_admin' ? 'VIP Manual' :
                       membresiaSeleccionada.tipo_membresia === 'codigo_gratis' ? 'Código Gratis' :
                       membresiaSeleccionada.tipo_membresia === 'pago' ? 'Pago' : 'Gratis'}
                    </span>
                  </div>
                  <div>
                    <label>Prioridad:</label>
                    <span className="prioridad-badge">{membresiaSeleccionada.prioridad_nivel}</span>
                  </div>
                  <div>
                    <label>Badge:</label>
                    <span>{membresiaSeleccionada.badge_texto || 'Sin badge'}</span>
                  </div>
                  <div>
                    <label>Límite de fotos:</label>
                    <span>{membresiaSeleccionada.limite_fotos} fotos</span>
                  </div>
                  <div>
                    <label>Fecha inicio:</label>
                    <span>{new Date(membresiaSeleccionada.fecha_inicio).toLocaleString()}</span>
                  </div>
                  <div>
                    <label>Fecha fin:</label>
                    <span>{new Date(membresiaSeleccionada.fecha_fin).toLocaleString()}</span>
                  </div>
                  <div>
                    <label>Días restantes:</label>
                    <span className={membresiaSeleccionada.dias_restantes < 7 ? 'dias-criticos' : ''}>
                      {Math.floor(membresiaSeleccionada.dias_restantes)} días
                    </span>
                  </div>
                  {membresiaSeleccionada.codigo_usado && (
                    <div>
                      <label>Código usado:</label>
                      <span className="codigo-usado">{membresiaSeleccionada.codigo_usado}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Servicios */}
              <div className="detalle-section">
                <h3>
                  <span className="material-icons">store</span>
                  Servicios
                </h3>
                <div className="detalle-simple">
                  <span className="stat-big">{membresiaSeleccionada.total_servicios}</span>
                  <span className="stat-label">servicios activos</span>
                </div>
              </div>

              {/* Historial */}
              <div className="detalle-section">
                <h3>
                  <span className="material-icons">history</span>
                  Historial de Cambios
                </h3>
                <div className="historial-list">
                  {membresiaSeleccionada.historial && membresiaSeleccionada.historial.length > 0 ? (
                    membresiaSeleccionada.historial.map((h, index) => (
                      <div key={index} className="historial-item">
                        <div className="historial-icon">
                          <span className="material-icons">
                            {h.accion === 'creada' ? 'add_circle' :
                             h.accion === 'cancelada' ? 'cancel' :
                             h.accion === 'expirada' ? 'schedule' : 'edit'}
                          </span>
                        </div>
                        <div className="historial-content">
                          <div className="historial-accion">
                            <strong>{h.accion.toUpperCase()}</strong>
                            <span className={`badge-tipo-memb badge-${h.tipo_membresia}`}>
                              {h.tipo_membresia}
                            </span>
                          </div>
                          <div className="historial-fecha">
                            {new Date(h.fecha_registro).toLocaleString()}
                          </div>
                          {h.notas && (
                            <div className="historial-notas">{h.notas}</div>
                          )}
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
              <button 
                className="btn-secondary"
                onClick={() => setModalDetalles(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembresiasAdmin;