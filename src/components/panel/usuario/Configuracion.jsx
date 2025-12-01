import React, { useState, useEffect, useContext } from 'react';
import './Configuracion.css';

// Simulación del contexto (en tu app real ya lo tienes)
const AuthContext = React.createContext({ user: { id: '123', email: 'usuario@ejemplo.com' } });

const Configuracion = () => {
  const { user } = useContext(AuthContext);
  const [perfil, setPerfil] = useState({
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@ejemplo.com',
    telefono: '3794123456',
    estado: 'user'
  });
  
  const [form, setForm] = useState({
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@ejemplo.com',
    telefono: '3794123456',
    nuevaPass: '',
    confirmarPass: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleGuardarDatos = async () => {
    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio || nombreLimpio.length < 2) {
      alert('❌ El nombre debe tener al menos 2 caracteres.');
      return;
    }
    alert('✅ Datos guardados (demo)');
  };

  const handleCambiarPassword = async () => {
    if (!form.nuevaPass || !form.confirmarPass) {
      alert('Completá todos los campos de contraseña');
      return;
    }
    if (form.nuevaPass !== form.confirmarPass) {
      alert('Las contraseñas no coinciden');
      return;
    }
    alert('✅ Contraseña cambiada (demo)');
  };

  const handleCerrarSesion = async () => {
    alert('Cerrar sesión (demo)');
  };

  const handleEliminarCuenta = async () => {
    const confirmar = window.confirm(
      '⚠️ ¿Estás SEGURO que querés eliminar tu cuenta?\n\nEsta acción es IRREVERSIBLE'
    );
    if (confirmar) {
      alert('Cuenta eliminada (demo)');
    }
  };

  return (
    <div className="cfg-container">
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
        
        {/* INFORMACIÓN PERSONAL */}
        <div className="cfg-card">
          <div className="cfg-card-header">
            <div className="cfg-header-left">
              <div className="cfg-icon-badge cfg-icon-primary">
                <span className="material-icons">person</span>
              </div>
              <div>
                <h2 className="cfg-card-title">Información Personal</h2>
                <p className="cfg-card-desc">Actualiza tus datos de contacto</p>
              </div>
            </div>
          </div>

          <div className="cfg-card-body">
            <div className="cfg-form-row">
              <div className="cfg-input-group">
                <label className="cfg-label">
                  Nombre <span className="cfg-asterisk">*</span>
                </label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={form.nombre} 
                  onChange={handleChange}
                  className="cfg-input"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="cfg-input-group">
                <label className="cfg-label">Apellido</label>
                <input 
                  type="text" 
                  name="apellido" 
                  value={form.apellido} 
                  onChange={handleChange}
                  className="cfg-input"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="cfg-form-row">
              <div className="cfg-input-group">
                <label className="cfg-label">
                  Correo Electrónico <span className="cfg-asterisk">*</span>
                </label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange}
                  className="cfg-input"
                  placeholder="tu@email.com"
                />
              </div>

              <div className="cfg-input-group">
                <label className="cfg-label">
                  Teléfono <span className="cfg-asterisk">*</span>
                </label>
                <input 
                  type="tel" 
                  name="telefono" 
                  value={form.telefono} 
                  onChange={handleChange}
                  className="cfg-input"
                  placeholder="3794123456"
                />
              </div>
            </div>

            <button 
              className="cfg-btn cfg-btn-primary" 
              onClick={handleGuardarDatos}
              disabled={loading}
            >
              <span className="material-icons cfg-btn-icon">save</span>
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
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