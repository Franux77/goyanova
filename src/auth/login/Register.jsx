import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../useAuth';
import './Register.css';

// Solo se muestran en desarrollo (npm run dev). En el build de producción no aparecen en consola.
const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args);
};
const debugError = (...args) => {
  if (import.meta.env.DEV) console.error(...args);
};

const Register = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    edad: '',
    password: ''
  });
  
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [modalInfo, setModalInfo] = useState(null);

  const validarPassword = (pass) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { nombre, apellido, telefono, email, edad, password } = formData;
    
    // Validar campos obligatorios incluyendo edad
    if (!nombre.trim() || !apellido.trim() || !telefono.trim() || !email.trim() || !edad || !password) {
      setError('Completá todos los campos obligatorios.');
      return;
    }

    // Validar edad mínima
    if (Number(edad) < 12) {
      setError('Debes tener al menos 12 años para registrarte.');
      return;
    }

    if (!validarPassword(password)) {
      setError('La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula y número.');
      return;
    }

    try {
      setCargando(true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            telefono: telefono.trim(),
            edad: edad ? Number(edad) : null
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;
      
      // 🔍 DETECCIÓN AUTOMÁTICA: ¿Necesita confirmar email?
      // Verificamos si el email fue verificado en user_metadata
      const emailVerified = authData.user.user_metadata?.email_verified === true;
      // También verificamos si tiene email_confirmed_at
      const hasConfirmedAt = authData.user.email_confirmed_at != null;
      // Si el email NO está verificado, necesita confirmación
      const necesitaConfirmacion = !emailVerified && !hasConfirmedAt;

            debugLog('📊 ESTADO DE CONFIRMACIÓN:', {
        necesitaConfirmacion,
        emailVerified,
        hasConfirmedAt,
        email_confirmed_at: authData.user.email_confirmed_at,
        user_metadata: authData.user.user_metadata,
        identities: authData.user.identities,
        identitiesLength: authData.user.identities?.length,
        userId,
        fullUser: authData.user
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // 🎯 CASO 1: CONFIRMACIÓN DE EMAIL ACTIVADA
      if (necesitaConfirmacion) {
               debugLog('📧 Confirmación de email REQUERIDA');
        
        // Guardar para mostrar modal de promo DESPUÉS de confirmar
        const promoData = {
          email: email.trim().toLowerCase(),
          timestamp: Date.now(),
          userId: userId
        };
        localStorage.setItem('pendiente_modal_promo', JSON.stringify(promoData));

        // Modal explicando confirmación de email
        setModalInfo({
  tipo: 'success',
  titulo: '🎉 ¡Registro exitoso!',
  mensaje: `📧 Te enviamos un correo de confirmación a:\n${email.trim()}\n\n✅ PASOS PARA ACTIVAR TU CUENTA:\n\n1️⃣ Abre tu correo electrónico\n2️⃣ Busca el email de GoyaNova\n   📂 Si no está en principal, REVISA SPAM\n3️⃣ Haz clic en "Confirmar correo"\n4️⃣ Guarda tu correo y contraseña\n5️⃣ Vuelve aquí e inicia sesión\n\n⏰ El correo puede tardar 1-2 minutos\n\n🔐 IMPORTANTE - GUARDA ESTOS DATOS:\n• Correo: ${email.trim()}\n• Contraseña: (la que elegiste)\n\n⚠️ Después de confirmar el correo:\n• Vuelve a esta página\n• Inicia sesión con tu correo y contraseña\n• ¡Listo para usar GoyaNova!\n\n💡 Si no llega el correo en 2 minutos, revisa la carpeta de SPAM o correo no deseado.`,
  onClose: () => {
    setModalInfo(null);
    navigate('/login');
  }
});

      // 🎯 CASO 2: CONFIRMACIÓN DE EMAIL DESACTIVADA
      } else {
                debugLog('✅ Confirmación de email NO requerida - Usuario activo inmediatamente');
        
        // Usuario puede iniciar sesión de inmediato
        sessionStorage.setItem('mostrar_modal_promo', 'true');

        // Modal de éxito directo - puede iniciar sesión ya
        setModalInfo({
  tipo: 'success',
  titulo: '🎉 ¡Cuenta creada exitosamente!',
  mensaje: `✅ Tu cuenta ha sido creada correctamente\n\n📧 Email registrado:\n${email.trim()}\n\n🔐 GUARDA ESTOS DATOS:\n• Correo: ${email.trim()}\n• Contraseña: (la que elegiste)\n\n🚀 PRÓXIMOS PASOS:\n\n1️⃣ Haz clic en "Entendido"\n2️⃣ Inicia sesión con tu correo y contraseña\n3️⃣ Explora nuestros servicios\n4️⃣ Aplica códigos promocionales\n\n💡 Tu cuenta está activa de inmediato, solo debes iniciar sesión.`,
  onClose: () => {
    setModalInfo(null);
    navigate('/login');
  }
});
      }

        } catch (err) {
      debugError('❌ ERROR EN REGISTRO:', err);
      
      let mensajeError = '';
      let tituloError = '❌ Error al crear cuenta';
      
      if (err.message?.includes('already registered') || 
          err.message?.includes('User already registered')) {
        tituloError = '⚠️ Correo ya registrado';
        mensajeError = `El correo ${email.trim()} ya tiene una cuenta.\n\n🔑 OPCIONES:\n\n✅ Si YA CONFIRMASTE tu correo:\n   → Inicia sesión con tu contraseña\n   → Usa "Continuar con Google"\n   → Usa "¿Olvidaste tu contraseña?"\n\n📧 Si NO CONFIRMASTE tu correo:\n   → Puedes registrarte de nuevo\n   → Te llegará un nuevo email de confirmación\n   → Revisa spam si no lo ves en 2 minutos`;
        setError('Este correo ya está registrado.');
      } else if (err.message?.includes('invalid email')) {
        mensajeError = 'El formato del correo no es válido.\n\nVerifica que sea correcto.\nEjemplo: tu@email.com';
        setError('Email inválido. Verificá el formato.');
      } else if (err.message?.includes('Password') || err.message?.includes('password')) {
        tituloError = '❌ Contraseña inválida';
        mensajeError = 'La contraseña debe cumplir:\n\n• Mínimo 8 caracteres\n• Al menos una mayúscula (A-Z)\n• Al menos una minúscula (a-z)\n• Al menos un número (0-9)\n\nEjemplo válido: Goya2024';
        setError('Contraseña no cumple los requisitos.');
      } else if (err.message?.includes('Email rate limit exceeded')) {
        tituloError = '⏱️ Demasiados intentos';
        mensajeError = 'Has realizado muchas solicitudes.\n\n⏰ Espera 60 segundos antes de intentar nuevamente.';
        setError('Demasiados intentos. Espera un minuto.');
      } else {
        mensajeError = err.message || 'Ocurrió un error inesperado.\n\nIntenta de nuevo en unos momentos.\n\nSi el problema persiste, contacta a soporte.';
        setError('Error al crear la cuenta. Intenta de nuevo.');
      }
      
      setModalInfo({
        tipo: 'error',
        titulo: tituloError,
        mensaje: mensajeError,
        onClose: () => setModalInfo(null)
      });
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setError('');
      await loginWithGoogle();
        } catch (err) {
      debugError('❌ Error con Google OAuth:', err.message);
      setModalInfo({
        tipo: 'error',
        titulo: '❌ Error con Google',
        mensaje: 'No se pudo completar el registro con Google.\n\n💡 Intenta:\n• Usar registro con correo\n• Verificar tu conexión\n• Intentar en unos segundos',
        onClose: () => setModalInfo(null)
      });
      setError('Error al conectar con Google. Intenta de nuevo.');
    }
  };

  return (
    <div className="register-container">
      {/* Modal */}
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
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              backgroundColor: modalInfo.tipo === 'success' ? '#dcfce7' : '#fee2e2',
              color: modalInfo.tipo === 'success' ? '#16a34a' : '#dc2626'
            }}>
              {modalInfo.tipo === 'success' ? '✓' : '✕'}
            </div>
            
            <h3 style={{
              fontSize: '19px',
              fontWeight: '600',
              color: '#1a1a1a',
              textAlign: 'center',
              marginBottom: '16px',
              lineHeight: '1.3'
            }}>
              {modalInfo.titulo}
            </h3>
            
            <p style={{
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#666',
              textAlign: 'left',
              whiteSpace: 'pre-line',
              marginBottom: '24px'
            }}>
              {modalInfo.mensaje}
            </p>
            
            <button
              onClick={modalInfo.onClose}
              style={{
                width: '100%',
                padding: '13px',
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

      <div className="register-box">
        
        {/* Logo */}
        <div className="register-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        <h1 className="register-logo-text">GoyaNova</h1>

        {/* Título */}
        <p className="register-title">Crear cuenta nueva</p>

        <div style={{
  fontSize: '12px',
  color: '#666',
  background: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '10px 12px',
  marginBottom: '16px',
  lineHeight: '1.5'
}}>
  💡 <strong>Importante:</strong> Después de crear tu cuenta, guarda tu correo y contraseña para iniciar sesión.
</div>

        {/* Error */}
        {error && (
          <div className="register-error">
            <span className="material-icons">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google Login */}
        <button 
          className="register-google-btn" 
          onClick={handleGoogleRegister}
          disabled={cargando}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div className="register-divider">
          <span>o registrate con email</span>
        </div>

        {/* Formulario */}
        <form className="register-form" onSubmit={handleSubmit}>
          
          <div className="register-row">
            <input 
              type="text"
              name="nombre"
              placeholder="Nombre *" 
              value={formData.nombre} 
              onChange={handleChange}
              disabled={cargando}
              required 
            />
            <input 
              type="text"
              name="apellido"
              placeholder="Apellido *" 
              value={formData.apellido} 
              onChange={handleChange}
              disabled={cargando}
              required 
            />
          </div>

          <input 
            type="tel"
            name="telefono"
            placeholder="Teléfono *" 
            value={formData.telefono} 
            onChange={handleChange}
            disabled={cargando}
            required 
          />

          <input 
            type="email"
            name="email"
            placeholder="Correo electrónico *" 
            value={formData.email} 
            onChange={handleChange}
            disabled={cargando}
            required 
          />

          <input 
            type="number"
            name="edad"
            placeholder="Edad *" 
            value={formData.edad} 
            onChange={handleChange}
            min="12"
            disabled={cargando}
            required
          />

          {/* Contraseñas */}
          <div className="register-input-icon">
            <input
              type={mostrarPass ? 'text' : 'password'}
              name="password"
              placeholder="Contraseña *"
              value={formData.password}
              onChange={handleChange}
              disabled={cargando}
              required
            />
            <span
              className="material-icons register-icon-toggle"
              onClick={() => setMostrarPass(!mostrarPass)}
            >
              {mostrarPass ? 'visibility' : 'visibility_off'}
            </span>
          </div>

          <button 
            type="submit" 
            className="register-submit-btn"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="register-spinner"></span>
                Registrando...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Volver */}
        <button 
          className="register-back-btn" 
          onClick={() => navigate('/login')}
          disabled={cargando}
        >
          ← Volver a iniciar sesión
        </button>

      </div>
    </div>
  );
};

export default Register;