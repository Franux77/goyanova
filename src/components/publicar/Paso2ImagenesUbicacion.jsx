import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression'; // 👈 NUEVO
import './Paso2ImagenesUbicacion.css';

const Paso2ImagenesUbicacion = ({ 
  formData, 
  setFormData, 
  errores, 
  limiteImagenes = 5,
  membresiaUsuario = 'Gratis'
}) => {
  const navigate = useNavigate();
  const [modalImagen, setModalImagen] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoPortada, setSubiendoPortada] = useState(false);

  // ✅ Calcular si se alcanzó el límite
  const maximoAlcanzado = (formData.imagenesPreview?.length || 0) >= limiteImagenes;

  // 🆕 FUNCIÓN DE COMPRESIÓN
  const comprimirImagen = async (file) => {
    try {
      const options = {
        maxSizeMB: 0.5, // 500KB máximo
        maxWidthOrHeight: 1920, // Full HD
        useWebWorker: true,
        fileType: 'image/jpeg', // Convertir a JPEG para mejor compresión
        initialQuality: 0.85 // Calidad inicial
      };

      const imagenComprimida = await imageCompression(file, options);
      
      // console.log(`📦 Compresión: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(imagenComprimida.size / 1024 / 1024).toFixed(2)}MB`);
      
      return imagenComprimida;
    } catch (error) {
      console.error('❌ Error comprimiendo imagen:', error);
      return file; // Si falla, usar original
    }
  };

  // 🆕 AGREGAR IMÁGENES CON COMPRESIÓN
  const handleAgregarImagenes = async (e) => {
    const archivos = Array.from(e.target.files);
    if (!archivos.length) return;

    const disponibles = limiteImagenes - (formData.imagenesFiles?.length || 0);
    const seleccionados = archivos.slice(0, disponibles);

    setSubiendo(true);

    try {
      // 👇 COMPRIMIR TODAS LAS IMÁGENES EN PARALELO
      const imagenesComprimidas = await Promise.all(
        seleccionados.map(file => comprimirImagen(file))
      );

      const nuevosPreviews = [
        ...(formData.imagenesPreview || []),
        ...imagenesComprimidas.map(file => URL.createObjectURL(file))
      ];
      
      const nuevosFiles = [
        ...(formData.imagenesFiles || []),
        ...imagenesComprimidas
      ];

      setFormData({
        ...formData,
        imagenesFiles: nuevosFiles,
        imagenesPreview: nuevosPreviews,
      });
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes. Intenta nuevamente.');
    } finally {
      setSubiendo(false);
    }
  };

  // 🆕 AGREGAR PORTADA CON COMPRESIÓN
  const handleAgregarPortada = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setSubiendoPortada(true);

    try {
      // 👇 COMPRIMIR PORTADA
      const portadaComprimida = await comprimirImagen(archivo);

      if (formData.portadaPreview && formData.portadaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(formData.portadaPreview);
      }

      setFormData({
        ...formData,
        portadaFile: portadaComprimida,
        portadaPreview: URL.createObjectURL(portadaComprimida),
        portadaAEliminar: null,
      });
    } catch (error) {
      console.error('Error procesando portada:', error);
      alert('Error al procesar la imagen. Intenta nuevamente.');
    } finally {
      setSubiendoPortada(false);
    }
  };

  // 📌 ELIMINAR PORTADA
  const handleEliminarPortada = () => {
    if (formData.portadaPreview || formData.portadaDB) {
      setFormData({
        ...formData,
        portadaAEliminar: formData.portadaDB || formData.portadaPreview,
        portadaPreview: null,
        portadaFile: null,
        portadaDB: null,
      });
    }
  };

  // 📌 ELIMINAR IMAGEN NORMAL
  const handleEliminarImagen = (index) => {
    const nuevosFiles = [...(formData.imagenesFiles || [])];
    const nuevosPreviews = [...(formData.imagenesPreview || [])];

    const imagenEliminada = nuevosPreviews[index];
    if (imagenEliminada && imagenEliminada.startsWith("blob:")) {
      URL.revokeObjectURL(imagenEliminada);
    }

    nuevosFiles.splice(index, 1);
    nuevosPreviews.splice(index, 1);

    const imagenDB = formData.imagenesDB?.[index];
    const nuevasAEliminar = imagenDB
      ? [...(formData.imagenesAEliminar || []), imagenDB]
      : formData.imagenesAEliminar || [];

    setFormData({
      ...formData,
      imagenesFiles: nuevosFiles,
      imagenesPreview: nuevosPreviews,
      imagenesAEliminar: nuevasAEliminar,
    });
  };

  const imagenesListadas = useMemo(() => formData.imagenesPreview || [], [formData.imagenesPreview]);

  return (
    <div className="paso2-container">
      <h2 className="paso2-titulo">Paso 2: Imágenes</h2>

      {/* 📌 Subida portada */}
      <div className="paso2-portada-section">
        <h3 className='h33'>Imagen de portada del servicio (Opcional)</h3>
        <p className="paso2-descripcion">
          Esta será la foto principal que verá el cliente en tu perfil.
          <span style={{ fontSize: '0.85em', color: '#666', display: 'block', marginTop: '0.3rem' }}>
            📦 Las imágenes se comprimen automáticamente para ahorrar espacio
          </span>
        </p>
        <label
          htmlFor="input-agregar-portada"
          className={`paso2-agregar-imagen ${subiendoPortada ? 'deshabilitado' : ''}`}
        >
          <div className="paso2-icono-plus">+</div>
          <div className="paso2-texto-agregar">
            {subiendoPortada ? 'Comprimiendo...' : 'Agregar portada'}
          </div>
        </label>
        <input
          type="file"
          id="input-agregar-portada"
          accept="image/*"
          onChange={handleAgregarPortada}
          style={{ display: 'none' }}
          disabled={subiendoPortada}
        />

        {(formData.portadaPreview || formData.portadaDB) && (
          <div className="paso2-imagen-wrapper">
            <img
              src={formData.portadaPreview || formData.portadaDB}
              alt="Portada subida"
              className="paso2-imagen"
            />
            <button
              type="button"
              className="paso2-btn-eliminar"
              onClick={handleEliminarPortada}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* 📌 Subida imágenes normales */}
      <h3 className='h33'>Imágenes de tus trabajos (Opcional)</h3>
      <div className="paso2-adicionales-info">
        <div className="paso2-limite-info">
          <p className="paso2-descripcion">
            Podés subir hasta <strong>{limiteImagenes}</strong> imágenes adicionales para mostrar tus trabajos y generar más confianza.
          </p>
          <div className="paso2-contador-imagenes">
            <span className={`paso2-contador ${maximoAlcanzado ? 'limite-alcanzado' : ''}`}>
              {formData.imagenesPreview?.length || 0} / {limiteImagenes} imágenes
            </span>
            {membresiaUsuario && (
              <span className="paso2-plan-badge">{membresiaUsuario}</span>
            )}
          </div>
          {maximoAlcanzado && (
            <p className="paso2-limite-alcanzado-msg">
              ⚠️ Has alcanzado el límite de fotos en tu plan {membresiaUsuario}. 
              {membresiaUsuario === 'Gratis' && (
                <button 
                  type="button" 
                  className="btn-mejorar-plan"
                  onClick={() => navigate('/panel/mi-membresia')}
                >
                  Mejorar plan →
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ✅ BOTÓN SE OCULTA CUANDO SE ALCANZA EL LÍMITE */}
      {!maximoAlcanzado && (
        <>
          <label
            htmlFor="input-agregar-imagen"
            className={`paso2-agregar-imagen ${subiendo ? 'deshabilitado' : ''}`}
          >
            <div className="paso2-icono-plus">+</div>
            <div className="paso2-texto-agregar">
              {subiendo ? 'Comprimiendo...' : 'Agregar imágenes de trabajos'}
            </div>
          </label>
          <input
            type="file"
            id="input-agregar-imagen"
            accept="image/*"
            multiple
            onChange={handleAgregarImagenes}
            style={{ display: 'none' }}
            disabled={subiendo}
          />
        </>
      )}

      {errores.imagenesUrls && <p className="paso2-error">{errores.imagenesUrls}</p>}

      <div className="paso2-imagenes-lista">
        {imagenesListadas.map((src, i) => (
          <div key={i} className="paso2-imagen-wrapper">
            <img
              src={src}
              alt={`Imagen subida ${i + 1}`}
              className="paso2-imagen"
              onClick={() => setModalImagen(src)}
            />
            <button
              type="button"
              className="paso2-btn-eliminar"
              onClick={() => handleEliminarImagen(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {modalImagen && (
        <div className="paso2-modal-overlay" onClick={() => setModalImagen(null)}>
          <div className="paso2-modal-contenido" onClick={(e) => e.stopPropagation()}>
            <button className="paso2-modal-close" onClick={() => setModalImagen(null)}>×</button>
            <img src={modalImagen} alt="Vista ampliada" className="paso2-modal-imagen" />
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Paso2ImagenesUbicacion;
