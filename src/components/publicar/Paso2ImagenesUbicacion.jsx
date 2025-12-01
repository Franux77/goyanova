import React, { useState, useMemo } from 'react';
import './Paso2ImagenesUbicacion.css';

const Paso2ImagenesUbicacion = ({ 
  formData, 
  setFormData, 
  errores, 
  limiteImagenes = 5,
  membresiaUsuario = 'Gratis'
}) => {
  const [modalImagen, setModalImagen] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoPortada, setSubiendoPortada] = useState(false);

  // ✅ Calcular si se alcanzó el límite
  const maximoAlcanzado = (formData.imagenesPreview?.length || 0) >= limiteImagenes;

  // -----------------------------
  // 📌 AGREGAR IMAGENES EN MEMORIA
  // -----------------------------
  const handleAgregarImagenes = (e) => {
    const archivos = Array.from(e.target.files);
    if (!archivos.length) return;

    const disponibles = limiteImagenes - (formData.imagenesFiles?.length || 0);
    const seleccionados = archivos.slice(0, disponibles);

    setSubiendo(true);

    const nuevosPreviews = [
      ...(formData.imagenesPreview || []),
      ...seleccionados.map(file => URL.createObjectURL(file))
    ];
    const nuevosFiles = [
      ...(formData.imagenesFiles || []),
      ...seleccionados
    ];

    setFormData({
      ...formData,
      imagenesFiles: nuevosFiles,
      imagenesPreview: nuevosPreviews,
    });

    setSubiendo(false);
  };

  // -----------------------------
  // 📌 AGREGAR PORTADA EN MEMORIA
  // -----------------------------
  const handleAgregarPortada = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setSubiendoPortada(true);

    if (formData.portadaPreview && formData.portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.portadaPreview);
    }

    setFormData({
      ...formData,
      portadaFile: archivo,
      portadaPreview: URL.createObjectURL(archivo),
      portadaAEliminar: null,
    });

    setSubiendoPortada(false);
  };

  // -----------------------------
  // 📌 ELIMINAR PORTADA
  // -----------------------------
  const handleEliminarPortada = () => {
    if (formData.portadaPreview || formData.portadaDB) {
      console.log("🗑 Marcando portada para eliminar:", formData.portadaPreview || formData.portadaDB);

      setFormData({
        ...formData,
        portadaAEliminar: formData.portadaDB || formData.portadaPreview,
        portadaPreview: null,
        portadaFile: null,
        portadaDB: null,
      });
    }
  };

  // -----------------------------
  // 📌 ELIMINAR IMAGEN NORMAL
  // -----------------------------
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
        <h3 className='h33'>Imagen de portada del servicio</h3>
        <p className="paso2-descripcion">
          Esta será la foto principal que verá el cliente en tu perfil.
        </p>
        <label
          htmlFor="input-agregar-portada"
          className={`paso2-agregar-imagen ${subiendoPortada ? 'deshabilitado' : ''}`}
        >
          <div className="paso2-icono-plus">+</div>
          <div className="paso2-texto-agregar">
            {subiendoPortada ? 'Cargando...' : 'Agregar portada'}
          </div>
        </label>
        <input
          type="file"
          id="input-agregar-portada"
          accept="image/*"
          onChange={handleAgregarPortada}
          style={{ display: 'none' }}
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
      <h3 className='h33'>Imágenes de tus trabajos</h3>
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
              ⚠️ Has alcanzado el límite de tu plan. 
              {membresiaUsuario === 'Gratis' && (
                <button 
                  type="button" 
                  className="btn-mejorar-plan"
                  onClick={() => window.location.href = '/panel/mi-membresia'}
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
              {subiendo ? 'Cargando...' : 'Agregar imágenes de trabajos'}
            </div>
          </label>
          <input
            type="file"
            id="input-agregar-imagen"
            accept="image/*"
            multiple
            onChange={handleAgregarImagenes}
            style={{ display: 'none' }}
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