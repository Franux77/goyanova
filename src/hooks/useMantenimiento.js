import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

/**
 * Hook para gestionar el modo mantenimiento
 * Escucha cambios en tiempo real y verifica si el usuario puede acceder
 */
export const useMantenimiento = (userId = null) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener configuración inicial
  useEffect(() => {
    fetchConfig();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('config-mantenimiento')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'configuracion_sistema'
        },
        (payload) => {
          setConfig(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (err) {
      console.error('Error al obtener configuración:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica si el usuario actual puede acceder durante mantenimiento
   */
  const puedeAcceder = () => {
    if (!config?.modo_mantenimiento) return true;
    if (!userId) return false;
    return config.usuarios_excluidos?.includes(userId) || false;
  };

  /**
   * Activar modo mantenimiento (solo admins)
   */
  const activarMantenimiento = async (datos = {}) => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .update({
          modo_mantenimiento: true,
          titulo_mantenimiento: datos.titulo || 'Estamos en mantenimiento',
          mensaje_mantenimiento: datos.mensaje || 'Estamos realizando mejoras en la plataforma. Volveremos pronto.',
          fecha_activacion: new Date().toISOString(),
          fecha_estimada_fin: datos.fechaEstimadaFin || null,
          mostrar_tiempo_estimado: datos.mostrarTiempo ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      
      await fetchConfig();
      return { success: true, data };
    } catch (err) {
      console.error('Error al activar mantenimiento:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Desactivar modo mantenimiento
   */
  const desactivarMantenimiento = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .update({
          modo_mantenimiento: false,
          fecha_activacion: null,
          fecha_estimada_fin: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      
      await fetchConfig();
      return { success: true, data };
    } catch (err) {
      console.error('Error al desactivar mantenimiento:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    config,
    loading,
    error,
    enMantenimiento: config?.modo_mantenimiento || false,
    puedeAcceder: puedeAcceder(),
    activarMantenimiento,
    desactivarMantenimiento,
    refetch: fetchConfig
  };
};