// ============================================
// UsuariosAdmin.jsx - Versión Compacta con Iconos
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './UsuariosAdmin.css';
import Loading from '../../loading/Loading';

const ADMIN_EMAIL = '12torresfranco@gmail.com';

const UsuariosAdmin = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [suspensiones, setSuspensiones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 15;
  const [loading, setLoading] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  
  const [mostrarModalSuspension, setMostrarModalSuspension] = useState(false);
  const [usuarioSuspender, setUsuarioSuspender] = useState(null);
  const [tipoSuspension, setTipoSuspension] = useState('permanente');
  const [diasSuspension, setDiasSuspension] = useState(7);
  const [motivoSuspension, setMotivoSuspension] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: usuariosData, error: uErr },
        { data: serviciosData, error: sErr },
        { data: suspData, error: spErr }
      ] = await Promise.all([
        supabase.from('perfiles_usuarios').select('*').order('creado_en', { ascending: false }),
        supabase.from('servicios').select('id, usuario_id, estado').order('creado_en', { ascending: false }),
        supabase.from('suspensiones').select('*').eq('activa', true).order('fecha_inicio', { ascending: false }),
      ]);

      if (uErr) throw uErr;
      if (sErr) throw sErr;
      if (spErr) throw spErr;

      setServicios(serviciosData || []);
      setSuspensiones(suspData || []);

      const suspendedUserIds = new Set(
        (suspData || [])
          .filter(s => s.entidad === 'usuario' && s.activa)
          .map(s => s.entidad_id?.toString())
      );

      const usuariosConRol = (usuariosData || []).map(u => {
        const tieneServicios = (serviciosData || []).some(s => s.usuario_id === u.id);
        const rol = u.email === ADMIN_EMAIL ? 'admin' : (tieneServicios ? 'prestador' : 'cliente');
        
        const suspensionActiva = (suspData || []).find(
          s => s.entidad === 'usuario' && s.entidad_id?.toString() === u.id?.toString() && s.activa
        );

        return {
          ...u,
          nombreCompleto: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.nombre || u.email,
          rol,
          tieneServicios,
          suspendido: suspendedUserIds.has(u.id?.toString()),
          suspensionActiva: suspensionActiva || null,
        };
      });

      setUsuarios(usuariosConRol);
    } catch (err) {
      console.error('Error al cargar datos admin usuarios:', err);
      alert('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const filtrarUsuarios = () => {
    return usuarios.filter((usuario) => {
      const nombre = usuario.nombreCompleto || usuario.nombre;
      const coincideBusqueda =
        nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (usuario.email?.toLowerCase().includes(busqueda.toLowerCase()) ?? false);

      const coincideRol = filtroRol === 'todos' || usuario.rol === filtroRol;

      return coincideBusqueda && coincideRol;
    });
  };

  const usuariosFiltrados = filtrarUsuarios();
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / usuariosPorPagina));
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * usuariosPorPagina,
    paginaActual * usuariosPorPagina
  );

  const resumenUsuarios = {
    total: usuarios.length,
    admin: usuarios.filter((u) => u.rol === 'admin').length,
    cliente: usuarios.filter((u) => u.rol === 'cliente').length,
    prestador: usuarios.filter((u) => u.rol === 'prestador').length,
  };

  const handleEditar = (usuario) => {
    setUsuarioEditar(usuario);
    setFormData({
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      email: usuario.email || '',
      telefono: usuario.telefono || '',
    });
  };

  const handleGuardarEdicion = async () => {
    if (!usuarioEditar) return;

    try {
      const { error } = await supabase
        .from('perfiles_usuarios')
        .update(formData)
        .eq('id', usuarioEditar.id);

      if (error) throw error;

      await fetchAll();
      setUsuarioEditar(null);
      alert('Usuario actualizado correctamente.');
    } catch (err) {
      console.error('Error editando usuario:', err);
      alert('Error al editar usuario.');
    }
  };

  const abrirModalSuspension = (usuario) => {
    setUsuarioSuspender(usuario);
    setTipoSuspension('permanente');
    setDiasSuspension(7);
    setMotivoSuspension('');
    setMostrarModalSuspension(true);
  };

  const handleConfirmarSuspension = async () => {
    if (!usuarioSuspender) return;

    if (!motivoSuspension.trim()) {
      alert('Debes ingresar un motivo para la suspensión.');
      return;
    }

    try {
      const ahora = new Date();
      let fechaFin = null;
      let diasSusp = null;

      if (tipoSuspension === 'temporal') {
        diasSusp = parseInt(diasSuspension) || 7;
        fechaFin = new Date(ahora.getTime() + diasSusp * 24 * 60 * 60 * 1000);
      }

      const { error: suspErr } = await supabase.from('suspensiones').insert([{
        entidad: 'usuario',
        entidad_id: usuarioSuspender.id,
        motivo: motivoSuspension.trim(),
        tipo_suspension: tipoSuspension,
        dias_suspension: diasSusp,
        fecha_inicio: ahora.toISOString(),
        fecha_fin: fechaFin ? fechaFin.toISOString() : null,
        activa: true,
        creado_por: user?.id || null,
      }]);

      if (suspErr) throw suspErr;

      const { error: perfilErr } = await supabase
        .from('perfiles_usuarios')
        .update({ estado: 'suspendido' })
        .eq('id', usuarioSuspender.id);

      if (perfilErr) throw perfilErr;

      const { error: servErr } = await supabase
        .from('servicios')
        .update({ estado: 'suspendido', suspendido_por: 'admin' })
        .eq('usuario_id', usuarioSuspender.id);

      if (servErr) throw servErr;

      await fetchAll();
      setMostrarModalSuspension(false);
      setUsuarioSuspender(null);
      alert('Usuario suspendido correctamente.');
    } catch (err) {
      console.error('Error al suspender usuario:', err);
      alert('Error al suspender usuario.');
    }
  };

  const handleReactivar = async (usuario) => {
    if (!window.confirm(`¿Confirmas reactivar a ${usuario.nombreCompleto}?`)) return;

    try {
      const { error: suspErr } = await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('entidad', 'usuario')
        .eq('entidad_id', usuario.id)
        .eq('activa', true);

      if (suspErr) throw suspErr;

      const { error: perfilErr } = await supabase
        .from('perfiles_usuarios')
        .update({ estado: 'activo' })
        .eq('id', usuario.id);

      if (perfilErr) throw perfilErr;

      const { error: servErr } = await supabase
        .from('servicios')
        .update({ estado: 'activo', suspendido_por: null })
        .eq('usuario_id', usuario.id);

      if (servErr) throw servErr;

      await fetchAll();
      alert('Usuario reactivado correctamente.');
    } catch (err) {
      console.error('Error reactivando usuario:', err);
      alert('Error al reactivar usuario.');
    }
  };

  const handleEliminar = async (usuario) => {
    if (!window.confirm(
      `⚠️ ELIMINAR A ${usuario.nombreCompleto}\n\n` +
      `Esto eliminará:\n` +
      `• Su cuenta de autenticación\n` +
      `• Todos sus servicios (${servicios.filter(s => s.usuario_id === usuario.id).length})\n` +
      `• Sus membresías\n` +
      `• Sus opiniones\n` +
      `• Sus notificaciones\n\n` +
      `¿Confirmas esta acción IRREVERSIBLE?`
    )) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('eliminar_usuario_completo', {
        p_usuario_id: usuario.id
      });

      if (error) {
        console.error('❌ Error RPC:', error);
        throw error;
      }

      if (data.success) {
        alert(
          `✅ Usuario eliminado completamente\n\n` +
          `Datos eliminados:\n` +
          `• Servicios: ${data.datos_eliminados.servicios}\n` +
          `• Membresías: ${data.datos_eliminados.membresias}\n` +
          `• Opiniones: ${data.datos_eliminados.opiniones}\n` +
          `• Notificaciones: ${data.datos_eliminados.notificaciones}\n` +
          `• Suspensiones: ${data.datos_eliminados.suspensiones}`
        );
        await fetchAll();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('❌ Error eliminando usuario:', err);
      alert(`Error al eliminar usuario: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!usuarios.length && busqueda === '') {
    return <Loading message="Cargando usuarios..." />;
  }

  return (
    <section className="ua-usuarios-admin">
      <h2 className="ua-usuarios-admin__titulo">Gestión de Usuarios</h2>

      <div className="ua-usuarios-admin__resumen">
        <div className="ua-resumen-card">
          <span className="ua-resumen-card__label">Total</span>
          <strong className="ua-resumen-card__value">{resumenUsuarios.total}</strong>
        </div>
        <div className="ua-resumen-card ua-resumen-card--admin">
          <span className="ua-resumen-card__label">Admins</span>
          <strong className="ua-resumen-card__value">{resumenUsuarios.admin}</strong>
        </div>
        <div className="ua-resumen-card ua-resumen-card--cliente">
          <span className="ua-resumen-card__label">Clientes</span>
          <strong className="ua-resumen-card__value">{resumenUsuarios.cliente}</strong>
        </div>
        <div className="ua-resumen-card ua-resumen-card--prestador">
          <span className="ua-resumen-card__label">Prestadores</span>
          <strong className="ua-resumen-card__value">{resumenUsuarios.prestador}</strong>
        </div>
      </div>

      <div className="ua-usuarios-admin__controles">
        <input
          type="search"
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
          className="ua-input"
        />
        <select
          value={filtroRol}
          onChange={(e) => { setFiltroRol(e.target.value); setPaginaActual(1); }}
          className="ua-select"
        >
          <option value="todos">Todos</option>
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
          <option value="prestador">Prestador</option>
        </select>
      </div>

      <div className="ua-usuarios-admin__lista">
        {loading ? (
          <Loading message="Cargando usuarios..." />
        ) : usuariosPaginados.length === 0 ? (
          <p className="ua-sin-resultados">No se encontraron usuarios.</p>
        ) : (
          usuariosPaginados.map((usuario) => (
            <article key={usuario.id} className="ua-card">
              <div className="ua-card__info">
                <div className="ua-card__header">
                  <h3 className="ua-card__nombre">{usuario.nombreCompleto}</h3>
                  <span className={`ua-badge ua-badge--${usuario.rol}`}>
                    {usuario.rol}
                  </span>
                  {usuario.suspendido && (
                    <span className="ua-badge ua-badge--suspendido">
                      suspendido
                    </span>
                  )}
                </div>
                <p className="ua-card__email">
                  <span className="material-icons ua-card__icon">email</span>
                  {usuario.email}
                </p>
                {usuario.suspendido && usuario.suspensionActiva && (
                  <p className="ua-card__suspension">
                    <span className="material-icons ua-card__icon">info</span>
                    {usuario.suspensionActiva.tipo_suspension === 'temporal' 
                      ? `Suspensión temporal - ${usuario.suspensionActiva.dias_suspension} días` 
                      : 'Suspensión permanente'}
                  </p>
                )}
              </div>
              <div className="ua-card__acciones">
                <button 
                  className="ua-btn ua-btn--editar" 
                  onClick={() => handleEditar(usuario)}
                  title="Editar"
                >
                  <span className="material-icons">edit</span>
                </button>
                {usuario.suspendido ? (
                  <button 
                    className="ua-btn ua-btn--habilitar" 
                    onClick={() => handleReactivar(usuario)}
                    title="Habilitar"
                  >
                    <span className="material-icons">check_circle</span>
                  </button>
                ) : (
                  <button 
                    className="ua-btn ua-btn--suspender" 
                    onClick={() => abrirModalSuspension(usuario)}
                    title="Suspender"
                  >
                    <span className="material-icons">block</span>
                  </button>
                )}
                <button 
                  className="ua-btn ua-btn--eliminar" 
                  onClick={() => handleEliminar(usuario)}
                  title="Eliminar"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {usuarioEditar && (
        <div className="ua-modal-backdrop">
          <div className="ua-modal">
            <h3>Editar Usuario</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <input
              type="text"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
            <div className="ua-modal-actions">
              <button className="ua-btn-guardar" onClick={handleGuardarEdicion}>Guardar</button>
              <button className="ua-btn-cancelar" onClick={() => setUsuarioEditar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalSuspension && usuarioSuspender && (
        <div className="ua-modal-backdrop">
          <div className="ua-modal">
            <h3>Suspender Usuario: {usuarioSuspender.nombreCompleto}</h3>
            
            <label>Tipo de Suspensión:</label>
            <select 
              value={tipoSuspension} 
              onChange={(e) => setTipoSuspension(e.target.value)}
            >
              <option value="permanente">Permanente</option>
              <option value="temporal">Temporal</option>
            </select>

            {tipoSuspension === 'temporal' && (
              <>
                <label>Días de Suspensión:</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={diasSuspension}
                  onChange={(e) => setDiasSuspension(e.target.value)}
                />
              </>
            )}

            <label>Motivo (obligatorio):</label>
            <textarea
              placeholder="Escribe el motivo de la suspensión..."
              value={motivoSuspension}
              onChange={(e) => setMotivoSuspension(e.target.value)}
              rows="4"
            />

            <div className="ua-modal-actions">
              <button className="ua-btn-guardar" onClick={handleConfirmarSuspension}>
                Confirmar Suspensión
              </button>
              <button className="ua-btn-cancelar" onClick={() => {
                setMostrarModalSuspension(false);
                setUsuarioSuspender(null);
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav className="ua-paginacion">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              className={`ua-paginacion__btn ${paginaActual === i + 1 ? 'ua-paginacion__btn--activo' : ''}`}
              onClick={() => setPaginaActual(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
};

export default UsuariosAdmin;