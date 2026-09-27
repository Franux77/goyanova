import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../auth/AuthContext';
import { supabase } from '../../../utils/supabaseClient';

import './Configuracion.css';

const Configuracion = () => {
  const { user, perfil, signOut } = useContext(AuthContext);

  const [form, setForm] = useState({
    email: '',
    nuevaPass: '',
    confirmarPass: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // ============================================
  // 🔹 CARGAR DATOS DEL PERFIL AL MONTAR
  // ============================================
  useEffect(() => {
    if (perfil) {
      setForm(prev => ({
        ...prev,
        email: perfil.email || user?.email || '',
      }));
    } else if (user) {
      setForm(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [perfil, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (mensaje.texto) setMensaje({ tipo: '', texto: '' });
  };

  const mostrarMensaje = (tipo, texto, duracion = 5000) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), duracion);
  };

  // ============================================
  // 🔐 CAMBIAR CONTRASEÑA
  // ============================================
  const handleCambiarPassword = async () => {
    if (!form.nuevaPass || !form.confirmarPass) {
      mostrarMensaje('error', 'Completá todos los campos de contraseña');
      return;
    }

    if (form.nuevaPass !== form.confirmarPass) {
      mostrarMensaje('error', 'Las contraseñas no coinciden');
      return;
    }

    // Validación de seguridad
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!regex.test(form.nuevaPass)) {
      mostrarMensaje('error', 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo especial');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: form.nuevaPass
      });

      if (error) throw error;

      setForm(prev => ({ ...prev, nuevaPass: '', confirmarPass: '' }));
      mostrarMensaje('success', '✅ Contraseña actualizada correctamente');
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      mostrarMensaje('error', '❌ Error al cambiar la contraseña: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 🚪 CERRAR SESIÓN
  // ============================================
  const handleCerrarSesion = async () => {
    const confirmar = window.confirm('¿Estás seguro que querés cerrar sesión?');
    if (!confirmar) return;

    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      mostrarMensaje('error', '❌ Error al cerrar sesión');
    }
  };

  // ============================================
  // ⚠️ ELIMINAR CUENTA
  // ============================================

const handleEliminarCuenta = async () => {
  const confirmar = window.confirm(
    '⚠️ ¿Estás SEGURO que querés eliminar tu cuenta?\n\nEsta acción es IRREVERSIBLE y se eliminarán:\n\n• Todos tus datos personales\n• Tus servicios publicados\n• Tu historial completo\n\n¿Continuar?'
  );
  
  if (!confirmar) return;

  const confirmar2 = window.confirm(
    '🔴 ÚLTIMA CONFIRMACIÓN\n\n¿Realmente querés ELIMINAR tu cuenta de forma PERMANENTE?\n\nEscribí "ELIMINAR" en la siguiente ventana para confirmar'
  );

  if (!confirmar2) return;

  const textoConfirmacion = prompt('Escribí "ELIMINAR" para confirmar:');
  
  if (textoConfirmacion !== 'ELIMINAR') {
    mostrarMensaje('info', 'Operación cancelada');
    return;
  }

  setLoading(true);

  try {
    //console.log('🗑️ Usuario eliminando su propia cuenta:', user.id);

    // ✅ CORRECCIÓN: Cambiar "usuario_id" por "p_usuario_id"
    const { data, error } = await supabase.rpc('eliminar_usuario_completo', {
      p_usuario_id: user.id  // ← ESTE ERA EL PROBLEMA
    });

    if (error) {
      console.error('❌ Error eliminando cuenta:', error);
      throw error;
    }

    //console.log('✅ Respuesta de la función:', data);

    if (data && data.success) {
      alert('✅ Cuenta eliminada correctamente. Serás redirigido al inicio.');
      await signOut();
      window.location.href = '/';
    } else {
      throw new Error(data?.error || 'Error desconocido al eliminar la cuenta');
    }

  } catch (error) {
    console.error('❌ Error eliminando cuenta:', error);
    mostrarMensaje('error', '❌ Error al eliminar la cuenta: ' + (error.message || JSON.stringify(error)));
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // 🎨 RENDERIZADO
  // ============================================
  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Debes iniciar sesión para acceder a la configuración</h2>
      </div>
    );
  }

  return (
    <div className="cfg-container">
      {/* MENSAJE FLOTANTE */}
      {mensaje.texto && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '16px 24px',
          borderRadius: '8px',
          backgroundColor: mensaje.tipo === 'success' ? '#10b981' : mensaje.tipo === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Header Principal */}
      <div className="cfg-page-header">
        <div className="cfg-header-content">
          <div className="cfg-header-icon">
            <span className="material-icons">settings</span>
          </div>
          <div>
            <h1 className="cfg-page-title">Configuración</h1>
            <p className="cfg-page-subtitle">Administrá tu cuenta y preferencias del sistema</p>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="cfg-grid-layout">
        
        {/* DATOS PERSONALES — ahora se editan solo en "Mi Perfil" para no
            duplicar el mismo formulario en dos pantallas distintas */}
        <div className="cfg-card">
          <div className="cfg-card-header">
            <div className="cfg-header-left">
              <div className="cfg-icon-badge cfg-icon-primary">
                <span className="material-icons">person</span>
              </div>
              <div>
                <h2 className="cfg-card-title">Datos Personales</h2>
                <p className="cfg-card-desc">Nombre, teléfono, foto y demás datos de contacto</p>
              </div>
            </div>
          </div>

          <div className="cfg-card-body">
            <div className="cfg-info-box">
              <span className="material-icons cfg-info-icon">info</span>
              <p>Tu nombre, apellido, teléfono, edad y foto se editan desde "Mi Perfil".</p>
            </div>
            <Link to="/panel/perfil" className="cfg-btn cfg-btn-primary">
              <span className="material-icons cfg-btn-icon">person</span>
              <span>Ir a Mi Perfil</span>
            </Link>
          </div>
        </div>

        {/* SEGURIDAD */}
        <div className="cfg-card">
          <div className="cfg-card-header">
            <div className="cfg-header-left">
              <div className="cfg-icon-badge cfg-icon-security">
                <span className="material-icons">lock</span>
              </div>
              <div>
                <h2 className="cfg-card-title">Seguridad</h2>
                <p className="cfg-card-desc">Cambia tu contraseña de acceso</p>
              </div>
            </div>
          </div>

          <div className="cfg-card-body">
            <div className="cfg-info-box">
              <span className="material-icons cfg-info-icon">info</span>
              <p>La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo especial.</p>
            </div>

            <div className="cfg-form-row">
              <div className="cfg-input-group">
                <label className="cfg-label">Nueva Contraseña</label>
                <div className="cfg-input-with-icon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="nuevaPass"
                    value={form.nuevaPass}
                    onChange={handleChange}
                    className="cfg-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="cfg-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-icons">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="cfg-input-group">
                <label className="cfg-label">Confirmar Contraseña</label>
                <div className="cfg-input-with-icon">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmarPass"
                    value={form.confirmarPass}
                    onChange={handleChange}
                    className="cfg-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="cfg-eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    <span className="material-icons">
                      {showConfirm ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <button 
              className="cfg-btn cfg-btn-primary"
              onClick={handleCambiarPassword}
              disabled={loading}
            >
              <span className="material-icons cfg-btn-icon">vpn_key</span>
              <span>Cambiar Contraseña</span>
            </button>
          </div>
        </div>

        {/* SESIÓN */}
        <div className="cfg-card">
          <div className="cfg-card-header">
            <div className="cfg-header-left">
              <div className="cfg-icon-badge cfg-icon-session">
                <span className="material-icons">login</span>
              </div>
              <div>
                <h2 className="cfg-card-title">Gestión de Sesión</h2>
                <p className="cfg-card-desc">Cierra tu sesión activa</p>
              </div>
            </div>
          </div>

          <div className="cfg-card-body">
            <div className="cfg-session-info">
              <div className="cfg-session-item">
                <span className="cfg-session-label">Usuario:</span>
                <span className="cfg-session-value">{form.email}</span>
              </div>
              <div className="cfg-session-item">
                <span className="cfg-session-label">Estado:</span>
                <span className="cfg-status-badge cfg-status-active">Activo</span>
              </div>
            </div>

            <button 
              className="cfg-btn cfg-btn-secondary"
              onClick={handleCerrarSesion}
            >
              <span className="material-icons cfg-btn-icon">logout</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* ELIMINAR CUENTA */}
        <div className="cfg-card cfg-card-danger">
          <div className="cfg-card-header">
            <div className="cfg-header-left">
              <div className="cfg-icon-badge cfg-icon-danger">
                <span className="material-icons">warning</span>
              </div>
              <div>
                <h2 className="cfg-card-title">Zona de Peligro</h2>
                <p className="cfg-card-desc">Elimina permanentemente tu cuenta</p>
              </div>
            </div>
          </div>

          <div className="cfg-card-body">
            <div className="cfg-warning-box">
              <div className="cfg-warning-header">
                <span className="material-icons cfg-warning-icon">error</span>
                <span className="cfg-warning-title">Esta acción es irreversible</span>
              </div>
              <p className="cfg-warning-text">Al eliminar tu cuenta se borrarán permanentemente:</p>
            </div>

            <div className="cfg-danger-grid">
              <div className="cfg-danger-item">
                <div className="cfg-danger-icon-wrapper">
                  <span className="material-icons cfg-danger-x">close</span>
                </div>
                <div>
                  <h4 className="cfg-danger-item-title">Datos personales</h4>
                  <p className="cfg-danger-item-text">Tu perfil y toda tu información</p>
                </div>
              </div>

              <div className="cfg-danger-item">
                <div className="cfg-danger-icon-wrapper">
                  <span className="material-icons cfg-danger-x">close</span>
                </div>
                <div>
                  <h4 className="cfg-danger-item-title">Servicios publicados</h4>
                  <p className="cfg-danger-item-text">Todos los servicios que creaste</p>
                </div>
              </div>

              <div className="cfg-danger-item">
                <div className="cfg-danger-icon-wrapper">
                  <span className="material-icons cfg-danger-x">close</span>
                </div>
                <div>
                  <h4 className="cfg-danger-item-title">Historial completo</h4>
                  <p className="cfg-danger-item-text">Todas tus actividades y registros</p>
                </div>
              </div>
            </div>

            <button 
              className="cfg-btn cfg-btn-danger"
              onClick={handleEliminarCuenta}
              disabled={loading}
            >
              <span className="material-icons cfg-btn-icon">delete_forever</span>
              <span>{loading ? 'Eliminando...' : 'Eliminar Cuenta Definitivamente'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Configuracion;