import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './CodigosPromocionalesAdmin.css';
import Loading from '../../loading/Loading';

const CodigosPromocionalesAdmin = () => {
  const { user } = useAuth();
  const [codigos, setCodigos] = useState([]);
  const [planes, setPlanes] = useState([]); // 🆕
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({ total: 0, activos: 0, usados: 0, disponibles: 0 });

  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [codigoEditando, setCodigoEditando] = useState(null);

  // 🆕 plan_id en vez de "tipo" fijo
  const [formCrear, setFormCrear] = useState({
    cantidad: 1,
    prefijo: 'GOYA',
    duracion_dias: 30,
    usos_maximos: 1,
    plan_id: '',
    descripcion: ''
  });

  const [formEditar, setFormEditar] = useState({
    duracion_dias: 30,
    usos_maximos: 1,
    activo: true,
    plan_id: '',
    descripcion: '',
    notas: ''
  });

  const cargarCodigos = async () => {
    try {
      setLoading(true);

      const [codigosRes, planesRes] = await Promise.all([
        supabase.from('codigos_promocionales').select('*').order('fecha_creacion', { ascending: false }),
        supabase.rpc('listar_planes_para_admin')
      ]);

      if (codigosRes.error) throw codigosRes.error;

      setCodigos(codigosRes.data || []);
      setPlanes(planesRes.data || []);
      calcularEstadisticas(codigosRes.data || []);
    } catch (error) {
      console.error('Error al cargar códigos:', error);
      alert('Error al cargar códigos promocionales');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (data) => {
    setEstadisticas({
      total: data.length,
      activos: data.filter(c => c.activo).length,
      usados: data.reduce((sum, c) => sum + c.usos_actuales, 0),
      disponibles: data.filter(c => c.activo && c.usos_actuales < c.usos_maximos).length
    });
  };

  useEffect(() => { cargarCodigos(); }, []);

  const generarCodigoAleatorio = (prefijo) => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = prefijo;
    const longitudRestante = Math.max(0, 6 - prefijo.length);
    for (let i = 0; i < longitudRestante; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
  };

  // Nombre del plan a partir del plan_id (para mostrar en la tabla)
  const nombrePlan = (planId) => {
    const plan = planes.find(p => p.id === planId);
    return plan ? plan.nombre : '—';
  };

  const handleCrearCodigos = async (e) => {
    e.preventDefault();

    if (!formCrear.cantidad || formCrear.cantidad < 1 || formCrear.cantidad > 100) {
      alert('Cantidad debe ser entre 1 y 100');
      return;
    }
    if (!formCrear.plan_id) {
      alert('Elegí qué plan otorga este código');
      return;
    }

    try {
      setLoading(true);
      const nuevosCodigos = [];
      const generados = new Set();

      for (let i = 0; i < formCrear.cantidad; i++) {
        let codigo, intentos = 0;
        do {
          codigo = generarCodigoAleatorio(formCrear.prefijo);
          intentos++;
        } while (generados.has(codigo) && intentos < 50);

        if (intentos >= 50) {
          alert('⚠️ Dificultad para generar códigos únicos. Probá con menos cantidad o cambiá el prefijo.');
          setLoading(false);
          return;
        }

        generados.add(codigo);
        nuevosCodigos.push({
          codigo,
          descripcion: formCrear.descripcion || `Código ${nombrePlan(Number(formCrear.plan_id))}`,
          usos_maximos: formCrear.usos_maximos,
          duracion_dias: formCrear.duracion_dias,
          plan_id: Number(formCrear.plan_id),
          activo: true,
          creado_por: user.id
        });
      }

      const { data, error } = await supabase
        .from('codigos_promocionales')
        .insert(nuevosCodigos)
        .select();

      if (error) throw error;

      alert(`✅ ${data.length} código(s) creado(s) exitosamente`);
      setModalCrear(false);
      setFormCrear({ cantidad: 1, prefijo: 'GOYA', duracion_dias: 30, usos_maximos: 1, plan_id: '', descripcion: '' });
      cargarCodigos();
    } catch (error) {
      console.error('Error al crear códigos:', error);
      alert('Error al crear códigos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEditar = (codigo) => {
    setCodigoEditando(codigo);
    setFormEditar({
      duracion_dias: codigo.duracion_dias,
      usos_maximos: codigo.usos_maximos,
      activo: codigo.activo,
      plan_id: codigo.plan_id || '',
      descripcion: codigo.descripcion || '',
      notas: codigo.notas || ''
    });
    setModalEditar(true);
  };

  const handleEditarCodigo = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('codigos_promocionales')
        .update({
          duracion_dias: formEditar.duracion_dias,
          usos_maximos: formEditar.usos_maximos,
          activo: formEditar.activo,
          plan_id: formEditar.plan_id ? Number(formEditar.plan_id) : null,
          descripcion: formEditar.descripcion,
          notas: formEditar.notas
        })
        .eq('id', codigoEditando.id);

      if (error) throw error;

      alert('✅ Código actualizado exitosamente');
      setModalEditar(false);
      setCodigoEditando(null);
      cargarCodigos();
    } catch (error) {
      console.error('Error al editar código:', error);
      alert('Error al actualizar código');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCodigo = async (id, codigo, usosActuales) => {
    if (usosActuales > 0) {
      const confirmar = window.confirm(
        `⚠️ El código ${codigo} ya fue usado ${usosActuales} vez/veces.\n\n` +
        `No se puede eliminar porque está vinculado a membresías.\n\n¿Deseas DESACTIVARLO en su lugar?`
      );
      if (!confirmar) return;

      try {
        setLoading(true);
        const { error } = await supabase.from('codigos_promocionales').update({ activo: false }).eq('id', id);
        if (error) throw error;
        alert('✅ Código desactivado exitosamente');
        cargarCodigos();
      } catch (error) {
        console.error('Error al desactivar código:', error);
        alert('Error al desactivar código');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!window.confirm(`¿Seguro que deseas eliminar el código ${codigo}?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('codigos_promocionales').delete().eq('id', id);
      if (error) throw error;
      alert('✅ Código eliminado exitosamente');
      cargarCodigos();
    } catch (error) {
      console.error('Error al eliminar código:', error);
      alert('Error al eliminar código');
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
    alert(`✅ Código ${codigo} copiado al portapapeles`);
  };

  const codigosFiltrados = codigos.filter(codigo => {
    const cumpleEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'activo' && codigo.activo) ||
      (filtroEstado === 'inactivo' && !codigo.activo) ||
      (filtroEstado === 'disponible' && codigo.activo && codigo.usos_actuales < codigo.usos_maximos) ||
      (filtroEstado === 'agotado' && codigo.usos_actuales >= codigo.usos_maximos);
    const cumpleBusqueda = codigo.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (codigo.descripcion && codigo.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return cumpleEstado && cumpleBusqueda;
  });

  return (
    <div className="codigos-admin-container">
      <div className="codigos-admin-header">
        <div className="header-title-section">
          <h1 className="header-title">
            <span className="material-icons">confirmation_number</span>
            Códigos Promocionales
          </h1>
          <p className="header-subtitle">Creá códigos que otorgan un plan gratis por el tiempo que elijas</p>
        </div>
        <button className="btn-crear-codigo" onClick={() => setModalCrear(true)}>
          <span className="material-icons">add</span>
          Crear Códigos
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon"><span className="material-icons">receipt</span></div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.total}</span>
            <span className="stat-label">Total Códigos</span>
          </div>
        </div>
        <div className="stat-card stat-activos">
          <div className="stat-icon"><span className="material-icons">check_circle</span></div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.activos}</span>
            <span className="stat-label">Activos</span>
          </div>
        </div>
        <div className="stat-card stat-usados">
          <div className="stat-icon"><span className="material-icons">redeem</span></div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.usados}</span>
            <span className="stat-label">Usos Totales</span>
          </div>
        </div>
        <div className="stat-card stat-disponibles">
          <div className="stat-icon"><span className="material-icons">local_offer</span></div>
          <div className="stat-content">
            <span className="stat-value">{estadisticas.disponibles}</span>
            <span className="stat-label">Disponibles</span>
          </div>
        </div>
      </div>

      <div className="filtros-section">
        <div className="filtro-busqueda">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select className="filtro-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="disponible">Disponibles</option>
          <option value="agotado">Agotados</option>
        </select>
      </div>

      {loading ? (
        <Loading message="Cargando códigos..." />
      ) : (
        <div className="tabla-codigos-container">
          <div className="tabla-codigos-wrapper">
            <table className="tabla-codigos">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Plan que otorga</th>
                  <th>Usos</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {codigosFiltrados.length === 0 ? (
                  <tr><td colSpan="7" className="no-data">No se encontraron códigos</td></tr>
                ) : (
                  codigosFiltrados.map((codigo) => (
                    <tr key={codigo.id}>
                      <td>
                        <div className="codigo-cell">
                          <strong>{codigo.codigo}</strong>
                          <button className="btn-copiar-mini" onClick={() => copiarCodigo(codigo.codigo)} title="Copiar código">
                            <span className="material-icons">content_copy</span>
                          </button>
                        </div>
                        {codigo.descripcion && <small className="codigo-descripcion">{codigo.descripcion}</small>}
                      </td>
                      <td><span className="badge-tipo">{nombrePlan(codigo.plan_id)}</span></td>
                      <td>
                        <span className={`usos-badge ${codigo.usos_actuales >= codigo.usos_maximos ? 'usos-agotados' : ''}`}>
                          {codigo.usos_actuales}/{codigo.usos_maximos}
                        </span>
                      </td>
                      <td>{codigo.duracion_dias} días</td>
                      <td>
                        <span className={`badge-estado ${codigo.activo ? 'estado-activo' : 'estado-inactivo'}`}>
                          {codigo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(codigo.fecha_creacion).toLocaleDateString()}</td>
                      <td>
                        <div className="acciones-cell">
                          <button className="btn-accion btn-editar" onClick={() => abrirModalEditar(codigo)} title="Editar">
                            <span className="material-icons">edit</span>
                          </button>
                          <button
                            className="btn-accion btn-eliminar"
                            onClick={() => handleEliminarCodigo(codigo.id, codigo.codigo, codigo.usos_actuales)}
                            title={codigo.usos_actuales > 0 ? "Desactivar código" : "Eliminar código"}
                          >
                            <span className="material-icons">{codigo.usos_actuales > 0 ? 'block' : 'delete'}</span>
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

      {/* Modal Crear */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="a-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="material-icons">add_circle</span>Crear Códigos Promocionales</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearCodigos}>
              <div className="form-group">
                <label>Cantidad de códigos a generar (1-100)</label>
                <input
                  type="number" min="1" max="100"
                  value={formCrear.cantidad}
                  onChange={(e) => setFormCrear({ ...formCrear, cantidad: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Prefijo (máx 4 caracteres)</label>
                <input
                  type="text" maxLength="4"
                  value={formCrear.prefijo}
                  onChange={(e) => setFormCrear({ ...formCrear, prefijo: e.target.value.toUpperCase() })}
                  placeholder="GOYA" required
                />
                <small>Ejemplo: {generarCodigoAleatorio(formCrear.prefijo)}</small>
              </div>

              {/* 🆕 Selector de plan real */}
              <div className="form-group">
                <label>¿Qué plan otorga este código?</label>
                <select
                  value={formCrear.plan_id}
                  onChange={(e) => setFormCrear({ ...formCrear, plan_id: e.target.value })}
                  required
                >
                  <option value="">-- Elegí un plan --</option>
                  {planes.filter(p => p.tipo !== 'gratis').map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} — {plan.limite_servicios} servicios, {plan.limite_fotos} fotos
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duración (días)</label>
                  <input
                    type="number" min="1"
                    value={formCrear.duracion_dias}
                    onChange={(e) => setFormCrear({ ...formCrear, duracion_dias: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Usos máximos</label>
                  <input
                    type="number" min="1" max="1000"
                    value={formCrear.usos_maximos}
                    onChange={(e) => setFormCrear({ ...formCrear, usos_maximos: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea
                  value={formCrear.descripcion}
                  onChange={(e) => setFormCrear({ ...formCrear, descripcion: e.target.value })}
                  placeholder="Ej: Códigos para el evento de la plaza"
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Códigos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && codigoEditando && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="a-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="material-icons">edit</span>Editar Código: {codigoEditando.codigo}</h2>
              <button className="modal-close" onClick={() => setModalEditar(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleEditarCodigo}>
              <div className="form-group">
                <label>Plan que otorga</label>
                <select
                  value={formEditar.plan_id}
                  onChange={(e) => setFormEditar({ ...formEditar, plan_id: e.target.value })}
                  required
                >
                  <option value="">-- Elegí un plan --</option>
                  {planes.filter(p => p.tipo !== 'gratis').map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duración (días)</label>
                  <input
                    type="number" min="1"
                    value={formEditar.duracion_dias}
                    onChange={(e) => setFormEditar({ ...formEditar, duracion_dias: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Usos máximos</label>
                  <input
                    type="number" min="1" max="1000"
                    value={formEditar.usos_maximos}
                    onChange={(e) => setFormEditar({ ...formEditar, usos_maximos: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formEditar.activo}
                    onChange={(e) => setFormEditar({ ...formEditar, activo: e.target.checked })}
                  />
                  <span>Código activo</span>
                </label>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formEditar.descripcion}
                  onChange={(e) => setFormEditar({ ...formEditar, descripcion: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Notas internas</label>
                <textarea
                  value={formEditar.notas}
                  onChange={(e) => setFormEditar({ ...formEditar, notas: e.target.value })}
                  placeholder="Notas privadas para administración..."
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalEditar(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodigosPromocionalesAdmin;