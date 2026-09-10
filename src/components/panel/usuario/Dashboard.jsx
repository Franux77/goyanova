import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import { supabase } from '../../../utils/supabaseClient';
import { useNotifications } from '../../../contexts/NotificationsProvider';
import { useCaracteristicasPlan } from '../../../hooks/useCaracteristicasPlan';
import Loading from '../../loading/Loading';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tiene } = useCaracteristicasPlan();

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [servicios, setServicios] = useState([]);
  const [opinionesCount, setOpinionesCount] = useState(0);
  const [promedioCalificacion, setPromedioCalificacion] = useState('-');
  const [suspensionesCount, setSuspensionesCount] = useState(0);
  const [membresia, setMembresia] = useState(null);
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
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre, apellido')
          .eq('id', user.id)
          .single();
        setNombreUsuario(perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Usuario');

        const { data: serviciosData } = await supabase
          .from('servicios')
          .select('*')
          .eq('usuario_id', user.id)
          .order('creado_en', { ascending: false });
        setServicios(serviciosData || []);
        const servicioIds = serviciosData?.map((s) => s.id).filter(Boolean) || [];

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

        const { count: suspCount } = await supabase
          .from('suspensiones')
          .select('*', { count: 'exact', head: true })
          .eq('entidad_id', user.id);
        setSuspensionesCount(suspCount || 0);

        const { data: membresiaData } = await supabase.rpc('obtener_membresia_usuario', {
          p_usuario_id: user.id
        });
        setMembresia(membresiaData);
      } catch {
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
    } catch {
      // Error silencioso
    }
  };

  const eliminarNotificacion = async (notifId) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    try {
      await supabase.from('notificaciones').delete().eq('id', notifId);
      notifCtx.refresh?.();
    } catch {
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
    } catch {
      // Error silencioso
    }
  };

  const eliminarTodas = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;
    try {
      await supabase.from('notificaciones').delete().eq('usuario_id', user.id);
      notifCtx.refresh?.();
    } catch {
      // Error silencioso
    }
  };

  const handleIrAPublicar = async () => {
    try {
      const { data, error } = await supabase.rpc('puede_publicar_servicio', {
        p_usuario_id: user.id
      });
      if (error) throw error;

      if (data.puede_publicar) {
        navigate('/panel/publicar');
      } else {
        navigate('/panel/mi-membresia');
      }
    } catch {
      navigate('/publicar');
    }
  };

  const getIconoNotificacion = (tipo) => {
    const iconos = {
      advertencia: { icon: 'warning', color: '#FBBF24' },
      suspension: { icon: 'block', color: '#F87171' },
      eliminacion: { icon: 'delete', color: '#F87171' },
      info: { icon: 'check_circle', color: '#34D399' },
      opinion: { icon: 'forum', color: '#38BDF8' },
      respuesta: { icon: 'reply', color: '#A78BFA' },
      exito: { icon: 'celebration', color: '#34D399' },
      error: { icon: 'error', color: '#F87171' }
    };
    return iconos[tipo] || { icon: 'notifications', color: '#94A3B8' };
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

  if (loading) {
    return <Loading message="Cargando tu dashboard..." />;
  }

  const nombrePlan = membresia?.tiene_membresia
    ? (membresia.es_premium ? (membresia.badge || 'Plan activo') : 'Plan Free')
    : 'Plan Free';

  const accesos = [
    { icono: 'add_circle', label: 'Publicar servicio', onClick: handleIrAPublicar },
    { icono: 'inventory_2', label: 'Mis servicios', to: '/panel/mis-servicios' },
    { icono: 'card_membership', label: 'Mi membresía', to: '/panel/mi-membresia' },
    { icono: 'verified', label: 'Badge Verificado', to: '/panel/verificacion', soloSiTiene: 'requiere_validacion_identidad' },
    { icono: 'star', label: 'Opiniones', to: '/panel/opiniones' },
    { icono: 'person', label: 'Mi perfil', to: '/panel/perfil' },
    { icono: 'help', label: 'Ayuda / Soporte', to: '/panel/ayuda' },
  ].filter(a => !a.soloSiTiene || tiene(a.soloSiTiene));

  return (
    <div className="dash-root">
      <div className="dash-header">
        <h1>Hola, {nombreUsuario}</h1>
        <p>Este es el estado de tu cuenta en GoyaNova.</p>
      </div>

      {/* Panel de plan actual */}
      <div className="dash-plan-hero">
        <div className="dash-plan-glow" />
        <div className="dash-plan-info">
          <span className="dash-plan-icon material-icons">
            {membresia?.es_premium ? 'diamond' : 'bolt'}
          </span>
          <div>
            <span className="dash-plan-eyebrow">Tu plan</span>
            <strong>{nombrePlan}</strong>
            {membresia?.es_premium && membresia?.dias_restantes != null && (
              <p>{Math.floor(membresia.dias_restantes)} días restantes</p>
            )}
          </div>
        </div>
        <button className="dash-plan-btn" onClick={() => navigate('/panel/mi-membresia')}>
          {membresia?.es_premium ? 'Gestionar plan' : 'Mejorar plan'}
          <span className="material-icons">arrow_forward</span>
        </button>
      </div>

      {/* Accesos directos */}
      <div className="dash-accesos-grid">
        {accesos.map((a, i) => (
          <button
            key={a.label}
            className="dash-acceso"
            style={{ '--delay': `${i * 0.05}s` }}
            onClick={a.onClick || (() => navigate(a.to))}
          >
            <span className="material-icons">{a.icono}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Estadísticas */}
      <div className="dash-stats-grid">
        <div className="dash-stat">
          <span className="material-icons">work</span>
          <div>
            <h3>{servicios.length}</h3>
            <p>Servicios publicados</p>
          </div>
        </div>
        <div className="dash-stat">
          <span className="material-icons">forum</span>
          <div>
            <h3>{opinionesCount}</h3>
            <p>Opiniones recibidas</p>
          </div>
        </div>
        <div className="dash-stat">
          <span className="material-icons">star</span>
          <div>
            <h3>{promedioCalificacion}</h3>
            <p>Calificación promedio</p>
          </div>
        </div>
        <div className="dash-stat">
          <span className="material-icons">pause_circle</span>
          <div>
            <h3>{suspensionesCount}</h3>
            <p>Servicios suspendidos</p>
          </div>
        </div>
        <div className="dash-stat">
          <span className="material-icons">notifications</span>
          <div>
            <h3>{unreadCount}</h3>
            <p>Notificaciones pendientes</p>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="dash-notif-panel">
        <div className="dash-notif-header">
          <h2>
            <span className="material-icons">notifications</span>
            Notificaciones
          </h2>
          {ctxNotifications.length > 0 && (
            <div className="dash-notif-actions">
              {unreadCount > 0 && (
                <button className="dash-btn-chip" onClick={marcarTodasLeidas}>
                  <span className="material-icons">check_circle</span>
                  <span className="dash-btn-text">Marcar leídas</span>
                </button>
              )}
              <button className="dash-btn-chip danger" onClick={eliminarTodas}>
                <span className="material-icons">delete</span>
                <span className="dash-btn-text">Eliminar</span>
              </button>
            </div>
          )}
        </div>

        {ctxNotifications.length === 0 ? (
          <div className="dash-notif-vacio">
            <span className="material-icons">notifications_off</span>
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <>
            <div className="dash-notif-lista">
              {notificacionesMostradas.map((notif) => {
                const { icon, color } = getIconoNotificacion(notif.tipo);
                const isExpanded = notifExpandida === notif.id;
                const mensajeLargo = notif.mensaje && notif.mensaje.length > 80;

                return (
                  <div key={notif.id} className={`dash-notif-item ${!notif.leida ? 'no-leida' : ''}`}>
                    <span className="dash-notif-barra" style={{ background: color }} />
                    <div className="dash-notif-icon" style={{ color }}>
                      <span className="material-icons">{icon}</span>
                    </div>

                    <div className="dash-notif-contenido" onClick={() => !notif.leida && marcarComoLeida(notif.id)}>
                      <div className="dash-notif-top">
                        <h4>{notif.titulo || 'Notificación'}</h4>
                        <span>{formatearFecha(notif.creada_en)}</span>
                      </div>
                      <p>{isExpanded ? notif.mensaje : truncarTexto(notif.mensaje, 80)}</p>
                      {mensajeLargo && (
                        <button
                          className="dash-notif-vermas"
                          onClick={(e) => { e.stopPropagation(); setNotifExpandida(isExpanded ? null : notif.id); }}
                        >
                          {isExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>

                    <button className="dash-notif-eliminar" onClick={() => eliminarNotificacion(notif.id)}>
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {ctxNotifications.length > 5 && (
              <button className="dash-btn-vertodas" onClick={() => setMostrandoTodas(!mostrandoTodas)}>
                <span className="material-icons">{mostrandoTodas ? 'expand_less' : 'expand_more'}</span>
                {mostrandoTodas ? 'Ver menos' : `Ver ${ctxNotifications.length - 5} más`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;