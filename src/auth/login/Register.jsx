import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../useAuth';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    edad: '',
    password: '',
    passwordConfirm: ''
  });
  
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

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
    
    // console.log('🚀 INICIANDO PROCESO DE REGISTRO');

    const { nombre, apellido, telefono, email, edad, password, passwordConfirm } = formData;
    
    if (!nombre.trim() || !apellido.trim() || !telefono.trim() || !email.trim() || !password || !passwordConfirm) {
      setError('Completá todos los campos obligatorios.');
      return;
    }

    if (edad && Number(edad) < 12) {
      setError('Debes tener al menos 12 años para registrarte.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!validarPassword(password)) {
      setError('La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula y número.');
      return;
    }

    try {
      setCargando(true);

      // 🔹 PASO 1: Crear usuario en Supabase Auth
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
      const needsConfirmation = authData.user.identities?.length === 0;

      // console.log('✅ Usuario creado en Auth:', userId);
      // console.log('📧 Requiere confirmación:', needsConfirmation);

      // 🔹 PASO 2: Esperar a que el trigger cree el perfil automáticamente
      // El trigger debería crear el perfil instantáneamente, pero esperamos un poco por si acaso
      await new Promise(resolve => setTimeout(resolve, 1500));

      // console.log('✅ Perfil creado automáticamente por trigger');

      // 🔹 PASO 3: Guardar datos para modal promocional
      if (needsConfirmation) {
        const promoData = {
          email: email.trim().toLowerCase(),
          timestamp: Date.now(),
          userId: userId
        };
        localStorage.setItem('pendiente_modal_promo', JSON.stringify(promoData));
      } else {
        sessionStorage.setItem('mostrar_modal_promo', 'true');
      }

      // 🔹 PASO 4: Mostrar mensaje de éxito
      let mensaje = '🎉 ¡Cuenta creada con éxito!';
      
      if (needsConfirmation) {
        mensaje += `\n\n📧 Enviamos un email a:\n${email}`;
        mensaje += '\n\n✅ Hacé click en el link para activar tu cuenta';
        mensaje += '\n\n💡 Podrás ingresar un código promocional después de confirmar';
        mensaje += '\n\n⏰ Revisá spam si no lo ves en 2 minutos';
      } else {
        mensaje += '\n\n✅ Tu cuenta está lista';
        mensaje += '\n\n👉 Ya podés iniciar sesión';
        mensaje += '\n\n💡 Podrás ingresar un código promocional en el siguiente paso';
      }

      alert(mensaje);
      navigate('/login');

    } // 🔥 BUSCAR ESTE CATCH Y REEMPLAZARLO:

catch (err) {
  console.error('❌ ERROR EN REGISTRO:', err);
  
  if (err.message?.includes('already registered') || 
      err.message?.includes('User already registered')) {
    setError('⚠️ Este correo ya está registrado.\n\nProbá iniciar sesión o usar "Continuar con Google".');
  } else if (err.message?.includes('invalid email')) {
    setError('❌ Email inválido. Verificá el formato.');
  } else if (err.message?.includes('Password') || err.message?.includes('password')) {
    setError('❌ La contraseña debe tener al menos 8 caracteres con mayúscula, minúscula y número.');
  } else if (err.message?.includes('Email rate limit exceeded')) {
    setError('⏱️ Demasiados intentos. Esperá unos minutos antes de intentar de nuevo.');
  } else {
    setError(err.message || 'Ocurrió un error. Intentá de nuevo.');
  }
} finally {
      setCargando(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setError('');
      // console.log('🔐 Iniciando registro con Google OAuth...');
      await loginWithGoogle();
    } catch (err) {
      console.error('❌ Error con Google OAuth:', err.message);
      setError('Error al conectar con Google. Intentá de nuevo.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        
        {/* Logo */}
        <div className="register-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        <h1 className="register-logo-text">GoyaNova</h1>

        {/* Título */}
        <p className="register-title">Crear cuenta nueva</p>

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
            placeholder="Edad (opcional)" 
            value={formData.edad} 
            onChange={handleChange}
            min="12"
            disabled={cargando}
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

          <div className="register-input-icon">
            <input
              type={mostrarPass ? 'text' : 'password'}
              name="passwordConfirm"
              placeholder="Confirmar contraseña *"
              value={formData.passwordConfirm}
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