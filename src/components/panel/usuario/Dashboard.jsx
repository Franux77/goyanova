import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { supabase } from '../../../utils/supabaseClient';
import { useNotifications } from '../../../contexts/NotificationsProvider';
import Loading from '../../loading/Loading'; // 👈 IMPORTAR
import { 
  FiBriefcase, 
  FiStar, 
  FiMessageSquare, 
  FiBell,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiPauseCircle,
  FiMoreVertical
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [servicios, setServicios] = useState([]);
  const [opinionesCount, setOpinionesCount] = useState(0);
  const [promedioCalificacion, setPromedioCalificacion] = useState('-');
  const [suspensionesCount, setSuspensionesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mostrandoTodas, setMostrandoTodas] = useState(false);
  const [notifExpandida, setNotifExpandida] = useState(null);

  const notifCtx = useNotifications();
  const { notifications: ctxNotifications = [], unreadCount = 0 } = notifCtx || {};

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // PERFIL DEL USUARIO
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre, apellido')
          .eq('id', user.id)
          .single();
        setNombreUsuario(perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Usuario');

        // SERVICIOS
        const { data: serviciosData } = await supabase
          .from('servicios')
          .select('*')
          .eq('usuario_id', user.id)
          .order('creado_en', { ascending: false });
        setServicios(serviciosData || []);
        const servicioIds = serviciosData?.map((s) => s.id).filter(Boolean) || [];

        // OPINIONES
        if (servicioIds.length > 0) {
          const { data: opiniones } = await supabase
            .from('opiniones')
            .select('puntuacion')
            .in('servicio_id', servicioIds);

          setOpinionesCount(opiniones?.length || 0);

          if (opiniones?.length > 0) {
            const promedio =
              opiniones.reduce((acc, o) => acc + (o.puntuacion || 0), 0) / opiniones.length;
            setPromedioCalificacion(promedio.toFixed(1));
          } else {
            setPromedioCalificacion('-');
          }
        } else {
          setOpinionesCount(0);
          setPromedioCalificacion('-');
        }

        // SUSPENSIONES
        const { count: suspCount } = await supabase
          .from('suspensiones')
          .select('*', { count: 'exact', head: true })
          .eq('entidad_id', user.id);
        setSuspensionesCount(suspCount || 0);
      } catch (err) {
        // Error silencioso
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const marcarComoLeida = async (notifId) => {
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', notifId);
      notifCtx.refresh?.();
    } catch (err) {
      // Error silencioso
    }
  };

  const eliminarNotificacion = async (notifId) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    
    try {
      await supabase.from('notificaciones').delete().eq('id', notifId);
      notifCtx.refresh?.();
    } catch (err) {
      // Error silencioso
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);
      notifCtx.refresh?.();
    } catch (err) {
      // Error silencioso
    }
  };

  const eliminarTodas = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;
    
    try {
      await supabase.from('notificaciones').delete().eq('usuario_id', user.id);
      notifCtx.refresh?.();
    } catch (err) {
      // Error silencioso
    }
  };

  const getIconoNotificacion = (tipo) => {
    const iconos = {
      'advertencia': { icon: <FiAlertCircle size={16} />, color: '#ff9800' },
      'suspension': { icon: <FiAlertCircle size={16} />, color: '#f44336' },
      'eliminacion': { icon: <FiAlertCircle size={16} />, color: '#d32f2f' },
      'info': { icon: <FiCheckCircle size={16} />, color: '#4caf50' },
      'opinion': { icon: <FiMessageSquare size={16} />, color: '#2196f3' },
      'respuesta': { icon: <FiMessageSquare size={16} />, color: '#9c27b0' }
    };
    return iconos[tipo] || { icon: <FiBell size={16} />, color: '#757575' };
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const truncarTexto = (texto, limite = 80) => {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };

  const notificacionesMostradas = mostrandoTodas 
    ? ctxNotifications 
    : ctxNotifications.slice(0, 5);

  // 👇 REEMPLAZAR ESTE BLOQUE
  if (loading) {
    return <Loading message="Cargando tu dashboard..." />;
  }

  return (
    <div className="usuario-dashboard-container">
      <div className="usuario-dashboard-header">
        <h1>¡Hola, {nombreUsuario}!</h1>
        <p className="usuario-dashboard-subtitle">Resumen de tu actividad en la plataforma.</p>
      </div>

      {/* 📊 ESTADÍSTICAS */}
      <div className="usuario-stats-grid">
        <div className="usuario-stat-card">
          <div className="usuario-stat-icon briefcase">
            <FiBriefcase size={24} />
          </div>
          <div className="usuario-stat-content">
            <h3>{servicios.length}</h3>
            <p>Servicios Publicados</p>
          </div>
        </div>

        <div className="usuario-stat-card">
          <div className="usuario-stat-icon star">
            <FiStar size={24} />
          </div>
          <div className="usuario-stat-content">
            <h3>{opinionesCount}</h3>
            <p>Opiniones Recibidas</p>
          </div>
        </div>

        <div className="usuario-stat-card">
          <div className="usuario-stat-icon rating">
            <FiStar size={24} />
          </div>
          <div className="usuario-stat-content">
            <h3>{promedioCalificacion}</h3>
            <p>Promedio Calificación</p>
          </div>
        </div>

        <div className="usuario-stat-card">
          <div className="usuario-stat-icon pause">
            <FiPauseCircle size={24} />
          </div>
          <div className="usuario-stat-content">
            <h3>{suspensionesCount}</h3>
            <p>Servicios Suspendidos</p>
          </div>
        </div>

        <div className="usuario-stat-card">
          <div className="usuario-stat-icon bell">
            <FiBell size={24} />
          </div>
          <div className="usuario-stat-content">
            <h3>{unreadCount}</h3>
            <p>Notificaciones Pendientes</p>
          </div>
        </div>
      </div>

      {/* 🔔 NOTIFICACIONES */}
      <div className="usuario-notificaciones-section">
        <div className="usuario-notificaciones-header">
          <h2>
            <FiBell size={20} />
            Notificaciones
          </h2>
          {ctxNotifications.length > 0 && (
            <div className="usuario-notif-acciones-header">
              {unreadCount > 0 && (
                <button 
                  className="usuario-btn-header-action"
                  onClick={marcarTodasLeidas}
                  title="Marcar todas como leídas"
                >
                  <FiCheckCircle size={16} />
                  <span className="btn-text-desktop">Marcar leídas</span>
                </button>
              )}
              <button 
                className="usuario-btn-header-action eliminar"
                onClick={eliminarTodas}
                title="Eliminar todas"
              >
                <FiTrash2 size={16} />
                <span className="btn-text-desktop">Eliminar</span>
              </button>
            </div>
          )}
        </div>

        {ctxNotifications.length === 0 ? (
          <div className="usuario-notificaciones-vacio">
            <FiBell size={40} color="#ccc" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <>
            <div className="usuario-notificaciones-lista-compacta">
              {notificacionesMostradas.map((notif) => {
                const { icon, color } = getIconoNotificacion(notif.tipo);
                const isExpanded = notifExpandida === notif.id;
                const mensajeLargo = notif.mensaje && notif.mensaje.length > 80;
                
                return (
                  <div 
                    key={notif.id} 
                    className={`usuario-notif-item-compacta ${!notif.leida ? 'no-leida' : ''}`}
                  >
                    <div className="usuario-notif-icono-compacto" style={{ color }}>
                      {icon}
                    </div>
                    
                    <div 
                      className="usuario-notif-contenido-compacto"
                      onClick={() => !notif.leida && marcarComoLeida(notif.id)}
                    >
                      <div className="usuario-notif-titulo-fecha">
                        <h4>{notif.titulo || 'Notificación'}</h4>
                        <span className="usuario-notif-fecha-compacta">
                          {formatearFecha(notif.creada_en)}
                        </span>
                      </div>
                      
                      <p className="usuario-notif-mensaje-compacto">
                        {isExpanded ? notif.mensaje : truncarTexto(notif.mensaje, 80)}
                      </p>
                      
                      {mensajeLargo && (
                        <button 
                          className="usuario-btn-ver-mas-texto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifExpandida(isExpanded ? null : notif.id);
                          }}
                        >
                          {isExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>

                    <div className="usuario-notif-acciones-compactas">
                      {!notif.leida && (
                        <div className="usuario-notif-badge-mini"></div>
                      )}
                      <button
                        className="usuario-btn-eliminar-mini"
                        onClick={() => eliminarNotificacion(notif.id)}
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {ctxNotifications.length > 5 && (
              <button 
                className="usuario-btn-toggle-todas"
                onClick={() => setMostrandoTodas(!mostrandoTodas)}
              >
                {mostrandoTodas ? (
                  <>
                    <FiChevronUp size={16} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <FiChevronDown size={16} />
                    Ver {ctxNotifications.length - 5} más
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