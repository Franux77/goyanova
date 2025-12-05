import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { supabase } from '../../utils/supabaseClient';
import SuspensionModal from './SuspensionModal';
import './Login.css';

const Login = () => {
  const { user, login, loginWithGoogle, resetPassword, error, loading, perfil } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  
  // 🆕 Estado para bloquear durante OAuth
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false);
  
  const [suspensionInfo, setSuspensionInfo] = useState(null);
  const [mostrarModalSuspension, setMostrarModalSuspension] = useState(false);

  const verificacionEnProceso = useRef(false);
  const yaVerificado = useRef(false);
  const navegacionRealizada = useRef(false);

  useEffect(() => {
    // console.log('🔵 [LOGIN] Componente montado');
    return () => console.log('🔵 [LOGIN] Componente desmontado');
  }, []);

 useEffect(() => {
  if (!user || !perfil || loading || yaVerificado.current || navegacionRealizada.current) {
    // console.log('⚠️ [LOGIN] No verificar:', { 
//   user: !!user, 
//   perfil: !!perfil, 
//   loading, 
//   yaVerificado: yaVerificado.current, 
//   navegacionRealizada: navegacionRealizada.current 
// });
    return;
  }

  // console.log('✅ [LOGIN] Iniciando verificación de acceso');
  
  // 🆕 Mantener el loading activo mientras verifica
  setLoadingAction(true);
  
  verificarAccesoUsuario();
}, [user, perfil, loading]);

  useEffect(() => {
    if (!user || !perfil || loading || yaVerificado.current || navegacionRealizada.current) {
      // console.log('⚠️ [LOGIN] No verificar:', { user: !!user, perfil: !!perfil, loading, yaVerificado: yaVerificado.current, navegacionRealizada: navegacionRealizada.current });
      return;
    }

    // console.log('✅ [LOGIN] Iniciando verificación de acceso');
    verificarAccesoUsuario();
  }, [user, perfil, loading]);

  const verificarAccesoUsuario = async () => {
    // console.log('🟢 [VERIFICAR] Iniciando verificación');
    
    if (verificacionEnProceso.current || navegacionRealizada.current) {
      // console.log('⚠️ [VERIFICAR] Bloqueado - ya en proceso o navegado');
      return;
    }

    verificacionEnProceso.current = true;
    yaVerificado.current = true;
    // console.log('✅ [VERIFICAR] Proceso iniciado');

    try {
      if (perfil.estado === 'admin' || perfil.rol === 'admin') {
        // console.log('👑 [VERIFICAR] Admin detectado - navegando');
        navegacionRealizada.current = true;
        navigate('/', { replace: true });
        return;
      }

      // console.log('🔍 [VERIFICAR] Buscando suspensiones');
      const { data: suspension } = await supabase
        .from('suspensiones')
        .select('*')
        .eq('entidad', 'usuario')
        .eq('entidad_id', user.id)
        .eq('activa', true)
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!suspension) {
        // console.log('✨ [VERIFICAR] Sin suspensiones - navegando al home');
        navegacionRealizada.current = true;
        navigate('/', { replace: true });
        return;
      }

      // console.log('⛔ [VERIFICAR] Usuario suspendido');

      if (suspension.tipo_suspension === 'temporal' && suspension.fecha_fin) {
        const ahora = new Date();
        const fechaFin = new Date(suspension.fecha_fin);

        if (ahora >= fechaFin) {
          // console.log('⏰ [VERIFICAR] Suspensión expirada - desactivando');
          await supabase
            .from('suspensiones')
            .update({ activa: false })
            .eq('id', suspension.id);
          
          navegacionRealizada.current = true;
          navigate('/', { replace: true });
          return;
        }

        const diffTime = fechaFin - ahora;
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setSuspensionInfo({
          ...suspension,
          dias_restantes: diasRestantes
        });
      } else {
        setSuspensionInfo(suspension);
      }

      setMostrarModalSuspension(true);
      await supabase.auth.signOut();

    } catch (error) {
      console.error('❌ [VERIFICAR] Error:', error);
      navegacionRealizada.current = true;
      navigate('/', { replace: true });
    } finally {
      // console.log('🏁 [VERIFICAR] Proceso finalizado');
      verificacionEnProceso.current = false;
    }
  };

const manejarSubmit = async (e) => {
  e.preventDefault();
  // console.log('📧 [SUBMIT] Iniciando login con email');
  
  setFormError('');
  setLoadingAction(true);

  if (!email.trim() || !password.trim()) {
    // console.log('⚠️ [SUBMIT] Campos vacíos');
    setFormError('Por favor completa todos los campos.');
    setLoadingAction(false);
    return;
  }

  try {
    // console.log('🔐 [SUBMIT] Llamando a login()');
    await login(email.trim(), password);
    // console.log('✅ [SUBMIT] Login exitoso - esperando verificación automática');
    
    // 🔴 NO NAVEGAR AQUÍ - dejar que useEffect lo haga
    // 🔴 NO setear navegacionRealizada.current = true
    // Solo mantener loadingAction = true para que muestre "Cargando..."
    
  } catch (err) {
    console.error('❌ [SUBMIT] Error en login:', err);
    setFormError('Error al iniciar sesión. Verifica tus credenciales.');
    setLoadingAction(false);
  }
};

