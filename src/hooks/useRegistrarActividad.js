// src/hooks/useRegistrarActividad.js
//
// Se llama UNA VEZ en App.jsx (no en cada componente). Actualiza
// perfiles_usuarios.ultima_actividad cada 4 minutos mientras la
// pestaña esté abierta y el usuario logueado. Nada de websockets
// ni conexión permanente: es liviano a propósito.

import { useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const INTERVALO_MS = 4 * 60 * 1000; // 4 minutos

export const useRegistrarActividad = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const marcar = () => {
      supabase.rpc('registrar_actividad').then(({ error }) => {
        if (error) console.error('No se pudo registrar actividad:', error);
      });
    };

    marcar(); // al entrar
    const intervalo = setInterval(marcar, INTERVALO_MS);

    return () => clearInterval(intervalo);
  }, [userId]);
};