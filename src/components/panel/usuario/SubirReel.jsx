import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { procesarVideoReel } from '../../../utils/videoHelpers';
import './SubirReel.css';

const SubirReel = ({ servicioId }) => {
  const [reelActivo, setReelActivo] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [pasoActual, setPasoActual] = useState(''); // texto de progreso
  const [avisoRecorte, setAvisoRecorte] = useState(null);
  const [error, setError] = useState(null);
  const [eliminando, setEliminando] = useState(false); // 🆕

  const cargarReelActivo = async () => {
    setCargandoEstado(true);
    const { data } = await supabase
      .from('reels_servicio')
      .select('id, video_url, expira_en')
      .eq('servicio_id', servicioId)
      .eq('activo', true)
      .gt('expira_en', new Date().toISOString())
      .order('publicado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    setReelActivo(data || null);
    setCargandoEstado(false);
  };

    // 🆕 Borrar la historia antes de que se cumplan las 24hs
  const handleEliminar = async () => {
    if (!window.confirm('¿Borrar tu historia activa? No se puede deshacer.')) return;

    setEliminando(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('eliminar_mi_reel', {
        p_servicio_id: servicioId
      });

      if (rpcError) throw rpcError;
      if (!data.success) throw new Error(data.error);

      // Borramos también el archivo del Storage
      if (data.video_path) {
        await supabase.storage.from('reels').remove([data.video_path]);
      }

      await cargarReelActivo();
    } catch (err) {
      console.error('Error eliminando reel:', err);
      alert(err.message || 'No se pudo borrar la historia');
    } finally {
      setEliminando(false);
    }
  };

  useEffect(() => {
    cargarReelActivo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId]);

  const horasRestantes = (expiraEn) => {
    const ms = new Date(expiraEn).getTime() - Date.now();
    return Math.max(0, Math.round(ms / 3600000));
  };

  const handleArchivo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setError(null);
    setAvisoRecorte(null);
    setProcesando(true);

    try {
      setPasoActual('Leyendo el video...');
      const { file, duracionFinal, mensaje } = await procesarVideoReel(archivo);
      if (mensaje) setAvisoRecorte(mensaje);

      setPasoActual('Subiendo...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tenés que iniciar sesión');

      const ext = mensaje ? 'webm' : (archivo.name.split('.').pop() || 'mp4');
      const ruta = `${user.id}/${servicioId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(ruta, file, { upsert: true, contentType: file.type || 'video/mp4' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('reels').getPublicUrl(ruta);

      setPasoActual('Publicando...');
      const { data: resultado, error: rpcError } = await supabase.rpc('publicar_reel', {
        p_servicio_id: servicioId,
        p_video_url: urlData.publicUrl,
        p_video_path: ruta,
        p_duracion_seg: duracionFinal
      });

      if (rpcError) throw rpcError;
      if (!resultado.success) throw new Error(resultado.error);

      await cargarReelActivo();

    } catch (err) {
      console.error('Error subiendo reel:', err);
      setError(err.message || 'No se pudo subir el video');
    } finally {
      setProcesando(false);
      setPasoActual('');
      e.target.value = '';
    }
  };

  if (cargandoEstado) return null;

  return (
    <div className="subirreel-container">
                  {reelActivo ? (
        <div className="subirreel-activo">
          <div className="subirreel-info">
            <span className="material-icons">play_circle</span>
            <div>
              <strong>Historia activa</strong>
              <p>Se borra sola en {horasRestantes(reelActivo.expira_en)}hs</p>
            </div>
          </div>
          <button
            type="button"
            className="subirreel-btn-eliminar"
            onClick={handleEliminar}
            disabled={eliminando}
            title="Borrar historia ahora"
          >
            <span className="material-icons">{eliminando ? 'hourglass_empty' : 'delete'}</span>
          </button>
        </div>
      ) : (
        <p className="subirreel-sin-reel">No tenés una historia activa</p>
      )}

      <label className={`subirreel-btn ${procesando ? 'deshabilitado' : ''}`}>
        <span className="material-icons">videocam</span>
        {procesando ? (pasoActual || 'Procesando...') : (reelActivo ? 'Reemplazar historia' : 'Subir historia')}
        <input
          type="file"
          accept="video/*"
          onChange={handleArchivo}
          disabled={procesando}
          style={{ display: 'none' }}
        />
      </label>

      <p className="subirreel-nota">Máximo 30 segundos · se borra a las 24hs</p>

      {avisoRecorte && (
        <p className="subirreel-aviso">
          <span className="material-icons">info</span>
          {avisoRecorte}
        </p>
      )}

      {error && (
        <p className="subirreel-error">
          <span className="material-icons">error</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default SubirReel;