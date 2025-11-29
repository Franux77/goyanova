import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import './ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accessToken = searchParams.get('access_token');
  const type = searchParams.get('type');

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!password || !confirmPassword) {
      setError('Completa todos los campos.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      setMensaje('✅ Contraseña actualizada correctamente. Redirigiendo...');
      
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setError(err.message || 'Error al actualizar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        
        {/* Logo */}
        <div className="reset-password-logo">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
        </div>
        <h1 className="reset-password-logo-text">GoyaNova</h1>

        {/* Título */}
        <p className="reset-password-title">Restablecer contraseña</p>

        {/* Mensajes */}
        {mensaje && (
          <div className="reset-password-success">
            <span className="material-icons">check_circle</span>
            <span>{mensaje}</span>
          </div>
        )}

        {error && (
          <div className="reset-password-error">
            <span className="material-icons">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form className="reset-password-form" onSubmit={manejarSubmit}>
          <div>
            <label>Nueva contraseña</label>
            <div className="reset-password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <span
                className="material-icons reset-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>

          <div>
            <label>Confirmar contraseña</label>
            <div className="reset-password-input-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <span
                className="material-icons reset-password-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>

          <button type="submit" className="reset-password-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="reset-password-spinner"></span>
                Actualizando...
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </button>
        </form>

        {/* Volver al login */}
        <button 
          className="reset-password-back" 
          onClick={() => navigate('/login')}
          disabled={loading}
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;