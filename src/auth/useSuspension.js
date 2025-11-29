import { useState, useEffect } from 'react';
import { supabase } from '.././utils/supabaseClient';

export const useSuspension = (userId) => {
  const [suspensionActiva, setSuspensionActiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    verificarSuspension();
  }, [userId]);

  const verificarSuspension = async () => {
    try {
      setLoading(true);

      // Buscar suspensión activa del usuario
      const { data, error } = await supabase
  .from('suspensiones')
  .select('*')
  .eq('entidad', 'usuario')
  .eq('entidad_id', userId)
  .eq('activa', true)
  .order('fecha_inicio', { ascending: false })
  .limit(1);

if (error) {
  console.error('Error al verificar suspensión:', error);
  setSuspensionActiva(null);
  setLoading(false);
  return;
}

const suspension = data && data.length > 0 ? data[0] : null;


      if (!suspension) {
        setSuspensionActiva(null);
        setLoading(false);
        return;
      }

      // Verificar si es temporal y ya expiró
      if (suspension.tipo_suspension === 'temporal' && suspension.fecha_fin) {
        const ahora = new Date();
        const fechaFin = new Date(suspension.fecha_fin);

        if (ahora >= fechaFin) {
          // La suspensión expiró, desactivarla
          await desactivarSuspension(suspension.id);
          setSuspensionActiva(null);
          setLoading(false);
          return;
        }

        // Calcular días restantes
        const diffTime = fechaFin - ahora;
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setSuspensionActiva({
          ...suspension,
          dias_restantes: diasRestantes
        });
      } else {
        // Suspensión permanente
        setSuspensionActiva(suspension);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error en verificarSuspension:', error);
      setSuspensionActiva(null);
      setLoading(false);
    }
  };

  const desactivarSuspension = async (suspensionId) => {
    try {
      await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('id', suspensionId);
    } catch (error) {
      console.error('Error al desactivar suspensión:', error);
    }
  };

  return {
    suspensionActiva,
    loading,
    estaSuspendido: !!suspensionActiva,
    refrescarSuspension: verificarSuspension
  };
};