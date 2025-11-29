import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { supabase } from '../../../utils/supabaseClient';
import { useMantenimiento } from '../../../hooks/useMantenimiento';
import './ConfiguracionAdmin.css';
import Loading from '../../loading/Loading';

const ConfiguracionAdmin = () => {
  const { user, signOut } = useAuth();
  const { config, activarMantenimiento, desactivarMantenimiento, loading: loadingConfig } = useMantenimiento(user?.id);
  
  const [perfil, setPerfil] = useState(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [notificacionesActivas, setNotificacionesActivas] = useState(true);
  
  // Cambio de contraseña
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveNuevaConfirm, setClaveNuevaConfirm] = useState('');
  const [errorPass, setErrorPass] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);
  
  // Modal de mantenimiento
  const [showModalMantenimiento, setShowModalMantenimiento] = useState(false);
  const [tituloMantenimiento, setTituloMantenimiento] = useState('');
  const [mensajeMantenimiento, setMensajeMantenimiento] = useState('');
  const [horasEstimadas, setHorasEstimadas] = useState('');
  const [mostrarTiempo, setMostrarTiempo] = useState(true);
  const [loadingMantenimiento, setLoadingMantenimiento] = useState(false);

  useEffect(() => {
    if (user?.id) fetchPerfil();
  }, [user]);

  const fetchPerfil = async () => {
    try {
      setLoadingPerfil(true);
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setPerfil(data);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoadingPerfil(false);
    }
  };

  const handleCambiarPassword = async () => {
    setErrorPass('');
    if (!claveNueva || !claveNuevaConfirm) {
      setErrorPass('Todos los campos son obligatorios.');
      return;
    }
    if (claveNueva.length < 6) {
      setErrorPass('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (claveNueva !== claveNuevaConfirm) {
      setErrorPass('Las contraseñas nuevas no coinciden.');
      return;
    }
    try {
      setLoadingPass(true);
      const { error } = await supabase.auth.updateUser({ password: claveNueva });
      if (error) throw error;
      alert('✅ Contraseña actualizada correctamente.');
      setClaveActual('');
      setClaveNueva('');
      setClaveNuevaConfirm('');
    } catch (error) {
      setErrorPass(error.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoadingPass(false);
    }
  };

  const handleAbrirModalMantenimiento = () => {
    if (config?.modo_mantenimiento) {
      setTituloMantenimiento(config.titulo_mantenimiento || '');
      setMensajeMantenimiento(config.mensaje_mantenimiento || '');
      setMostrarTiempo(config.mostrar_tiempo_estimado ?? true);
      if (config.fecha_estimada_fin) {
        const ahora = new Date();
        const fin = new Date(config.fecha_estimada_fin);
        const diff = Math.max(0, fin - ahora);
        const horas = Math.round(diff / (1000 * 60 * 60));
        setHorasEstimadas(horas.toString());
      }
    } else {
      setTituloMantenimiento('Estamos en mantenimiento');
      setMensajeMantenimiento('Estamos realizando mejoras en la plataforma. Volveremos pronto.');
      setHorasEstimadas('2');
      setMostrarTiempo(true);
    }
    setShowModalMantenimiento(true);
  };

  const handleConfirmarMantenimiento = async () => {
    try {
      setLoadingMantenimiento(true);
      if (config?.modo_mantenimiento) {
        const result = await desactivarMantenimiento();
        if (result.success) {
          alert('✅ Modo mantenimiento desactivado. Los usuarios ya pueden acceder.');
          setShowModalMantenimiento(false);
        } else {
          alert('❌ Error al desactivar: ' + result.error);
        }
      } else {
        let fechaEstimadaFin = null;
        if (horasEstimadas && parseInt(horasEstimadas) > 0) {
          fechaEstimadaFin = new Date();
          fechaEstimadaFin.setHours(fechaEstimadaFin.getHours() + parseInt(horasEstimadas));
        }
        const result = await activarMantenimiento({
          titulo: tituloMantenimiento || 'Estamos en mantenimiento',
          mensaje: mensajeMantenimiento || 'Estamos realizando mejoras en la plataforma. Volveremos pronto.',
          fechaEstimadaFin: fechaEstimadaFin?.toISOString(),
          mostrarTiempo
        });
        if (result.success) {
          alert('✅ Modo mantenimiento activado. Los usuarios verán el aviso.');
          setShowModalMantenimiento(false);
        } else {
          alert('❌ Error al activar: ' + result.error);
        }
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoadingMantenimiento(false);
    }
  };

  const handleCerrarSesion = async () => {
  if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Error al cerrar sesión: ' + error.message);
    } else {
      window.location.href = '/';
    }
  }
};


if (loadingConfig || loadingPerfil) {
  return <Loading message="Cargando configuración..." />;
}

return (
    <main className="configAdmin-container" role="main" aria-label="Configuración administrativa">
      <h1 className="configAdmin-title">⚙️ Configuración del Sistema</h1>

      {/* MODO MANTENIMIENTO */}
      <section className="configAdmin-section configAdmin-section-destacada">
        <h2 className="configAdmin-sectionTitle">🔧 Modo Mantenimiento</h2>
        <p className="configAdmin-sectionDesc">
          Activa esta opción cuando necesites realizar actualizaciones, arreglos o mantenimiento del sistema. 
          Los usuarios no podrán acceder temporalmente (excepto los admins).
        </p>
        <div className="configAdmin-mantenimientoInfo">
          <div className={`configAdmin-estadoChip ${config?.modo_mantenimiento ? 'activo' : 'inactivo'}`}>
            {config?.modo_mantenimiento ? '🔴 ACTIVO' : '🟢 INACTIVO'}
          </div>
          {config?.modo_mantenimiento && config?.fecha_activacion && (
            <p className="configAdmin-fechaActivacion">
              Activado: {new Date(config.fecha_activacion).toLocaleString('es-AR')}
            </p>
          )}
        </div>
        <button 
          className={`configAdmin-btnMantenimiento ${config?.modo_mantenimiento ? 'desactivar' : 'activar'}`}
          onClick={handleAbrirModalMantenimiento}
          disabled={loadingMantenimiento}
        >
          {config?.modo_mantenimiento ? '🛑 Desactivar Mantenimiento' : 'Activar Mantenimiento'}
        </button>
      </section>

      {/* PREFERENCIAS */}
      <section className="configAdmin-section">
        <h2 className="configAdmin-sectionTitle">🎨 Preferencias Generales</h2>
        <div className="configAdmin-switchGroup">
          <label className="configAdmin-switch">
            <input
              type="checkbox"
              checked={modoOscuro}
              onChange={() => setModoOscuro(!modoOscuro)}
            />
            <span className="configAdmin-slider"></span>
            <span className="configAdmin-switchLabel">Modo Oscuro</span>
          </label>
          <label className="configAdmin-switch">
            <input
              type="checkbox"
              checked={notificacionesActivas}
              onChange={() => setNotificacionesActivas(!notificacionesActivas)}
            />
            <span className="configAdmin-slider"></span>
            <span className="configAdmin-switchLabel">Notificaciones del sistema</span>
          </label>
        </div>
      </section>

      {/* CAMBIAR CONTRASEÑA */}
      <section className="configAdmin-section">
        <h2 className="configAdmin-sectionTitle">🔐 Cambiar Contraseña</h2>
        <div className="configAdmin-formGroup">
          <div className="configAdmin-floatingInput">
            <input
              type="password"
              id="claveActual"
              value={claveActual}
              onChange={e => setClaveActual(e.target.value)}
              placeholder=" "
            />
            <label htmlFor="claveActual">Contraseña actual</label>
          </div>
          <div className="configAdmin-floatingInput">
            <input
              type="password"
              id="claveNueva"
              value={claveNueva}
              onChange={e => setClaveNueva(e.target.value)}
              placeholder=" "
            />
            <label htmlFor="claveNueva">Nueva contraseña</label>
          </div>
          <div className="configAdmin-floatingInput">
            <input
              type="password"
              id="claveNuevaConfirm"
              value={claveNuevaConfirm}
              onChange={e => setClaveNuevaConfirm(e.target.value)}
              placeholder=" "
            />
            <label htmlFor="claveNuevaConfirm">Confirmar nueva contraseña</label>
          </div>
          {errorPass && <p className="configAdmin-error">{errorPass}</p>}
          <button 
            className="configAdmin-btnSecondary" 
            onClick={handleCambiarPassword}
            disabled={loadingPass}
          >
            {loadingPass ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </section>

      {/* ACCIONES */}
      <section className="configAdmin-actions">
        <button className="configAdmin-btnDanger" onClick={handleCerrarSesion}>
          🚪 Cerrar Sesión
        </button>
      </section>

      {/* MODAL MANTENIMIENTO */}
      {showModalMantenimiento && (
        <div className="configAdmin-modalOverlay" onClick={() => setShowModalMantenimiento(false)}>
          <div className="configAdmin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="configAdmin-modalTitle">
              {config?.modo_mantenimiento ? '🛑 Desactivar Mantenimiento' : '🔧 Activar Mantenimiento'}
            </h3>
            {!config?.modo_mantenimiento && (
              <>
                <div className="configAdmin-floatingInput">
                  <input
                    type="text"
                    id="tituloMant"
                    value={tituloMantenimiento}
                    onChange={e => setTituloMantenimiento(e.target.value)}
                    placeholder=" "
                  />
                  <label htmlFor="tituloMant">Título del aviso</label>
                </div>
                <div className="configAdmin-floatingInput">
                  <textarea
                    id="mensajeMant"
                    value={mensajeMantenimiento}
                    onChange={e => setMensajeMantenimiento(e.target.value)}
                    placeholder=" "
                    rows="4"
                  />
                  <label htmlFor="mensajeMant">Mensaje para los usuarios</label>
                </div>
                <div className="configAdmin-floatingInput">
                  <input
                    type="number"
                    id="horasEstimadas"
                    value={horasEstimadas}
                    onChange={e => setHorasEstimadas(e.target.value)}
                    placeholder=" "
                    min="0"
                  />
                  <label htmlFor="horasEstimadas">Horas estimadas (opcional)</label>
                </div>
                <label className="configAdmin-switch">
                  <input
                    type="checkbox"
                    checked={mostrarTiempo}
                    onChange={() => setMostrarTiempo(!mostrarTiempo)}
                  />
                  <span className="configAdmin-slider"></span>
                  <span className="configAdmin-switchLabel">Mostrar tiempo estimado</span>
                </label>
              </>
            )}
            {config?.modo_mantenimiento && (
              <p className="configAdmin-modalWarning">
                ⚠️ Al desactivar, todos los usuarios podrán acceder nuevamente a la plataforma.
              </p>
            )}
            <div className="configAdmin-modalActions">
              <button 
                className="configAdmin-btnSecondary" 
                onClick={() => setShowModalMantenimiento(false)}
              >
                Cancelar
              </button>
              <button 
                className={config?.modo_mantenimiento ? 'configAdmin-btnPrimary' : 'configAdmin-btnDanger'}
                onClick={handleConfirmarMantenimiento}
                disabled={loadingMantenimiento}
              >
                {loadingMantenimiento ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ConfiguracionAdmin;