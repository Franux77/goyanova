// src/auth/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isMounted = useRef(true);
  const isLoadingProfile = useRef(false);
  const perfilCargadoRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastVisibilityRef = useRef(Date.now());
  const isRefreshingRef = useRef(false);
  
  // 🆕 OPTIMIZADO PARA CARGA SÚPER RÁPIDA
  const lastCheckRef = useRef(0);
  const CHECK_COOLDOWN = 60000; // 👈 60 segundos - menos verificaciones
  const isCheckingRef = useRef(false);

  // 🆕 Timeouts MUY agresivos para carga instantánea
  const withTimeout = (promise, timeoutMs = 2500) => { // 👈 2.5s por defecto
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  };

  const cargarPerfil = useCallback(async (userId) => {
    if (!userId || isLoadingProfile.current) return null;

    if (perfilCargadoRef.current && lastUserIdRef.current === userId) {
      return null;
    }

    isLoadingProfile.current = true;

    try {
      // 👈 Timeout de 3s
      const { data, error: perfilError } = await withTimeout(
        supabase
          .from('perfiles_usuarios')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        3000
      );

      if (perfilError) {
        if (isMounted.current) {
          setPerfil(null);
          perfilCargadoRef.current = false;
          lastUserIdRef.current = null;
        }
        return null;
      }

      if (isMounted.current) {
        setPerfil(data);
        perfilCargadoRef.current = true;
        lastUserIdRef.current = userId;
      }
      return data;
    } catch (err) {
      // 👈 Silenciar timeout - no es crítico
      if (isMounted.current && err.message !== 'Timeout') {
        setPerfil(null);
        perfilCargadoRef.current = false;
        lastUserIdRef.current = null;
      }
      return null;
    } finally {
      isLoadingProfile.current = false;
    }
  }, []);

  const extraerNombreApellido = (nombreCompleto) => {
    if (!nombreCompleto || typeof nombreCompleto !== 'string') {
      return { nombre: 'Usuario', apellido: '' };
    }
    
    const limpio = nombreCompleto.trim();
    if (!limpio) return { nombre: 'Usuario', apellido: '' };
    
    const partes = limpio.split(/\s+/).filter(p => p.length > 0);
    if (partes.length === 0) return { nombre: 'Usuario', apellido: '' };
    if (partes.length === 1) return { nombre: partes[0], apellido: '' };
    
    const nombre = partes[0];
    const apellido = partes.slice(1).join(' ');
    return { nombre, apellido };
  };

  const crearPerfilDesdeGoogle = useCallback(async (user) => {
    try {
      if (!user?.email) return null;

      const email = user.email.toLowerCase().trim();
      const metadata = user.user_metadata || {};
      const nombreCompleto = metadata.full_name || metadata.name || '';
      const { nombre, apellido } = extraerNombreApellido(nombreCompleto);
      const fotoUrl = metadata.avatar_url || metadata.picture || null;

      let intentos = 0;
      let perfilExistente = null;
      
      // 👈 Solo 2 intentos con delays cortos
      while (intentos < 2 && !perfilExistente) {
        await new Promise(resolve => setTimeout(resolve, intentos === 0 ? 200 : 400));
        
        const { data } = await withTimeout(
          supabase
            .from('perfiles_usuarios')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(),
          3000
        );
        
        perfilExistente = data;
        intentos++;
      }

      if (perfilExistente) {
        const updates = {};
        if (nombre && nombre !== 'Usuario') updates.nombre = nombre;
        if (apellido) updates.apellido = apellido;
        if (fotoUrl) updates.foto_url = fotoUrl;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('perfiles_usuarios')
            .update(updates)
            .eq('id', user.id);
        }

        sessionStorage.setItem('nuevo_usuario_google', 'true');
        sessionStorage.setItem('mostrar_modal_promo', 'true');
        
        return perfilExistente;
      }

      const { data: nuevoPerfil, error: errorCreacion } = await supabase
        .from('perfiles_usuarios')
        .insert([{
          id: user.id,
          nombre: nombre || 'Usuario',
          apellido: apellido || '',
          email: email,
          telefono: '',
          foto_url: fotoUrl,
          edad: null,
          estado: 'activo',
          rol: 'usuario'
        }])
        .select()
        .single();

      if (errorCreacion) return null;

      sessionStorage.setItem('nuevo_usuario_google', 'true');
      sessionStorage.setItem('mostrar_modal_promo', 'true');
      
      return nuevoPerfil;

    } catch (err) {
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    perfilCargadoRef.current = false;
    lastUserIdRef.current = null;

    try {
      const emailLimpio = email.toLowerCase().trim();
      
      const { data, error: loginError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: emailLimpio,
          password,
        }),
        8000 // 👈 Login puede tomar más tiempo
      );

      if (loginError) throw loginError;
      
      if (isMounted.current) {
        setUser(data.user);
      }
      
      if (data.user) {
        await cargarPerfil(data.user.id);
      }

      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err.message);
        setUser(null);
        setPerfil(null);
        perfilCargadoRef.current = false;
        lastUserIdRef.current = null;
      }
      throw err;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [cargarPerfil]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (loginError) throw loginError;
      
      return data;

    } catch (err) {
      if (isMounted.current) {
        setError(err.message);
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    const confirmar = window.confirm("¿Seguro que deseas cerrar sesión?");
    if (!confirmar) return;
    
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    await supabase.auth.signOut();
    
    if (isMounted.current) {
      setUser(null);
      setPerfil(null);
      perfilCargadoRef.current = false;
      lastUserIdRef.current = null;
      isLoadingProfile.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    await supabase.auth.signOut();
    
    if (isMounted.current) {
      setUser(null);
      setPerfil(null);
      perfilCargadoRef.current = false;
      lastUserIdRef.current = null;
      isLoadingProfile.current = false;
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      const emailLimpio = email.toLowerCase().trim();
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpio, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      throw new Error(err.message || 'Error al enviar correo de recuperación.');
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (isRefreshingRef.current) return false;

    isRefreshingRef.current = true;

    try {
      const { data: { session }, error } = await withTimeout(
        supabase.auth.refreshSession(),
        6000 // 👈 6s para refresh
      );
      
      if (error) {
        // 👈 NO cerrar sesión por timeout
        if (error.message === 'Timeout') {
          return true;
        }
        await signOut();
        return false;
      }

      if (session?.user && isMounted.current) {
        setUser(session.user);
        return true;
      }
      
      await signOut();
      return false;
    } catch (err) {
      return true;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [signOut]);

  // 🆕 VERIFICACIÓN SUPER OPTIMIZADA
  const verificarSesionActiva = useCallback(async () => {
    if (isCheckingRef.current) {
      return true;
    }

    const ahora = Date.now();
    if (ahora - lastCheckRef.current < CHECK_COOLDOWN) {
      return true;
    }
    
    lastCheckRef.current = ahora;
    isCheckingRef.current = true;

    try {
      // 👇 Timeout de 2 segundos (muy rápido)
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        2000
      );
      
      if (error) {
        if (error.message === 'Timeout') {
          return true;
        }
        await signOut();
        return false;
      }

      if (!session) {
        await signOut();
        return false;
      }

      const expiresAt = session.expires_at;
      const ahoraSec = Math.floor(Date.now() / 1000);
      const tiempoRestante = expiresAt - ahoraSec;

      // 👇 Solo refrescar si expira en menos de 5 minutos
      if (tiempoRestante < 300) {
        return await refreshSession();
      }

      if (isMounted.current) {
        setUser(session.user);
      }
      
      return true;
    } catch (err) {
      return true;
    } finally {
      isCheckingRef.current = false;
    }
  }, [refreshSession, signOut]);

  // Auto-refresh cada 55 minutos
  useEffect(() => {
    if (!user) return;

    const setupAutoRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        const success = await refreshSession();
        
        if (success) {
          setupAutoRefresh();
        }
      }, 55 * 60 * 1000); // 👈 55 minutos
    };

    setupAutoRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [user, refreshSession]);

  // 🆕 MANEJO OPTIMIZADO DE VISIBILIDAD
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // 👇 Solo verificar cuando REGRESA después de 15 minutos
      if (document.visibilityState === 'visible' && user) {
        const tiempoInactivo = Date.now() - lastVisibilityRef.current;
        
        // 👈 15 minutos - mucho menos frecuente
        if (tiempoInactivo > 15 * 60 * 1000) {
          await verificarSesionActiva();
        }
      } else if (document.visibilityState === 'hidden') {
        lastVisibilityRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, verificarSesionActiva]);

  // Inicialización y listener de auth
  useEffect(() => {
    isMounted.current = true;
    let authSubscription = null;

    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          5000 // 👈 5s inicial - más rápido
        );
        
        if (sessionError) {
          if (isMounted.current) {
            setUser(null);
            setPerfil(null);
            perfilCargadoRef.current = false;
            lastUserIdRef.current = null;
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          if (isMounted.current) {
            setUser(session.user);
            
            const { data: perfilExistente } = await supabase
              .from('perfiles_usuarios')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!perfilExistente) {
              const metadata = session.user.user_metadata || {};
              
              await supabase
                .from('perfiles_usuarios')
                .insert([{
                  id: session.user.id,
                  email: session.user.email.toLowerCase(),
                  nombre: metadata.nombre || 'Usuario',
                  apellido: metadata.apellido || '',
                  telefono: metadata.telefono || '',
                  edad: metadata.edad || null,
                  estado: 'activo',
                  rol: 'usuario'
                }]);
            }
            
            await cargarPerfil(session.user.id);

            const nuevoGoogle = sessionStorage.getItem('nuevo_usuario_google');
            const pendientePromo = localStorage.getItem('pendiente_modal_promo');

            if (nuevoGoogle === 'true') {
              sessionStorage.setItem('mostrar_modal_promo', 'true');
            } else if (pendientePromo) {
              try {
                const { email, timestamp } = JSON.parse(pendientePromo);
                
                if (email === session.user.email.toLowerCase()) {
                  const diasPasados = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
                  
                  if (diasPasados <= 7) {
                    sessionStorage.setItem('mostrar_modal_promo', 'true');
                  }
                  
                  localStorage.removeItem('pendiente_modal_promo');
                }
              } catch (err) {
                localStorage.removeItem('pendiente_modal_promo');
              }
            }
            
            setLoading(false);
          }
        } else {
          if (isMounted.current) {
            setUser(null);
            setPerfil(null);
            perfilCargadoRef.current = false;
            lastUserIdRef.current = null;
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted.current) {
          setUser(null);
          setPerfil(null);
          perfilCargadoRef.current = false;
          lastUserIdRef.current = null;
          setLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      const processedSignInRef = { current: false };
      
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted.current) return;

        if (event === 'INITIAL_SESSION') return;
        
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user && isMounted.current) {
            setUser(session.user);
          }
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          if (processedSignInRef.current && session.user.id === lastUserIdRef.current) {
            return;
          }

          processedSignInRef.current = true;
          
          const provider = session.user.app_metadata?.provider;
          
          await new Promise(resolve => setTimeout(resolve, 200)); // 👈 200ms - super rápido
          
          if (provider === 'google') {
            await crearPerfilDesdeGoogle(session.user);
          }
          
          setUser(session.user);
          
          if (!perfilCargadoRef.current || lastUserIdRef.current !== session.user.id) {
            await cargarPerfil(session.user.id);
          }
          
          if (isMounted.current) setLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          processedSignInRef.current = false;
          setUser(null);
          setPerfil(null);
          perfilCargadoRef.current = false;
          lastUserIdRef.current = null;
          setLoading(false);
          return;
        }

        try {
          if (session?.user) {
            if (isMounted.current) {
              setUser(session.user);
            }
            
            if (!perfilCargadoRef.current || lastUserIdRef.current !== session.user.id) {
              await cargarPerfil(session.user.id);
            }
          } else {
            setUser(null);
            setPerfil(null);
            perfilCargadoRef.current = false;
            lastUserIdRef.current = null;
          }
        } catch (error) {
          setUser(null);
          setPerfil(null);
          perfilCargadoRef.current = false;
          lastUserIdRef.current = null;
        } finally {
          if (isMounted.current) setLoading(false);
        }
      });

      authSubscription = listener.subscription;
    };

    getSession().then(() => {
      setupAuthListener();
    });

    return () => {
      isMounted.current = false;
      isLoadingProfile.current = false;
      perfilCargadoRef.current = false;
      lastUserIdRef.current = null;
      
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [cargarPerfil, crearPerfilDesdeGoogle]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        perfil,
        loading, 
        error, 
        login,
        loginWithGoogle,
        logout,
        signOut,
        resetPassword,
        cargarPerfil,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};