// src/utils/videoHelpers.js
//
// Reglas del reel:
//  - Si el video dura 30s o menos, se sube TAL CUAL (calidad intacta).
//  - Si dura más, se recortan los primeros 30s. Esto SÍ reprocesa el
//    video (usando MediaRecorder + canvas, no hay forma de cortar sin
//    reprocesar en el navegador sin librerías pesadas tipo ffmpeg.wasm).
//    La calidad baja un poco en ese caso puntual, nunca en el resto.
//  - Siempre se le avisa al usuario qué se hizo, nunca en silencio.

export const LIMITE_DURACION_SEG = 30;
export const LIMITE_PESO_BYTES = 25 * 1024 * 1024; // 25MB, mismo límite del bucket

export const formatearMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

// Lee la duración real del video sin subirlo a ningún lado
export const obtenerDuracionVideo = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duracion = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(duracion);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('No se pudo leer el video. Probá con otro archivo.'));
    };
    video.src = URL.createObjectURL(file);
  });
};

// Recorta a los primeros 30 segundos. Devuelve un Blob nuevo (webm).
// Solo se llama si el video mide más de 30s.
export const recortarVideoA30Segundos = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = false;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      const streamVideo = canvas.captureStream(30); // 30fps

      // Intentamos mantener el audio original mezclándolo al stream
      let streamFinal = streamVideo;
      try {
        if (video.captureStream) {
          const audioTracks = video.captureStream().getAudioTracks();
          if (audioTracks.length) {
            streamFinal = new MediaStream([
              ...streamVideo.getVideoTracks(),
              ...audioTracks
            ]);
          }
        }
      } catch {
        // Sin audio si el navegador no lo permite: mejor un video mudo
        // que fallar la subida entera.
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(streamFinal, {
        mimeType,
        videoBitsPerSecond: 2_500_000 // calidad razonable, no la máxima
      });

      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
      recorder.onerror = (e) => reject(e.error || new Error('Error al recortar el video'));

      let dibujando = true;
      const dibujarFrame = () => {
        if (!dibujando) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(dibujarFrame);
      };

      video.currentTime = 0;
      video.play().then(() => {
        recorder.start();
        dibujarFrame();

        setTimeout(() => {
          dibujando = false;
          video.pause();
          recorder.stop();
        }, LIMITE_DURACION_SEG * 1000);
      }).catch(reject);
    };

    video.onerror = () => reject(new Error('No se pudo procesar el video'));
  });
};

// Función principal: valida y procesa un archivo de video para el reel.
// Devuelve { file, mensaje } — mensaje es null si no hizo falta avisar nada.
export const procesarVideoReel = async (file) => {
  if (file.size > LIMITE_PESO_BYTES) {
    throw new Error(
      `El video pesa ${formatearMB(file.size)}MB. El máximo es ${formatearMB(LIMITE_PESO_BYTES)}MB. ` +
      `Probá grabar en menor calidad desde la cámara.`
    );
  }

  const duracion = await obtenerDuracionVideo(file);

  if (duracion <= LIMITE_DURACION_SEG) {
    return { file, duracionFinal: duracion, mensaje: null };
  }

  const recortado = await recortarVideoA30Segundos(file);
  return {
    file: recortado,
    duracionFinal: LIMITE_DURACION_SEG,
    mensaje: `Tu video duraba ${Math.round(duracion)} segundos, se usaron los primeros 30.`
  };
};