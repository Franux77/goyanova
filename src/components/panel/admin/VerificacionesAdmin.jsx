import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './VerificacionesAdmin.css';

const VerificacionesAdmin = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState({});
  const [procesando, setProcesando] = useState(null);
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('listar_solicitudes_verificacion_pendientes');
    if (error) {
      console.error(error);
      setSolicitudes([]);
    } else {
      setSolicitudes(data || []);
      const nuevasUrls = {};
      for (const s of data || []) {
        const [doc, selfie] = await Promise.all([
          supabase.storage.from('verificaciones-identidad').createSignedUrl(s.foto_documento_url, 3600),
          supabase.storage.from('verificaciones-identidad').createSignedUrl(s.foto_selfie_url, 3600)
        ]);
        nuevasUrls[s.id] = {
          documento: doc.data?.signedUrl,
          selfie: selfie.data?.signedUrl
        };
      }
      setUrls(nuevasUrls);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleAprobar = async (id) => {
    if (!window.confirm('¿Aprobar esta verificación? El badge se activa al instante.')) return;
    try {
      setProcesando(id);
      const { data, error } = await supabase.rpc('revisar_solicitud_verificacion', {
        p_solicitud_id: id,
        p_aprobar: true
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setSolicitudes(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      alert('Escribí un motivo para el rechazo');
      return;
    }
    try {
      setProcesando(modalRechazo);
      const { data, error } = await supabase.rpc('revisar_solicitud_verificacion', {
        p_solicitud_id: modalRechazo,
        p_aprobar: false,
        p_motivo: motivoRechazo.trim()
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setSolicitudes(prev => prev.filter(s => s.id !== modalRechazo));
      setModalRechazo(null);
      setMotivoRechazo('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcesando(null);
    }
  };

  if (loading) {
    return <div className="verifadmin-loading">Cargando solicitudes...</div>;
  }

  return (
    <div className="verifadmin-container">
      <div className="verifadmin-header">
        <h1>
          <span className="material-icons">verified</span>
          Verificaciones de Identidad
        </h1>
        <span className="verifadmin-contador">{solicitudes.length} pendientes</span>
      </div>

      {solicitudes.length === 0 ? (
        <div className="verifadmin-vacio">
          <span className="material-icons">check_circle</span>
          <p>No hay solicitudes pendientes</p>
        </div>
      ) : (
        <div className="verifadmin-lista">
          {solicitudes.map((s) => (
            <div key={s.id} className="verifadmin-card">
              <div className="verifadmin-fotos">
                {urls[s.id]?.documento && (
                  <button
                    type="button"
                    className="verifadmin-foto-btn"
                    onClick={() => setPreviewUrl(urls[s.id].documento)}
                  >
                    <img src={urls[s.id].documento} alt="Documento" />
                    <span>Documento</span>
                  </button>
                )}
                {urls[s.id]?.selfie && (
                  <button
                    type="button"
                    className="verifadmin-foto-btn"
                    onClick={() => setPreviewUrl(urls[s.id].selfie)}
                  >
                    <img src={urls[s.id].selfie} alt="Selfie" />
                    <span>Selfie</span>
                  </button>
                )}
              </div>

              <div className="verifadmin-info">
                <h3>{s.nombre_completo}</h3>
                <p className="verifadmin-email">{s.email}</p>
                <p className="verifadmin-doc">
                  <strong>Doc:</strong> {s.numero_documento}
                  <span className="verifadmin-fecha"> · {new Date(s.creado_en).toLocaleDateString('es-AR')}</span>
                </p>
                <button
                  type="button"
                  className="verifadmin-link-perfil"
                  onClick={() => {
                    navigator.clipboard.writeText(s.email);
                    alert(`Email copiado: ${s.email}\n\nPegalo en el buscador de "Servicios" para ver sus publicaciones antes de aprobar.`);
                  }}
                >
                  <span className="material-icons">content_copy</span>
                  Copiar email
                </button>
              </div>

              <div className="verifadmin-acciones">
                <button
                  className="verifadmin-btn-aprobar"
                  onClick={() => handleAprobar(s.id)}
                  disabled={procesando === s.id}
                >
                  <span className="material-icons">check</span>
                  Aprobar
                </button>
                <button
                  className="verifadmin-btn-rechazar"
                  onClick={() => setModalRechazo(s.id)}
                  disabled={procesando === s.id}
                >
                  <span className="material-icons">close</span>
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="verifadmin-preview-overlay" onClick={() => setPreviewUrl(null)}>
          <button className="verifadmin-preview-cerrar" onClick={() => setPreviewUrl(null)}>
            <span className="material-icons">close</span>
          </button>
          <img
            src={previewUrl}
            alt="Vista previa"
            className="verifadmin-preview-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {modalRechazo && (
        <div className="verifadmin-modal-overlay" onClick={() => setModalRechazo(null)}>
          <div className="verifadmin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Motivo del rechazo</h3>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej: La foto del documento no se lee bien"
              rows={3}
            />
            <div className="verifadmin-modal-acciones">
              <button onClick={() => setModalRechazo(null)}>Cancelar</button>
              <button className="verifadmin-btn-confirmar-rechazo" onClick={handleRechazar}>
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificacionesAdmin;