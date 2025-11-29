// src/components/panel/usuario/Configuracion.jsx
import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { AuthContext } from '../../../auth/AuthContext';
import './Configuracion.css';
import Loading from '../../loading/Loading';

const Configuracion = () => {
  const { user } = useContext(AuthContext);
  const [perfil, setPerfil] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    nuevaPass: '',
    confirmarPass: '',
  });
  
  // Estados para modo mantenimiento
  const [modoMantenimiento, setModoMantenimiento] = useState(false);
  const [configMantenimiento, setConfigMantenimiento] = useState({
    titulo: 'Sitio en Mantenimiento',
    mensaje: 'Estamos realizando mejoras para brindarte un mejor servicio. Volveremos pronto.',
    fechaEstimadaFin: '',
    mostrarTiempo: false
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPerfil = async () => {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setPerfil(data);
        setIsAdmin(data.estado === 'admin');
        setForm({
          ...form,
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          telefono: data.telefono || '',
        });
      }
    };

    const fetchConfigMantenimiento = async () => {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setModoMantenimiento(data.modo_mantenimiento);
        setConfigMantenimiento({
          titulo: data.titulo_mantenimiento || 'Sitio en Mantenimiento',
          mensaje: data.mensaje_mantenimiento || 'Estamos realizando mejoras para brindarte un mejor servicio. Volveremos pronto.',
          fechaEstimadaFin: data.fecha_estimada_fin ? new Date(data.fecha_estimada_fin).toISOString().slice(0, 16) : '',
          mostrarTiempo: data.mostrar_tiempo_estimado || false
        });
      }
    };

    fetchPerfil();
    if (user) {
      fetchConfigMantenimiento();
    }
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleChangeMantenimiento = (e) => {
    const { name, value, type, checked } = e.target;
    setConfigMantenimiento({
      ...configMantenimiento,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // ============================================
  // FIX 1: VALIDAR NOMBRE NO VACÍO
  // ============================================
  const handleGuardarDatos = async () => {
    // Validación 1: Email y teléfono obligatorios
    if (!form.email || !form.telefono) {
      alert('❌ El correo y teléfono son obligatorios.');
      return;
    }

    // ✅ VALIDACIÓN 2: Nombre no puede estar vacío
    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio || nombreLimpio.length < 2) {
      alert('❌ El nombre debe tener al menos 2 caracteres.');
      return;
    }

    // ✅ VALIDACIÓN 3: Apellido debe tener al menos 2 caracteres (si existe)
    const apellidoLimpio = form.apellido.trim();
    if (apellidoLimpio && apellidoLimpio.length < 2) {
      alert('❌ El apellido debe tener al menos 2 caracteres.');
      return;
    }

    const confirmar = window.confirm('¿Confirmás los cambios en tus datos?');
    if (!confirmar) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('perfiles_usuarios')
        .update({
          nombre: nombreLimpio,
          apellido: apellidoLimpio,
          email: form.email.toLowerCase().trim(),
          telefono: form.telefono.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // ✅ Actualizar el estado local
      setPerfil({ ...perfil, nombre: nombreLimpio, apellido: apellidoLimpio });
      
      alert('✅ Datos actualizados correctamente');
      
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('❌ Error al actualizar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const validarSeguridad = (pass) => {
    const minLength = pass.length >= 8;
    const mayus = /[A-Z]/.test(pass);
    const numero = /\d/.test(pass);
    const simbolo = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return minLength && mayus && numero && simbolo;
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

  if (!validarSeguridad(form.nuevaPass)) {
    alert('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.');
    return;
  }

  const confirmar = window.confirm('¿Confirmás cambiar tu contraseña?');
  if (!confirmar) return;

  setLoading(true);
  
  try {
    // 🔹 Verificar sesión actual primero
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      alert('⚠️ Tu sesión expiró. Por favor iniciá sesión nuevamente.');
      await supabase.auth.signOut();
      window.location.href = '/login';
      return;
    }

    console.log('🔑 Sesión válida, cambiando contraseña...');
    
    const { data, error } = await supabase.auth.updateUser({ 
      password: form.nuevaPass 
    });
    
    console.log('📊 Respuesta completa:', { data, error });
    
    if (error) {
      throw error;
    }
    
    alert('✅ Contraseña cambiada correctamente');
    setForm({ ...form, nuevaPass: '', confirmarPass: '' });
    
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    // Mensajes de error específicos
    if (error.message?.includes('session')) {
      alert('⚠️ Tu sesión expiró. Iniciá sesión nuevamente.');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } else if (error.message?.includes('weak')) {
      alert('❌ La contraseña es muy débil. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.');
    } else {
      alert(`❌ Error al cambiar contraseña:\n\n${error.message}`);
    }
  } finally {
    setLoading(false);
  }
};

  const handleToggleMantenimiento = async () => {
    const nuevoEstado = !modoMantenimiento;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const confirmar = window.confirm(
      `¿Confirmás ${accion} el modo mantenimiento?\n\n${
        nuevoEstado 
          ? '⚠️ Esto bloqueará el acceso a todos los usuarios excepto administradores.'
          : '✅ Los usuarios podrán acceder normalmente al sitio.'
      }`
    );
    
    if (!confirmar) return;

    setLoading(true);

    const updateData = {
      modo_mantenimiento: nuevoEstado,
      titulo_mantenimiento: configMantenimiento.titulo,
      mensaje_mantenimiento: configMantenimiento.mensaje,
      mostrar_tiempo_estimado: configMantenimiento.mostrarTiempo,
      fecha_activacion: nuevoEstado ? new Date().toISOString() : null,
      fecha_estimada_fin: configMantenimiento.fechaEstimadaFin ? new Date(configMantenimiento.fechaEstimadaFin).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('configuracion_sistema')
      .update(updateData)
      .eq('id', 1);

    setLoading(false);

    if (!error) {
      setModoMantenimiento(nuevoEstado);
      alert(`Modo mantenimiento ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
    } else {
      console.error('Error:', error);
      alert('Error al cambiar el modo mantenimiento');
    }
  };

  const handleGuardarConfigMantenimiento = async () => {
    const confirmar = window.confirm('¿Confirmás guardar la configuración de mantenimiento?');
    if (!confirmar) return;

    setLoading(true);

    const { error } = await supabase
      .from('configuracion_sistema')
      .update({
        titulo_mantenimiento: configMantenimiento.titulo,
        mensaje_mantenimiento: configMantenimiento.mensaje,
        mostrar_tiempo_estimado: configMantenimiento.mostrarTiempo,
        fecha_estimada_fin: configMantenimiento.fechaEstimadaFin ? new Date(configMantenimiento.fechaEstimadaFin).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    setLoading(false);

    if (!error) {
      alert('Configuración guardada correctamente');
    } else {
      alert('Error al guardar la configuración');
    }
  };

  const handleCerrarSesion = async () => {
    const confirmar = window.confirm('¿Querés cerrar sesión?');
    if (!confirmar) return;
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ============================================
  // ELIMINAR CUENTA DEFINITIVAMENTE (USA RPC)
  // ============================================
  const handleEliminarCuenta = async () => {
    const confirmar1 = window.confirm(
      '⚠️ ¿Estás SEGURO que querés eliminar tu cuenta?\n\n' +
      '🔴 Esta acción es IRREVERSIBLE\n' +
      '🔴 Se eliminarán TODOS tus datos\n' +
      '🔴 Se eliminarán TODOS tus servicios\n' +
      '🔴 Se eliminará tu usuario permanentemente\n\n' +
      'Hacé click en "Aceptar" para continuar'
    );
    
    if (!confirmar1) return;

    // Segunda confirmación
    const confirmar2 = window.confirm(
      '🚨 ÚLTIMA ADVERTENCIA 🚨\n\n' +
      'Esta acción NO SE PUEDE DESHACER.\n\n' +
      '¿Estás 100% seguro de eliminar tu cuenta?'
    );
    
    if (!confirmar2) return;

    setLoading(true);

    try {
      console.log('🗑️ Iniciando eliminación TOTAL de cuenta...');
      console.log('   Usuario ID:', user.id);
      console.log('   Email:', user.email);

      // ============================================
      // LLAMAR A LA FUNCIÓN RPC
      // ============================================
      const { data, error } = await supabase
        .rpc('eliminar_cuenta_completa');

      console.log('📊 Respuesta del servidor:', data);

      if (error) {
        console.error('❌ Error RPC:', error);
        throw new Error(error.message || 'Error al eliminar la cuenta');
      }

      // Verificar respuesta
      if (!data || !data.success) {
        console.error('❌ Eliminación falló:', data);
        throw new Error(data?.error || 'Error desconocido al eliminar');
      }

      console.log('✅ Cuenta eliminada completamente');
      console.log('   - Servicios eliminados:', data.servicios_eliminados);
      console.log('   - User ID:', data.user_id);

      // ============================================
      // LIMPIAR SESIÓN LOCAL
      // ============================================
      console.log('🧹 Limpiando sesión local...');
      
      // Limpiar localStorage
      localStorage.clear();
      
      // Limpiar sessionStorage
      sessionStorage.clear();
      
      // Limpiar cookies (opcional)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      console.log('✅ Sesión local limpiada');

      // ============================================
      // MOSTRAR MENSAJE Y REDIRIGIR
      // ============================================
      alert(
        '✅ Tu cuenta ha sido eliminada COMPLETAMENTE.\n\n' +
        `📦 Se eliminaron ${data.servicios_eliminados} servicio(s)\n` +
        '🔐 Tu usuario fue eliminado del sistema\n\n' +
        'Serás redirigido al inicio...'
      );

      // Esperar 1 segundo y redirigir
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);

    } catch (error) {
      console.error('❌ Error crítico eliminando cuenta:', error);
      
      alert(
        '❌ ERROR AL ELIMINAR LA CUENTA\n\n' +
        `Detalle: ${error.message}\n\n` +
        'Por favor contactá a soporte si el problema persiste.'
      );
      
      setLoading(false);
    }
  };

  if (!perfil) return <Loading message="Cargando configuración..." />;

  return (
    <div className="config-panel-wrapper">
      <h2 className="config-panel-titulo">Configuración de Cuenta</h2>

      {/* MODO MANTENIMIENTO - SOLO ADMIN */}
      {isAdmin && (
        <section className="config-panel-seccion config-mantenimiento">
          <div className="config-header-mantenimiento">
            <div>
              <h3 className="config-panel-subtitulo">
                <span className="material-icons">construction</span>
                Modo Mantenimiento
              </h3>
              <p className="config-descripcion">
                Bloquea el acceso al sitio para realizar mantenimiento. Solo los administradores podrán acceder.
              </p>
            </div>
            <label className="config-toggle-wrapper">
              <input
                type="checkbox"
                checked={modoMantenimiento}
                onChange={handleToggleMantenimiento}
                disabled={loading}
              />
              <span className="config-toggle-slider"></span>
            </label>
          </div>

          {modoMantenimiento && (
            <div className="config-mantenimiento-badge activo">
              <span className="material-icons">warning</span>
              <span>Modo mantenimiento activo</span>
            </div>
          )}

          <div className="config-mantenimiento-form">
            <label className="config-label">
              Título del mensaje
              <input
                type="text"
                name="titulo"
                value={configMantenimiento.titulo}
                onChange={handleChangeMantenimiento}
                placeholder="Sitio en Mantenimiento"
                className="config-input"
              />
            </label>

            <label className="config-label">
              Mensaje para los usuarios
              <textarea
                name="mensaje"
                value={configMantenimiento.mensaje}
                onChange={handleChangeMantenimiento}
                placeholder="Describe brevemente el motivo del mantenimiento..."
                rows="4"
                className="config-textarea"
              />
            </label>

            <div className="config-row">
              <label className="config-label">
                Fecha estimada de finalización (opcional)
                <input
                  type="datetime-local"
                  name="fechaEstimadaFin"
                  value={configMantenimiento.fechaEstimadaFin}
                  onChange={handleChangeMantenimiento}
                  className="config-input"
                />
              </label>

              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  name="mostrarTiempo"
                  checked={configMantenimiento.mostrarTiempo}
                  onChange={handleChangeMantenimiento}
                />
                <span>Mostrar tiempo restante a los usuarios</span>
              </label>
            </div>

            <button 
              className="config-panel-btn config-btn-secondary"
              onClick={handleGuardarConfigMantenimiento}
              disabled={loading}
            >
              <span className="material-icons">save</span>
              Guardar configuración
            </button>
          </div>
        </section>
      )}

      {/* DATOS DE CONTACTO */}
      <section className="config-panel-seccion">
        <h3 className="config-panel-subtitulo">
          <span className="material-icons">person</span>
          Datos de contacto
        </h3>
        <div className="config-form-grid">
          <label className="config-label">
            Nombre <span className="config-required">*</span>
            <input 
              type="text" 
              name="nombre" 
              value={form.nombre} 
              onChange={handleChange}
              className="config-input"
              placeholder="Ej: Juan"
              minLength="2"
              required
            />
          </label>
          <label className="config-label">
            Apellido
            <input 
              type="text" 
              name="apellido" 
              value={form.apellido} 
              onChange={handleChange}
              className="config-input"
              placeholder="Ej: Pérez"
            />
          </label>
          <label className="config-label">
            Email <span className="config-required">*</span>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange}
              className="config-input"
              required
            />
          </label>
          <label className="config-label">
            Teléfono <span className="config-required">*</span>
            <input 
              type="tel" 
              name="telefono" 
              value={form.telefono} 
              onChange={handleChange}
              className="config-input"
              required
            />
          </label>
        </div>
        <button 
          className="config-panel-btn" 
          onClick={handleGuardarDatos} 
          disabled={loading}
        >
          <span className="material-icons">save</span>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </section>

      {/* SEGURIDAD */}
      <section className="config-panel-seccion">
        <h3 className="config-panel-subtitulo">
          <span className="material-icons">lock</span>
          Seguridad
        </h3>
        <div className="config-form-grid">
          <div className="input-password">
            <label className="config-label">Nueva contraseña</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="nuevaPass"
                value={form.nuevaPass}
                onChange={handleChange}
                placeholder="********"
                className="config-input"
              />
              <span
                className="material-icons ojo"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>

          <div className="input-password">
            <label className="config-label">Confirmar nueva contraseña</label>
            <div className="input-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmarPass"
                value={form.confirmarPass}
                onChange={handleChange}
                placeholder="********"
                className="config-input"
              />
              <span
                className="material-icons ojo"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? 'visibility' : 'visibility_off'}
              </span>
            </div>
          </div>
        </div>
        <p className="config-hint">
          La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.
        </p>
        <button 
          className="config-panel-btn" 
          onClick={handleCambiarPassword} 
          disabled={loading}
        >
          <span className="material-icons">key</span>
          Cambiar contraseña
        </button>
      </section>

      {/* SESIÓN */}
      <section className="config-panel-seccion">
        <h3 className="config-panel-subtitulo">
          <span className="material-icons">logout</span>
          Sesión
        </h3>
        <button 
          className="config-panel-btn config-btn-logout" 
          onClick={handleCerrarSesion}
        >
          <span className="material-icons">logout</span>
          Cerrar sesión
        </button>
      </section>

      {/* ELIMINAR */}
      <section className="config-panel-seccion peligro">
        <h3 className="config-panel-subtitulo">
          <span className="material-icons">delete_forever</span>
          Eliminar cuenta
        </h3>
        <p className="config-panel-texto">
          ⚠️ Esta acción es <strong>IRREVERSIBLE</strong> y eliminará permanentemente:
        </p>
        <ul className="config-lista-peligro">
          <li>✗ Tu cuenta y datos personales</li>
          <li>✗ Todos tus servicios publicados</li>
          <li>✗ Tu historial completo</li>
        </ul>
        <button 
          className="config-panel-btn-eliminar" 
          onClick={handleEliminarCuenta} 
          disabled={loading}
        >
          <span className="material-icons">delete_forever</span>
          {loading ? 'Eliminando...' : 'Eliminar cuenta definitivamente'}
        </button>
      </section>
    </div>
  );
};

export default Configuracion;