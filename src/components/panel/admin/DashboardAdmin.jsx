import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { 
  FiBriefcase, 
  FiStar, 
  FiMessageSquare, 
  FiBell,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiTrash2
} from 'react-icons/fi';
import './DashboardAdmin.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
  totalServicios: 0,
  serviciosActivos: 0,
  totalOpiniones: 0,
  promedioRating: 0,
  totalUsuarios: 0
});

  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrandoTodas, setMostrandoTodas] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
  setLoading(true);
  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    // 📊 Total servicios en toda la plataforma
    const { data: servicios } = await supabase
      .from('servicios')
      .select('id, estado');

    const serviciosActivos = servicios?.filter(s => s.estado === 'activo').length || 0;

    // ⭐ Total opiniones en toda la plataforma
    const { data: opiniones } = await supabase
      .from('opiniones')
      .select('puntuacion');

    const totalOpiniones = opiniones?.length || 0;
    const sumaRatings = opiniones?.reduce((sum, op) => sum + (op.puntuacion || 0), 0) || 0;

    // 👤 Total usuarios
    const { data: usuarios } = await supabase
      .from('perfiles_usuarios')
      .select('id');

    // 🔔 Cargar notificaciones del admin
    const { data: notifs } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('creada_en', { ascending: false });

    const notificacionesNoLeidas = notifs?.filter(n => !n.leida).length || 0;

    setStats({
      totalServicios: servicios?.length || 0,
      serviciosActivos,
      totalOpiniones,
      promedioRating: totalOpiniones > 0 ? (sumaRatings / totalOpiniones).toFixed(1) : 0,
      totalUsuarios: usuarios?.length || 0,
      notificacionesNoLeidas
    });

    setNotificaciones(notifs || []);

  } catch (err) {
    console.error('Error al cargar dashboard admin:', err);
  } finally {
    setLoading(false);
  }
};

  const marcarComoLeida = async (notifId) => {
    try {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notifId);

      setNotificaciones(prev =>
        prev.map(n => n.id === notifId ? { ...n, leida: true } : n)
      );

      setStats(prev => ({
        ...prev,
        notificacionesNoLeidas: Math.max(0, prev.notificacionesNoLeidas - 1)
      }));
    } catch (err) {
      console.error('Error al marcar notificación:', err);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true }))
      );

      setStats(prev => ({ ...prev, notificacionesNoLeidas: 0 }));
    } catch (err) {
      console.error('Error al marcar todas:', err);
    }
  };

  const eliminarNotificacion = async (notifId) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;

    try {
      await supabase.from('notificaciones').delete().eq('id', notifId);
      
      const notifEliminada = notificaciones.find(n => n.id === notifId);
      
      setNotificaciones(prev => prev.filter(n => n.id !== notifId));
      
      if (!notifEliminada?.leida) {
        setStats(prev => ({
          ...prev,
          notificacionesNoLeidas: Math.max(0, prev.notificacionesNoLeidas - 1)
        }));
      }
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const eliminarTodas = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('notificaciones')
        .delete()
        .eq('usuario_id', user.id);

      setNotificaciones([]);
      setStats(prev => ({ ...prev, notificacionesNoLeidas: 0 }));
    } catch (err) {
      console.error('Error al eliminar todas:', err);
    }
  };

  const getIconoNotificacion = (tipo) => {
    const iconos = {
      'advertencia': <FiAlertCircle size={20} color="#ff9800" />,
      'suspension': <FiAlertCircle size={20} color="#f44336" />,
      'eliminacion': <FiAlertCircle size={20} color="#d32f2f" />,
      'info': <FiCheckCircle size={20} color="#4caf50" />,
      'opinion': <FiMessageSquare size={20} color="#2196f3" />,
      'respuesta': <FiMessageSquare size={20} color="#9c27b0" />
    };
    return iconos[tipo] || <FiBell size={20} color="#757575" />;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    if (diffDias < 7) return `Hace ${diffDias}d`;
    
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const notificacionesMostradas = mostrandoTodas 
    ? notificaciones 
    : notificaciones.slice(0, 5);

  if (loading) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Panel de Control</h1>
        <p className="dashboard-subtitle">Resumen de tu actividad</p>
      </div>

      {/* 📊 ESTADÍSTICAS */}
      <div className="stats-grid">
        <div className="stat-cardd">
  <div className="stat-icon briefcase">
    <FiBriefcase size={24} />
  </div>
  <div className="stat-content">
    <h3>{stats.totalServicios}</h3>
    <p>Servicios Totales</p>
    <span className="stat-detail">{stats.serviciosActivos} activos</span>
  </div>
</div>

<div className="stat-cardd">
  <div className="stat-icon star">
    <FiStar size={24} />
  </div>
  <div className="stat-content">
    <h3>{stats.promedioRating}</h3>
    <p>Calificación Promedio</p>
    <span className="stat-detail">De {stats.totalOpiniones} opiniones</span>
  </div>
</div>

<div className="stat-cardd">
  <div className="stat-icon message">
    <FiMessageSquare size={24} />
  </div>
  <div className="stat-content">
    <h3>{stats.totalUsuarios}</h3>
    <p>Usuarios Registrados</p>
    <span className="stat-detail">En toda la plataforma</span>
  </div>
</div>


        <div className="stat-cardd">
          <div className="stat-icon bell">
            <FiBell size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.notificacionesNoLeidas}</h3>
            <p>Notificaciones Nuevas</p>
            <span className="stat-detail">Sin leer</span>
          </div>
        </div>
      </div>

      {/* 🔔 NOTIFICACIONES */}
      <div className="notificaciones-section">
        <div className="notificaciones-header">
          <h2>
            <FiBell size={22} />
            Notificaciones Recientes
          </h2>
          {notificaciones.length > 0 && (
            <div className="notif-acciones-header">
              {stats.notificacionesNoLeidas > 0 && (
                <button 
                  className="btn-marcar-todas"
                  onClick={marcarTodasComoLeidas}
                >
                  <FiCheckCircle size={16} />
                  Marcar todas leídas
                </button>
              )}
              <button 
                className="btn-eliminar-todas"
                onClick={eliminarTodas}
              >
                <FiTrash2 size={16} />
                Eliminar todas
              </button>
            </div>
          )}
        </div>

        {notificaciones.length === 0 ? (
          <div className="notificaciones-vacio">
            <FiBell size={48} color="#ccc" />
            <p>No tienes notificaciones</p>
          </div>
        ) : (
          <>
            <div className="notificaciones-lista">
              {notificacionesMostradas.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notificacion-item ${!notif.leida ? 'no-leida' : ''}`}
                >
                  <div className="notif-icon">
                    {getIconoNotificacion(notif.tipo)}
                  </div>
                  <div 
                    className="notif-content"
                    onClick={() => !notif.leida && marcarComoLeida(notif.id)}
                    style={{ cursor: !notif.leida ? 'pointer' : 'default' }}
                  >
                    <h4>{notif.titulo}</h4>
                    <p>{notif.mensaje}</p>
                    <span className="notif-fecha">{formatearFecha(notif.creada_en)}</span>
                  </div>
                  {!notif.leida && <div className="notif-badge"></div>}
                  <button
                    className="btn-eliminar-notif"
                    onClick={() => eliminarNotificacion(notif.id)}
                    title="Eliminar notificación"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {notificaciones.length > 5 && (
              <button 
                className="btn-ver-mas"
                onClick={() => setMostrandoTodas(!mostrandoTodas)}
              >
                {mostrandoTodas ? (
                  <>
                    <FiChevronUp size={18} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <FiChevronDown size={18} />
                    Ver todas ({notificaciones.length - 5} más)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;