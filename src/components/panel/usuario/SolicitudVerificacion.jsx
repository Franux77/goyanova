import React, { useState, useEffect } from 'react';
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
  const [solicitud, setSolicitud] = useState(null);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(true);

  useEffect(() => {
    const cargarSolicitud = async () => {
      const { data } = await supabase.rpc('obtener_mi_solicitud_verificacion');
      setSolicitud(data);
      setCargandoSolicitud(false);
    };
    cargarSolicitud();
  }, []);

  // Pre-validación en el momento: completitud, formato y tamaño de archivo.
  // No reemplaza la revisión del admin, solo evita que llegue algo incompleto.
  const validar = () => {
    const nuevosErrores = {};

    const doc = numeroDocumento.trim();
    if (!doc || doc.length < 6) {
      nuevosErrores.numeroDocumento = 'Ingresá un número de documento válido';
    } else if (!/^[0-9A-Za-z.\-]+$/.test(doc)) {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tenés que iniciar sesión');

      const [rutaDocumento, rutaSelfie] = await Promise.all([
        subirArchivo(fotoDocumento, user.id, 'documento'),
        subirArchivo(fotoSelfie, user.id, 'selfie')
      ]);

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
      setErrores({ general: err.message || 'Error al enviar la solicitud' });
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoPlan || cargandoSolicitud) {
    return <div className="verif-cargando">Cargando...</div>;
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
      <h2>
        <span className="material-icons">verified</span>
        Solicitar Badge Verificado
      </h2>
      <p className="verif-intro">
        Subí tu documento y una selfie sosteniéndolo. Lo revisamos manualmente
        antes de activar el tilde en tu perfil.
      </p>

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
          <label>Número de documento *</label>
          <input
            type="text"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            placeholder="Ej: 30123456"
            className={errores.numeroDocumento ? 'input-error' : ''}
          />
          {errores.numeroDocumento && <p className="verif-error">{errores.numeroDocumento}</p>}
        </div>

        <div className="verif-group">
          <label>Foto de tu documento (frente) *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFotoDocumento(e.target.files[0] || null)}
          />
          {errores.fotoDocumento && <p className="verif-error">{errores.fotoDocumento}</p>}
        </div>

        <div className="verif-group">
          <label>Selfie sosteniendo el documento *</label>
          <p className="verif-hint">Que se vea tu cara y el documento, ambos legibles</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFotoSelfie(e.target.files[0] || null)}
          />
          {errores.fotoSelfie && <p className="verif-error">{errores.fotoSelfie}</p>}
        </div>

        {errores.general && <p className="verif-error verif-error-general">{errores.general}</p>}

        <button type="submit" className="verif-btn-enviar" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar para revisión'}
        </button>
      </form>
    </div>
  );
};

export default SolicitudVerificacion;