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

  const cargarPerfil = useCallback(async (userId) => {
    if (!userId || isLoadingProfile.current) return null;

    if (perfilCargadoRef.current && lastUserIdRef.current === userId) {
      return null;
    }

    isLoadingProfile.current = true;

    try {
      const { data, error: perfilError } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

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
      if (isMounted.current) {
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
      
      while (intentos < 5 && !perfilExistente) {
        await new Promise(resolve => setTimeout(resolve, intentos === 0 ? 500 : 800));
        
       const { data } = await supabase
          .from('perfiles_usuarios')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
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
    console.log('🔵 [AUTH] login() llamado');
    setLoading(true);
    setError(null);
    perfilCargadoRef.current = false;
    lastUserIdRef.current = null;

    try {
      const emailLimpio = email.toLowerCase().trim();
      console.log('🔐 [AUTH] Llamando a Supabase signInWithPassword');
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailLimpio,
        password,
      });

      if (loginError) {
        console.error('❌ [AUTH] Error en signIn:', loginError);
        throw loginError;
      }

      console.log('✅ [AUTH] SignIn exitoso, usuario:', data.user.id);
      
      if (isMounted.current) {
        console.log('📝 [AUTH] Seteando user en estado');
        setUser(data.user);
      }
      
      if (data.user) {
        console.log('👤 [AUTH] Cargando perfil...');
        await cargarPerfil(data.user.id);
        console.log('✅ [AUTH] Perfil cargado');
      }

      return data;
    } catch (err) {
      console.error('❌ [AUTH] Error general en login:', err);
      if (isMounted.current) {
        setError(err.message);
        setUser(null);
        setPerfil(null);
        perfilCargadoRef.current = false;
        lastUserIdRef.current = null;
      }
      throw err;
    } finally {
      console.log('🏁 [AUTH] Finalizando login()');
      if (isMounted.current) setLoading(false);
    }
  }, [cargarPerfil]);

 // 🔧 REEMPLAZA SOLO LA FUNCIÓN loginWithGoogle (líneas 168-195 aprox)

const loginWithGoogle = useCallback(async () => {
  console.log('🔴 [AUTH] loginWithGoogle() llamado');
  // 🆕 NO SETEAR LOADING AQUÍ - deja que el flujo normal lo maneje
  setError(null);

  try {
    console.log('🌐 [AUTH] Llamando a Supabase signInWithOAuth');
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

    if (loginError) {
      console.error('❌ [AUTH] Error en OAuth:', loginError);
      throw loginError;
    }
    
    console.log('✅ [AUTH] OAuth iniciado, redirigiendo...');
    return data;

  } catch (err) {
    console.error('❌ [AUTH] Error general en Google login:', err);
    if (isMounted.current) {
      setError(err.message);
    }
    throw err;
  }
  // 🆕 NO hay finally - deja que onAuthStateChange maneje el loading
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
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
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
      await signOut();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [signOut]);

  const verificarSesionActiva = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        await signOut();
        return false;
      }

      const expiresAt = session.expires_at;
      const ahora = Math.floor(Date.now() / 1000);
      const tiempoRestante = expiresAt - ahora;

      if (tiempoRestante < 60) {
        return await refreshSession();
      }

      if (isMounted.current) {
        setUser(session.user);
      }
      
      return true;
    } catch (err) {
      await signOut();
      return false;
    }
  }, [refreshSession, signOut]);

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
      }, 45 * 60 * 1000);
    };

    setupAutoRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [user, refreshSession]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        await verificarSesionActiva();
      } else if (document.visibilityState === 'hidden') {
        lastVisibilityRef.current = Date.now();
      }
    };

    const handleFocus = async () => {
      if (user) {
        await verificarSesionActiva();
      }
    };

    const handleBeforeUnload = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, verificarSesionActiva]);

  useEffect(() => {
    isMounted.current = true;
    let authSubscription = null;

    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
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
        console.log('🎯 [AUTH] onAuthStateChange:', event, 'User:', session?.user?.id);
        
        if (!isMounted.current) {
          console.log('⚠️ [AUTH] Componente desmontado, ignorando');
          return;
        }

        if (event === 'INITIAL_SESSION') {
          console.log('🟡 [AUTH] INITIAL_SESSION - ignorando');
          return;
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 [AUTH] TOKEN_REFRESHED');
          if (session?.user && isMounted.current) {
            setUser(session.user);
          }
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ [AUTH] SIGNED_IN detectado');
          
          if (processedSignInRef.current && session.user.id === lastUserIdRef.current) {
            console.log('⚠️ [AUTH] Ya procesado, ignorando duplicado');
            return;
          }

          processedSignInRef.current = true;
          console.log('📝 [AUTH] Procesando nuevo SIGNED_IN');
          
          const provider = session.user.app_metadata?.provider;
          console.log('🔍 [AUTH] Provider:', provider);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (provider === 'google') {
            console.log('🔴 [AUTH] Creando perfil desde Google');
            await crearPerfilDesdeGoogle(session.user);
          }
          
          console.log('📝 [AUTH] Seteando user y cargando perfil');
          setUser(session.user);
          
          if (!perfilCargadoRef.current || lastUserIdRef.current !== session.user.id) {
            await cargarPerfil(session.user.id);
          }
          
          if (isMounted.current) setLoading(false);
          console.log('✅ [AUTH] SIGNED_IN procesado completamente');
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('👋 [AUTH] SIGNED_OUT');
          processedSignInRef.current = false;
          setUser(null);
          setPerfil(null);
          perfilCargadoRef.current = false;
          lastUserIdRef.current = null;
          setLoading(false);
          return;
        }

        console.log('🔍 [AUTH] Evento no manejado específicamente:', event);

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
  }, [cargarPerfil, crearPerfilDesdeGoogle, verificarSesionActiva]);

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