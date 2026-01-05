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
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false);
  
  const [suspensionInfo, setSuspensionInfo] = useState(null);
  const [mostrarModalSuspension, setMostrarModalSuspension] = useState(false);

  const [modalInfo, setModalInfo] = useState(null);

  // 🔥 NUEVOS REFS para control de flujo
  const verificacionEnProceso = useRef(false);
  const yaVerificado = useRef(false);
  const navegacionRealizada = useRef(false);
  const loginAttemptRef = useRef(0);
  const timeoutRef = useRef(null);

  // 🔥 Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      console.log('🔵 [LOGIN] Componente desmontado');
    };
  }, []);

  // ✅ Verificación de acceso mejorada
  useEffect(() => {
    // 🔥 Condiciones de salida temprana
    if (!user || !perfil || loading || yaVerificado.current || navegacionRealizada.current) {
      return;
    }
    
    console.log('🔵 [LOGIN] Verificando acceso usuario:', user.id);
    verificarAccesoUsuario();
  }, [user, perfil, loading]);

  const verificarAccesoUsuario = async () => {
    // Evitar ejecuciones múltiples
    if (verificacionEnProceso.current || navegacionRealizada.current) {
      console.log('🔵 [LOGIN] Verificación ya en proceso o navegación realizada');
      return;
    }

    verificacionEnProceso.current = true;
    yaVerificado.current = true;
    setLoadingAction(true);

    try {
      // Admins pasan directo
      if (perfil.estado === 'admin' || perfil.rol === 'admin') {
        console.log('✅ [LOGIN] Admin detectado, redirigiendo...');
        navegacionRealizada.current = true;
        navigate('/', { replace: true });
        return;
      }

      // Verificar suspensión
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
        console.log('✅ [LOGIN] Sin suspensión, redirigiendo...');
        navegacionRealizada.current = true;
        navigate('/', { replace: true });
        return;
      }

      // Manejar suspensión temporal expirada
      if (suspension.tipo_suspension === 'temporal' && suspension.fecha_fin) {
        const ahora = new Date();
        const fechaFin = new Date(suspension.fecha_fin);

        if (ahora >= fechaFin) {
          console.log('✅ [LOGIN] Suspensión expirada, actualizando...');
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

      console.log('⚠️ [LOGIN] Usuario suspendido, mostrando modal');
      setMostrarModalSuspension(true);
      await supabase.auth.signOut();

    } catch (error) {
      console.error('❌ [VERIFICAR] Error:', error);
      // En caso de error, permitir acceso
      navegacionRealizada.current = true;
      navigate('/', { replace: true });
    } finally {
      verificacionEnProceso.current = false;
      setLoadingAction(false);
    }
  };

  // ✅ Submit mejorado con timeout de seguridad
  const manejarSubmit = async (e) => {
    e.preventDefault();
    
    setFormError('');
    setLoadingAction(true);

    // Incrementar contador de intentos
    loginAttemptRef.current += 1;
    const currentAttempt = loginAttemptRef.current;

    // 🔥 Timeout de seguridad: si no responde en 15 segundos, liberar UI
    timeoutRef.current = setTimeout(() => {
      if (currentAttempt === loginAttemptRef.current) {
        console.warn('⏱️ [LOGIN] Timeout alcanzado, liberando UI');
        setLoadingAction(false);
        setFormError('La conexión está tardando demasiado. Por favor intenta nuevamente.');
      }
    }, 15000); // 15 segundos

    if (!email.trim() || !password.trim()) {
      setFormError('Por favor completa todos los campos.');
      setLoadingAction(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    try {
      console.log('🔵 [LOGIN] Iniciando login para:', email.trim());
      await login(email.trim(), password);
      console.log('✅ [LOGIN] Login exitoso');
      
      // Login exitoso - el useEffect de arriba manejará la navegación
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
    } catch (err) {
      console.error('❌ [SUBMIT] Error en login:', err);
      
      // Limpiar timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      let mensajeError = '';
      
      if (err.message?.includes('Invalid login credentials')) {
        mensajeError = '❌ Correo o contraseña incorrectos.\n\n¿Posibles causas?\n• El correo no está registrado\n• La contraseña es incorrecta\n• Tu cuenta aún no fue confirmada (revisa tu email)\n\n💡 Si recién te registraste, confirma tu correo primero';
      } else if (err.message?.includes('Email not confirmed')) {
        mensajeError = '⚠️ Tu correo aún no está confirmado.\n\nRevisa tu bandeja de entrada y spam.\nSi no recibiste el correo, usa el botón "Reenviar confirmación" abajo.';
      } else if (err.message === 'Timeout') {
        mensajeError = '⏱️ La conexión está tardando demasiado.\n\nPor favor verifica tu internet e intenta nuevamente.';
      } else {
        mensajeError = '❌ Error al iniciar sesión. Intenta de nuevo.';
      }
      
      setFormError(mensajeError);
    } finally {
      // 🔥 CRÍTICO: Siempre liberar el loading después de un intento
      setLoadingAction(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const manejarGoogleLogin = async () => {
    setIsRedirectingToGoogle(true);
    setLoadingAction(true);
    setFormError('');
    
    try {
      console.log('🔵 [LOGIN] Iniciando Google OAuth');
      await loginWithGoogle();
    } catch (err) {
      console.error('❌ [GOOGLE] Error:', err);
      setFormError('Error al conectar con Google. Intenta de nuevo.');
      setLoadingAction(false);
      setIsRedirectingToGoogle(false);
    }
  };

  const manejarOlvideContrasena = async () => {
    if (!email.trim()) {
      setModalInfo({
        tipo: 'warning',
        titulo: '⚠️ Correo requerido',
        mensaje: 'Por favor ingresa tu correo electrónico en el campo de arriba antes de solicitar la recuperación de contraseña.'
      });
      return;
    }

    try {
      await resetPassword(email.trim());
      setModalInfo({
        tipo: 'success',
        titulo: '✅ Correo enviado',
        mensaje: `Te enviamos un enlace de recuperación a:\n\n${email.trim()}\n\nRevisa tu bandeja de entrada y también la carpeta de spam.\n\nEl enlace expira en 1 hora.`
      });
    } catch (err) {
      setModalInfo({
        tipo: 'error',
        titulo: '❌ Error',
        mensaje: 'Hubo un error al enviar el correo de recuperación.\n\nVerifica que tu correo sea correcto e intenta nuevamente.'
      });
    }
  };

  const reenviarEmailConfirmacion = async () => {
    if (!email.trim()) {
      setModalInfo({
        tipo: 'warning',
        titulo: '⚠️ Correo requerido',
        mensaje: 'Por favor ingresa tu correo electrónico primero.'
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim()
      });

      if (error) throw error;

      setModalInfo({
        tipo: 'success',
        titulo: '✅ Email de confirmación reenviado',
        mensaje: `Enviamos un nuevo correo a:\n${email.trim()}\n\n📬 Revisa tu bandeja de entrada\n📂 Si no lo ves, revisa spam\n⏰ Puede tardar hasta 2 minutos\n\n💡 Después de confirmar, actualiza esta página (F5) para iniciar sesión.`
      });
    } catch (err) {
      let mensajeError = 'Error al reenviar el correo de confirmación.';
      
      if (err.message?.includes('Email rate limit exceeded')) {
        mensajeError = 'Has solicitado demasiados correos.\n\nEspera 60 segundos antes de intentar nuevamente.';
      } else if (err.message?.includes('already confirmed')) {
        setModalInfo({
          tipo: 'success',
          titulo: '✅ Ya confirmado',
          mensaje: 'Tu correo ya está confirmado.\n\nPuedes iniciar sesión directamente.'
        });
        return;
      }
      
      setModalInfo({
        tipo: 'error',
        titulo: '❌ Error',
        mensaje: mensajeError
      });
    }
  };

  const volverAlInicio = () => {
    navigate('/');
  };

  // 🔥 Resetear estado al cerrar modal de suspensión
  const handleCerrarSuspension = () => {
    setMostrarModalSuspension(false);
    setSuspensionInfo(null);
    yaVerificado.current = false;
    navegacionRealizada.current = false;
    verificacionEnProceso.current = false;
  };

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
        onCerrarSesion={handleCerrarSuspension}
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
      {modalInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              backgroundColor: modalInfo.tipo === 'success' ? '#dcfce7' :
                               modalInfo.tipo === 'error' ? '#fee2e2' :
                               '#fef3c7',
              color: modalInfo.tipo === 'success' ? '#16a34a' :
                     modalInfo.tipo === 'error' ? '#dc2626' :
                     '#d97706'
            }}>
              {modalInfo.tipo === 'success' ? '✓' : modalInfo.tipo === 'error' ? '✕' : '!'}
            </div>
            
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              {modalInfo.titulo}
            </h3>
            
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#666',
              textAlign: 'center',
              whiteSpace: 'pre-line',
              marginBottom: '20px'
            }}>
              {modalInfo.mensaje}
            </p>
            
            <button
              onClick={() => setModalInfo(null)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1774f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5abf'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1774f6'}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="login-goya-box">
        <div className="login-goya-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        
        <h1 className="login-goya-logo-text">GoyaNova</h1>
        
        <p className="login-goya-title">Inicia sesión para continuar</p>

        {(formError || error) && (
          <div className="login-goya-error" style={{ whiteSpace: 'pre-line' }}>
            {formError || error}
          </div>
        )}

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