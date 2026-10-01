import { supabase } from '../utils/supabaseClient';
import useContadoresPanel from './useContadoresPanel';

/**
 * Numeritos del menú de Panel Usuario:
 *  - notificaciones: avisos sin leer
 *  - opiniones: reseñas nuevas en sus servicios desde la última vez que abrió "Opiniones"
 */
const useContadoresPanelUsuario = (user, misServicios) => {
  const idsServicios = (misServicios || []).map((s) => s.id);

  const definiciones = {
    notificaciones: {
      ruta: '/panel/notificaciones',
      tipo: 'pendientes',
      contar: async () => {
        const { count, error } = await supabase
          .from('notificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('usuario_id', user.id)
          .eq('leida', false);
        if (error) throw error;
        return count;
      },
    },
    opiniones: {
      ruta: '/panel/opiniones',
      tipo: 'nuevos',
      contar: async (desde) => {
        if (idsServicios.length === 0) return 0;
        const { count, error } = await supabase
          .from('opiniones')
          .select('id', { count: 'exact', head: true })
          .in('servicio_id', idsServicios)
          .gt('fecha', desde);
        if (error) throw error;
        return count;
      },
    },
  };

  // Los avisos se actualizan al instante cuando llega o se lee uno.
  const suscribir = (refrescar) => {
    const canal = supabase
      .channel(`contadores-avisos-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        () => refrescar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  };

  return useContadoresPanel(user?.id, definiciones, idsServicios.join(','), suscribir);
};

export default useContadoresPanelUsuario;
