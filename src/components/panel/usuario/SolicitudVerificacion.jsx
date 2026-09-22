import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useCaracteristicasPlan } from '../../../hooks/useCaracteristicasPlan';
import './SolicitudVerificacion.css';

const SolicitudVerificacion = () => {
  const { tiene, cargando: cargandoPlan } = useCaracteristicasPlan();
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [fotoDocumento, setFotoDocumento] = useState(null);
  const [fotoSelfie, setFotoSelfie] = useState(null);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [pasoSubida, setPasoSubida] = useState('');
  const [solicitud, setSolicitud] = useState(null);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(true);

  const inputDocumentoRef = useRef(null);
  const inputSelfieRef = useRef(null);

  useEffect(() => {
    const cargarSolicitud = async () => {
      const { data } = await supabase.rpc('obtener_mi_solicitud_verificacion');
      setSolicitud(data);
      setCargandoSolicitud(false);
    };
    cargarSolicitud();
  }, []);

  const validar = () => {
    const nuevosErrores = {};

    const doc = numeroDocumento.trim();
    if (!doc || doc.length < 6) {
      nuevosErrores.numeroDocumento = 'Ingresá un número de documento válido';
    } else if (!/^[0-9A-Za-z.-]+$/.test(doc)) {
      nuevosErrores.numeroDocumento = 'Solo números, letras, puntos y guiones';
    }

    if (!fotoDocumento) {
      nuevosErrores.fotoDocumento = 'Subí una foto de tu documento';
    } else if (fotoDocumento.size > 8 * 1024 * 1024) {
      nuevosErrores.fotoDocumento = 'La imagen no puede pesar más de 8MB';
    }

    if (!fotoSelfie) {
      nuevosErrores.fotoSelfie = 'Subí una selfie sosteniendo el documento';
    } else if (fotoSelfie.size > 8 * 1024 * 1024) {
      nuevosErrores.fotoSelfie = 'La imagen no puede pesar más de 8MB';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const subirArchivo = async (file, userId, nombre) => {
    const ext = file.name.split('.').pop();
    const ruta = `${userId}/${nombre}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('verificaciones-identidad')
      .upload(ruta, file, { upsert: true });
    if (error) throw error;
    return ruta;
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    try {
      setEnviando(true);
      setErrores({});

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tenés que iniciar sesión');

      // Subida secuencial (no simultánea): más confiable en conexiones móviles débiles
      setPasoSubida('documento');
      const rutaDocumento = await subirArchivo(fotoDocumento, user.id, 'documento');

      setPasoSubida('selfie');
      const rutaSelfie = await subirArchivo(fotoSelfie, user.id, 'selfie');

      setPasoSubida('enviando');
      const { data, error } = await supabase.rpc('crear_solicitud_verificacion', {
        p_numero_documento: numeroDocumento.trim(),
        p_foto_documento_url: rutaDocumento,
        p_foto_selfie_url: rutaSelfie
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSolicitud({ estado: 'pendiente_admin', creado_en: new Date().toISOString() });
      setNumeroDocumento('');
      setFotoDocumento(null);
      setFotoSelfie(null);

    } catch (err) {
      const esErrorDeRed = err instanceof TypeError && err.message === 'Failed to fetch';
      setErrores({
        general: esErrorDeRed
          ? 'Se cortó la conexión mientras subíamos las fotos. Revisá tu señal (wifi o datos) y probá de nuevo — si tenés poca señal, intentá donde tengas mejor cobertura.'
          : (err.message || 'Error al enviar la solicitud')
      });
    } finally {
      setEnviando(false);
      setPasoSubida('');
    }
  };

  const handleSeleccionarDocumento = (e) => {
    setFotoDocumento(e.target.files[0] || null);
    setErrores(prev => ({ ...prev, fotoDocumento: undefined }));
  };

  const handleSeleccionarSelfie = (e) => {
    setFotoSelfie(e.target.files[0] || null);
    setErrores(prev => ({ ...prev, fotoSelfie: undefined }));
  };

  const formatearPeso = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  };

  const textoBoton = () => {
    if (!enviando) return 'Enviar para revisión';
    if (pasoSubida === 'documento') return 'Subiendo documento...';
    if (pasoSubida === 'selfie') return 'Subiendo selfie...';
    return 'Finalizando...';
  };

  if (cargandoPlan || cargandoSolicitud) {
    return (
      <div className="verif-cargando">
        <div className="verif-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!tiene('requiere_validacion_identidad')) {
    return (
      <div className="verif-bloqueado">
        <span className="material-icons">verified</span>
        <h3>Badge Verificado</h3>
        <p>Esta función está disponible desde el Plan Impulso en adelante.</p>
      </div>
    );
  }

  if (solicitud?.estado === 'pendiente_admin') {
    return (
      <div className="verif-estado verif-pendiente">
        <span className="material-icons">hourglass_top</span>
        <h3>Tu solicitud está en revisión</h3>
        <p>La estamos revisando, puede demorar hasta 48hs. Te avisamos por notificación.</p>
      </div>
    );
  }

  if (solicitud?.estado === 'aprobada') {
    return (
      <div className="verif-estado verif-aprobada">
        <span className="material-icons">verified</span>
        <h3>¡Identidad verificada!</h3>
        <p>Tu badge de Verificado ya está activo en tus servicios.</p>
      </div>
    );
  }

  return (
    <div className="verif-container">
      <div className="verif-header">
        <span className="verif-header-icon material-icons">verified</span>
        <div>
          <h2>Solicitar Badge Verificado</h2>
          <p className="verif-intro">
            Subí tu documento y una selfie sosteniéndolo. Lo revisamos manualmente
            antes de activar el tilde en tu perfil.
          </p>
        </div>
      </div>

      {solicitud?.estado === 'rechazada' && (
        <div className="verif-rechazo-aviso">
          <span className="material-icons">error_outline</span>
          <div>
            <strong>Tu última solicitud fue rechazada</strong>
            {solicitud.motivo_rechazo && <p>{solicitud.motivo_rechazo}</p>}
            <p>Podés corregir los datos y volver a enviar.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleEnviar} className="verif-form">
        <div className="verif-group">
          <label htmlFor="verif-doc-numero">Número de documento</label>
          <input
            id="verif-doc-numero"
            type="text"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            placeholder="Ej: 30123456"
            className={errores.numeroDocumento ? 'input-error' : ''}
            disabled={enviando}
          />
          {errores.numeroDocumento && (
            <p className="verif-error">
              <span className="material-icons">error_outline</span>
              {errores.numeroDocumento}
            </p>
          )}
        </div>

        <div className="verif-group">
          <label>Foto de tu documento (frente)</label>
          <button
            type="button"
            className={`verif-upload-btn ${fotoDocumento ? 'verif-upload-listo' : ''} ${errores.fotoDocumento ? 'verif-upload-error' : ''}`}
            onClick={() => inputDocumentoRef.current?.click()}
            disabled={enviando}
          >
            <span className="material-icons verif-upload-icon">
              {fotoDocumento ? 'check_circle' : 'badge'}
            </span>
            <span className="verif-upload-texto">
              {fotoDocumento ? (
                <>
                  <strong>{fotoDocumento.name}</strong>
                  <span>{formatearPeso(fotoDocumento.size)} · Tocá para cambiar</span>
                </>
              ) : (
                <>
                  <strong>Seleccionar foto</strong>
                  <span>JPG o PNG, hasta 8MB</span>
                </>
              )}
            </span>
            <span className="material-icons verif-upload-flecha">chevron_right</span>
          </button>
          <input
            ref={inputDocumentoRef}
            type="file"
            accept="image/*"
            onChange={handleSeleccionarDocumento}
            hidden
          />
          {errores.fotoDocumento && (
            <p className="verif-error">
              <span className="material-icons">error_outline</span>
              {errores.fotoDocumento}
            </p>
          )}
        </div>

        <div className="verif-group">
          <label>Selfie sosteniendo el documento</label>
          <p className="verif-hint">Que se vea tu cara y el documento, ambos legibles</p>
          <button
            type="button"
            className={`verif-upload-btn ${fotoSelfie ? 'verif-upload-listo' : ''} ${errores.fotoSelfie ? 'verif-upload-error' : ''}`}
            onClick={() => inputSelfieRef.current?.click()}
            disabled={enviando}
          >
            <span className="material-icons verif-upload-icon">
              {fotoSelfie ? 'check_circle' : 'photo_camera_front'}
            </span>
            <span className="verif-upload-texto">
              {fotoSelfie ? (
                <>
                  <strong>{fotoSelfie.name}</strong>
                  <span>{formatearPeso(fotoSelfie.size)} · Tocá para cambiar</span>
                </>
              ) : (
                <>
                  <strong>Seleccionar selfie</strong>
                  <span>JPG o PNG, hasta 8MB</span>
                </>
              )}
            </span>
            <span className="material-icons verif-upload-flecha">chevron_right</span>
          </button>
          <input
            ref={inputSelfieRef}
            type="file"
            accept="image/*"
            onChange={handleSeleccionarSelfie}
            hidden
          />
          {errores.fotoSelfie && (
            <p className="verif-error">
              <span className="material-icons">error_outline</span>
              {errores.fotoSelfie}
            </p>
          )}
        </div>

        {errores.general && (
          <div className="verif-error-general">
            <span className="material-icons">wifi_off</span>
            <p>{errores.general}</p>
          </div>
        )}

        <button type="submit" className="verif-btn-enviar" disabled={enviando}>
          {enviando && <span className="verif-btn-spinner"></span>}
          {textoBoton()}
        </button>
      </form>
    </div>
  );
};

export default SolicitudVerificacion;