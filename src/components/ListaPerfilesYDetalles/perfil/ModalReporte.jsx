import React, { useState } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../../utils/supabaseClient';
import { puedeReportar, yaReporto, calcularPrioridad } from '../../../utils/validacionesReportes';

import './ModalReporte.css';

const CATEGORIAS_REPORTE = {
  servicio: [
    { value: 'spam', label: 'Spam o publicidad no deseada' },
    { value: 'informacion_falsa', label: 'Información falsa o engañosa' },
    { value: 'negocio_cerrado', label: 'Negocio cerrado o datos incorrectos' },
    { value: 'suplantacion', label: 'Suplantación de identidad' },
    { value: 'contenido_inapropiado', label: 'Contenido inapropiado u ofensivo' },
    { value: 'abuso_precio', label: 'Abuso de precio o estafa' },
    { value: 'ilegal', label: 'Actividad ilegal' },
    { value: 'otro', label: 'Otro' }
  ],
  comentario: [
    { value: 'spam', label: 'Spam o contenido repetitivo' },
    { value: 'ofensivo', label: 'Contenido ofensivo o inapropiado' },
    { value: 'informacion_falsa', label: 'Información falsa' },
    { value: 'acoso', label: 'Acoso o intimidación' },
    { value: 'irrelevante', label: 'Contenido irrelevante' },
    { value: 'otro', label: 'Otro' }
  ]
};

const ModalReporte = ({
  isOpen,
  onClose,
  tipoContenido,
  contenidoId,
  servicioId,
  nombreServicio
}) => {
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoria) {
      setError('Por favor selecciona una categoría');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Debes iniciar sesión para reportar');
        setEnviando(false);
        return;
      }

      // 🔹 Validar límite de reportes (rate limit)
      const puedeHacerReporte = await puedeReportar(user.id);
      if (!puedeHacerReporte) {
        setError('Has alcanzado el límite de reportes por hora. Intenta más tarde.');
        setEnviando(false);
        return;
      }

      // 🔹 Validar si ya reportó
      const reportoDuplicado = await yaReporto(user.id, tipoContenido, contenidoId);
      if (reportoDuplicado) {
        setError('Ya has reportado este contenido anteriormente');
        setEnviando(false);
        return;
      }

      // 🔹 Calcular prioridad
      const prioridad = await calcularPrioridad(tipoContenido, contenidoId);

      // 🔹 Insertar el reporte (CORREGIDO: reportante_id en vez de reportado_por)
      const { error: insertError } = await supabase
        .from('reportes')
        .insert({
          reportante_id: user.id,  // ✅ CORRECTO
          tipo_contenido: tipoContenido,
          contenido_id: contenidoId,
          servicio_id: servicioId,
          categoria,
          descripcion: descripcion.trim() || null,
          prioridad
        });

      if (insertError) throw insertError;

      setExito(true);
      setTimeout(() => {
        onClose();
        setExito(false);
        setCategoria('');
        setDescripcion('');
      }, 2000);

    } catch (err) {
      console.error('Error al enviar reporte:', err);
      setError('Hubo un error al enviar el reporte. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  const categorias = CATEGORIAS_REPORTE[tipoContenido] || CATEGORIAS_REPORTE.servicio;

  return (
    <div className="modal-reporte-overlay" onClick={onClose}>
      <div className="modal-reporte-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-reporte-cerrar" onClick={onClose}>
          <FiX size={24} />
        </button>

        {exito ? (
          <div className="reporte-exito">
            <FiAlertCircle size={48} color="#4caf50" />
            <h3>¡Reporte enviado!</h3>
            <p>Gracias por ayudarnos a mantener la comunidad segura</p>
          </div>
        ) : (
          <>
            <div className="modal-reporte-header">
              <h2>Reportar {tipoContenido === 'servicio' ? 'negocio' : 'comentario'}</h2>
              {nombreServicio && (
                <p className="modal-reporte-nombre">{nombreServicio}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="modal-reporte-form">
              <div className="form-group">
                <label>¿Por qué reportas este contenido? *</label>
                <div className="categorias-grid">
                  {categorias.map((cat) => (
                    <label key={cat.value} className="categoria-opcion">
                      <input
                        type="radio"
                        name="categoria"
                        value={cat.value}
                        checked={categoria === cat.value}
                        onChange={(e) => setCategoria(e.target.value)}
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">
                  Detalles adicionales (opcional)
                </label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Proporciona más información sobre el problema..."
                  maxLength={500}
                  rows={4}
                />
                <small>{descripcion.length}/500 caracteres</small>
              </div>

              {error && (
                <div className="reporte-error">
                  <FiAlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-reporte-botones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={onClose}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-enviar-reporte"
                  disabled={enviando || !categoria}
                >
                  {enviando ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalReporte;