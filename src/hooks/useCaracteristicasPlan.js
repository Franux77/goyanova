// src/hooks/useCaracteristicasPlan.js
//
// Trae de una sola vez el objeto de caracteristicas del plan activo
// del usuario logueado. Cualquier componente que necesite saber si
// el usuario tiene una funcion habilitada (reel, badge verificado,
// metodos de pago en el form, etc.) usa este hook en vez de comparar
// tipo_membresia a mano.
//
// Uso:
//   const { tiene, cargando } = useCaracteristicasPlan();
//   if (tiene('metodos_pago_formulario')) { ... }

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useCaracteristicasPlan = () => {
  const [caracteristicas, setCaracteristicas] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (activo) { setCaracteristicas({}); setCargando(false); }
          return;
        }

        const { data, error } = await supabase.rpc('obtener_caracteristicas_usuario', {
          p_usuario_id: user.id
        });

        if (error) throw error;
        if (activo) setCaracteristicas(data || {});
      } catch (err) {
        console.error('Error cargando características del plan:', err);
        if (activo) setCaracteristicas({});
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, []);

  const tiene = useCallback(
    (clave) => caracteristicas?.[clave] === true,
    [caracteristicas]
  );

  return { caracteristicas, tiene, cargando };
};