// src/contexts/NotificationsProvider.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../auth/useAuth';
import './NotificationsProvider.css';

const NotificationsContext = createContext();
export const useNotifications = () => useContext(NotificationsContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificacionesToast, setNotificacionesToast] = useState([]);

  // === TOASTS ===
  const agregarNotificacion = useCallback((titulo, mensaje, duracion = 5000) => {
    const id = Date.now();
    setNotificacionesToast(prev => [...prev, { id, titulo, mensaje }]);
    setTimeout(() => {
      setNotificacionesToast(prev => prev.filter(n => n.id !== id));
    }, duracion);
  }, []);

  const eliminarNotificacion = (id) => {
    setNotificacionesToast(prev => prev.filter(n => n.id !== id));
  };

  const startDrag = (e, id) => {
    const toast = e.currentTarget;
    let startX = e.clientX || e.touches?.[0]?.clientX;
    const handleMove = (ev) => {
      const currentX = ev.clientX || ev.touches?.[0]?.clientX;
      const diffX = currentX - startX;
      toast.style.transform = `translateX(${diffX}px)`;
      toast.style.opacity = 1 - Math.min(Math.abs(diffX) / 150, 1);
    };
    const handleUp = (ev) => {
      const endX = ev.clientX || ev.changedTouches?.[0]?.clientX;
      const diffX = endX - startX;
      if (Math.abs(diffX) > 100) eliminarNotificacion(id);
      else {
        toast.style.transform = `translateX(0)`;
        toast.style.opacity = 1;
      }
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // === FETCH de notificaciones persistentes ===
  const fetchNotificaciones = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('creada_en', { ascending: false });

    if (!error) {
      setNotificaciones(data || []);
      setUnreadCount((data || []).filter(n => !n.leida).length);
    }
  }, [user]);

  // === SUSCRIPCIÓN en tiempo real ===
useEffect(() => {
  if (!user?.id) return;
  fetchNotificaciones();

  const canalNombre = `notificaciones_${user.id}`;
  const canal = supabase.channel(canalNombre)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      },
      async (payload) => {
        const { new: nueva } = payload;
        if (nueva) {
          agregarNotificacion(nueva.titulo, nueva.mensaje);
          fetchNotificaciones();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}, [user, fetchNotificaciones, agregarNotificacion]);

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', user.id);
    fetchNotificaciones();
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications: notificaciones,
        unreadCount,
        refresh: fetchNotificaciones,
        markAllAsRead,
        agregarNotificacion,
      }}
    >
      {children}

      {/* TOASTS */}
      <div className="notificaciones-toast-container">
        {notificacionesToast.map((n) => (
          <div
            key={n.id}
            className="notificacion-toast"
            onPointerDown={(e) => startDrag(e, n.id)}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="notificacion-texto">
              {n.titulo && <div className="notificacion-titulo">{n.titulo}</div>}
              <div className="notificacion-mensaje">{n.mensaje}</div>
            </div>
            <button className="notificacion-cerrar" onClick={() => eliminarNotificacion(n.id)}>×</button>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};
