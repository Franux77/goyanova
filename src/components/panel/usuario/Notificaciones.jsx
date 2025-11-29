import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { AuthContext } from '../../../auth/AuthContext';
import { 
  FiBell,
  FiAlertCircle,
  FiCheckCircle,
  FiMessageSquare,
  FiTrash2,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import './Notificaciones.css';

const Notificaciones = () => {
  const { user } = useContext(AuthContext);
  const [notificaciones, setNotificaciones] = useState([]);
  const [toast, setToast] = useState(null);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [notifExpandida, setNotifExpandida] = useState(null);
  const [filtro, setFiltro] = useState('todas'); // todas, leidas, no-leidas
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchNotificaciones = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('creada_en', { ascending: false });

      if (!error) setNotificaciones(data || []);
      setLoading(false);
    };
    fetchNotificaciones();

    const channel = supabase
      .channel('notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          const nuevaNotif = payload.new;
          setNotificaciones((prev) => [nuevaNotif, ...prev]);

          if (!nuevaNotif.leida) {
            setToast(null);
            setTimeout(() => setToast(nuevaNotif), 0);
            setTimeout(() => setToast(null), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const marcarComoLeido = async (id) => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);

    if (!error) {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    }
  };

  const eliminarNotificacion = async (id) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    
    const { error } = await supabase.from('notificaciones').delete().eq('id', id);
    if (!error) {
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      setSeleccionadas((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const seleccionarTodas = () => {
    const notifsFiltradas = notificacionesFiltradas.map(n => n.id);
    setSeleccionadas(notifsFiltradas);
  };

  const deseleccionarTodas = () => {
    setSeleccionadas([]);
  };

  const marcarSeleccionadasLeidas = async () => {
    if (seleccionadas.length === 0) return;
    await supabase.from('notificaciones').update({ leida: true }).in('id', seleccionadas);
    setNotificaciones((prev) =>
      prev.map((n) =>
        seleccionadas.includes(n.id) ? { ...n, leida: true } : n
      )
    );
    setSeleccionadas([]);
  };

  const eliminarSeleccionadas = async () => {
    if (seleccionadas.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionadas.length} notificaciones seleccionadas?`)) return;
    
    await supabase.from('notificaciones').delete().in('id', seleccionadas);
    setNotificaciones((prev) => prev.filter((n) => !seleccionadas.includes(n.id)));
    setSeleccionadas([]);
  };

  const marcarTodasLeidas = async () => {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', user.id)
      .eq('leida', false);
    
    setNotificaciones((prev) =>
      prev.map((n) => ({ ...n, leida: true }))
    );
  };

  const eliminarTodas = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;
    
    await supabase.from('notificaciones').delete().eq('usuario_id', user.id);
    setNotificaciones([]);
    setSeleccionadas([]);
  };

  const getIconoNotificacion = (tipo) => {
    const iconos = {
      'advertencia': { icon: <FiAlertCircle size={18} />, color: '#ff9800' },
      'suspension': { icon: <FiAlertCircle size={18} />, color: '#f44336' },
      'eliminacion': { icon: <FiAlertCircle size={18} />, color: '#d32f2f' },
      'info': { icon: <FiCheckCircle size={18} />, color: '#4caf50' },
      'opinion': { icon: <FiMessageSquare size={18} />, color: '#2196f3' },
      'respuesta': { icon: <FiMessageSquare size={18} />, color: '#9c27b0' }
    };
    return iconos[tipo] || { icon: <FiBell size={18} />, color: '#757575' };
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
    
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncarTexto = (texto, limite = 100) => {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };

  // Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtro === 'leidas') return n.leida;
    if (filtro === 'no-leidas') return !n.leida;
    return true;
  });

  const noleidas = notificaciones.filter(n => !n.leida).length;

  if (loading) {
    return (
      <div className="notif-pro-loading">
        <FiBell size={48} color="#1774f6" />
        <p>Cargando notificaciones...</p>
      </div>
    );
  }

  return (
    <div className="notif-pro-wrapper">
      {/* HEADER */}
      <div className="notif-pro-header">
        <div className="notif-pro-titulo">
          <h2>
            <FiBell size={24} />
            Notificaciones
          </h2>
          {noleidas > 0 && (
            <span className="notif-pro-badge-count">{noleidas}</span>
          )}
        </div>

        {notificaciones.length > 0 && (
          <div className="notif-pro-acciones-principales">
            {noleidas > 0 && (
              <button 
                className="notif-pro-btn-action primary"
                onClick={marcarTodasLeidas}
              >
                <FiCheckCircle size={16} />
                <span>Marcar todas leídas</span>
              </button>
            )}
            <button 
              className="notif-pro-btn-action danger"
              onClick={eliminarTodas}
            >
              <FiTrash2 size={16} />
              <span>Eliminar todas</span>
            </button>
          </div>
        )}
      </div>

      {/* FILTROS Y SELECCIÓN */}
      {notificaciones.length > 0 && (
        <div className="notif-pro-controles">
          <div className="notif-pro-filtros">
            <button 
              className={`notif-filtro-btn ${filtro === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas ({notificaciones.length})
            </button>
            <button 
              className={`notif-filtro-btn ${filtro === 'no-leidas' ? 'active' : ''}`}
              onClick={() => setFiltro('no-leidas')}
            >
              No leídas ({noleidas})
            </button>
            <button 
              className={`notif-filtro-btn ${filtro === 'leidas' ? 'active' : ''}`}
              onClick={() => setFiltro('leidas')}
            >
              Leídas ({notificaciones.length - noleidas})
            </button>
          </div>

          {seleccionadas.length > 0 && (
            <div className="notif-pro-acciones-masivas">
              <span className="notif-seleccionadas-count">
                {seleccionadas.length} seleccionadas
              </span>
              <button onClick={marcarSeleccionadasLeidas}>
                <FiCheck size={14} />
                Marcar leídas
              </button>
              <button onClick={eliminarSeleccionadas}>
                <FiTrash2 size={14} />
                Eliminar
              </button>
              <button onClick={deseleccionarTodas}>
                <FiX size={14} />
                Cancelar
              </button>
            </div>
          )}

          {notificacionesFiltradas.length > 0 && (
            <div className="notif-pro-seleccion-rapida">
              <button onClick={seleccionarTodas}>
                Seleccionar todas
              </button>
              {seleccionadas.length > 0 && (
                <button onClick={deseleccionarTodas}>
                  Deseleccionar todas
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* LISTA DE NOTIFICACIONES */}
      {notificacionesFiltradas.length === 0 ? (
        <div className="notif-pro-vacio">
          <FiBell size={56} color="#ccc" />
          <p>
            {filtro === 'todas' && 'No hay notificaciones'}
            {filtro === 'leidas' && 'No hay notificaciones leídas'}
            {filtro === 'no-leidas' && 'No hay notificaciones pendientes'}
          </p>
        </div>
      ) : (
        <div className="notif-pro-lista">
          {notificacionesFiltradas.map((notif) => {
            const { icon, color } = getIconoNotificacion(notif.tipo);
            const isExpanded = notifExpandida === notif.id;
            const mensajeLargo = notif.mensaje && notif.mensaje.length > 100;
            const isSelected = seleccionadas.includes(notif.id);

            return (
              <div 
                key={notif.id} 
                className={`notif-pro-card ${!notif.leida ? 'no-leida' : ''} ${isSelected ? 'seleccionada' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSeleccion(notif.id)}
                  className="notif-pro-checkbox"
                />

                <div className="notif-pro-icono" style={{ color }}>
                  {icon}
                </div>

                <div 
                  className="notif-pro-contenido"
                  onClick={() => !notif.leida && marcarComoLeido(notif.id)}
                >
                  <div className="notif-pro-titulo-fecha">
                    <h4>{notif.titulo || 'Notificación'}</h4>
                    <span className="notif-pro-fecha">
                      {formatearFecha(notif.creada_en)}
                    </span>
                  </div>

                  <p className="notif-pro-mensaje">
                    {isExpanded ? notif.mensaje : truncarTexto(notif.mensaje, 100)}
                  </p>

                  {mensajeLargo && (
                    <button 
                      className="notif-pro-btn-expandir"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifExpandida(isExpanded ? null : notif.id);
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <FiChevronUp size={14} />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <FiChevronDown size={14} />
                          Ver más
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="notif-pro-acciones">
                  {!notif.leida && (
                    <button
                      className="notif-pro-btn-marcar"
                      onClick={() => marcarComoLeido(notif.id)}
                      title="Marcar como leída"
                    >
                      <FiCheck size={16} />
                    </button>
                  )}
                  <button
                    className="notif-pro-btn-eliminar"
                    onClick={() => eliminarNotificacion(notif.id)}
                    title="Eliminar"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>

                {!notif.leida && (
                  <div className="notif-pro-badge-indicator"></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="notif-pro-toast">
          <div className="notif-toast-icono" style={{ color: getIconoNotificacion(toast.tipo).color }}>
            {getIconoNotificacion(toast.tipo).icon}
          </div>
          <div className="notif-toast-contenido">
            <strong>{toast.titulo}</strong>
            <p>{truncarTexto(toast.mensaje, 60)}</p>
          </div>
          <button 
            className="notif-toast-cerrar"
            onClick={() => setToast(null)}
          >
            <FiX size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Notificaciones;