const manejarGoogleLogin = async () => {
  // console.log('🔴 [GOOGLE] Iniciando login con Google');
  
  // 🆕 Setear PRIMERO el estado de redirección
  setIsRedirectingToGoogle(true);
  setLoadingAction(true);
  setFormError('');
  
  try {
    // console.log('🌐 [GOOGLE] Llamando a loginWithGoogle()');
    await loginWithGoogle();
    // console.log('✅ [GOOGLE] Redirigiendo a Google...');
    
    // 🆕 NO resetear nada - dejar el spinner activo
    // La página va a redirigir, no importa si el componente se desmonta
  } catch (err) {
    console.error('❌ [GOOGLE] Error:', err);
    setFormError('Error al conectar con Google. Intenta de nuevo.');
    setLoadingAction(false);
    setIsRedirectingToGoogle(false);
  }
};

  const manejarOlvideContrasena = async () => {
    if (!email.trim()) {
      alert('Por favor ingresa tu correo primero.');
      return;
    }
    try {
      await resetPassword(email.trim());
      alert('Te enviamos un correo para restablecer tu contraseña.');
    } catch (err) {
      alert('Hubo un error al enviar el correo. Intenta de nuevo.');
    }
  };

  const reenviarEmailConfirmacion = async () => {
    if (!email.trim()) {
      alert('Por favor ingresa tu correo primero.');
      return;
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim()
      });

      if (error) throw error;

      alert('✅ Email de confirmación reenviado.\n\nRevisá tu bandeja de entrada y spam.');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const volverAlInicio = () => {
    navigate('/');
  };

  // 🆕 Si está redirigiendo a Google, mostrar pantalla de carga
  if (isRedirectingToGoogle) {
    return (
      <div className="login-goya-container">
        <div className="login-goya-box">
          <div className="login-goya-logo">
            <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
          </div>
          
          <div className="auth-loading-container">
            <div className="auth-spinner"></div>
            <p className="auth-loading-message">Redirigiendo a Google...</p>
          </div>
        </div>
      </div>
    );
  }

  if (mostrarModalSuspension && suspensionInfo) {
    return (
      <SuspensionModal
        suspension={suspensionInfo}
        onCerrarSesion={() => {
          setMostrarModalSuspension(false);
          setSuspensionInfo(null);
          yaVerificado.current = false;
          navegacionRealizada.current = false;
        }}
        onContactarSoporte={() => {
          const asunto = encodeURIComponent('Consulta sobre suspensión de cuenta');
          const cuerpo = encodeURIComponent(`
Hola equipo de GoyaNova,

Mi cuenta ha sido suspendida y necesito más información.

Detalles de la suspensión:
- Tipo: ${suspensionInfo.tipo_suspension || 'No especificado'}
- Días restantes: ${suspensionInfo.dias_restantes || 'N/A'}
- Motivo: ${suspensionInfo.motivo || 'No especificado'}
- Usuario ID: ${user?.id || 'No disponible'}

Por favor, ayúdenme a resolver esta situación.

Gracias.
          `.trim());

          window.location.href = `mailto:goyanovasoporte@gmail.com?subject=${asunto}&body=${cuerpo}`;
        }}
      />
    );
  }

  const isLoading = loading || loadingAction;

  return (
    <div className="login-goya-container">
      <div className="login-goya-box">
        <div className="login-goya-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        
        <h1 className="login-goya-logo-text">GoyaNova</h1>
        
        <p className="login-goya-title">Inicia sesión para continuar</p>

        {formError && <div className="login-goya-error">{formError}</div>}
        {error && <div className="login-goya-error">{error}</div>}

        <button 
          className="login-goya-google" 
          onClick={manejarGoogleLogin}
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          {isLoading ? 'Cargando...' : 'Continuar con Google'}
        </button>

        <div className="login-goya-divider">
          <span>o continúa con email</span>
        </div>

        <form className="login-goya-form" onSubmit={manejarSubmit}>
          <div>
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="login-password">Contraseña</label>
            <div className="login-goya-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isLoading}
              />
              <span
                className="material-icons login-goya-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>

          <div className="login-goya-forgot" onClick={manejarOlvideContrasena}>
            ¿Olvidaste tu contraseña?
          </div>

          <button type="submit" className="login-goya-submit" disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <button className="login-goya-register" onClick={() => navigate('/register')} disabled={isLoading}>
          Crear cuenta nueva
        </button>

        <button className="login-goya-reenviar" onClick={reenviarEmailConfirmacion} disabled={isLoading}>
          ¿No recibiste el email? Reenviar confirmación
        </button>

        <button className="login-goya-volver" onClick={volverAlInicio} disabled={isLoading}>
          ← Volver al inicio
        </button>

        <p className="login-goya-footer">© {new Date().getFullYear()} GoyaNova. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default Login;