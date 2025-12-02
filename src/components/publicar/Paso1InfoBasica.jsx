import React, { useState, useEffect, useMemo } from 'react';
import ModalMapa from './ModalMapa';
import { supabase } from '../../utils/supabaseClient';
import './Paso1InfoBasica.css';

const caracteresPermitidos = (texto) =>
  /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ.,;:()¡!?"' -]+$/.test(texto);

// 🔹 Función auxiliar para limpiar espacios
const normalizarTexto = (t) => t?.trim().replace(/\s+/g, ' ') || '';

export const validarPaso1 = (formData) => {
  const errores = {};

  // --- Nombre ---
  const nombre = normalizarTexto(formData.nombre);
  if (!nombre) errores.nombre = 'El nombre es obligatorio';
  else if (nombre.length < 3)
    errores.nombre = 'El nombre debe tener al menos 3 caracteres';
  else if (nombre.length > 50)
    errores.nombre = 'El nombre no puede superar los 50 caracteres';
  else if (!caracteresPermitidos(nombre))
    errores.nombre = 'El nombre contiene caracteres no permitidos';
  else if (/^\d+$/.test(nombre))
    errores.nombre = 'El nombre no puede ser solo números';

  // --- Tipo ---
  if (!formData.tipo?.trim()) errores.tipo = 'Selecciona un tipo';

  // --- Categoría ---
  if (!formData.categoria?.toString()?.trim())
    errores.categoria = 'Selecciona una categoría válida';

  // --- Descripción ---
  const descripcion = normalizarTexto(formData.descripcion);
  if (!descripcion)
    errores.descripcion = 'La descripción es obligatoria';
  else if (descripcion.length < 10)
    errores.descripcion = 'La descripción debe tener al menos 10 caracteres';
  else if (descripcion.length > 300)
    errores.descripcion = 'La descripción no puede superar los 300 caracteres';
  else if (!caracteresPermitidos(descripcion))
    errores.descripcion = 'La descripción contiene caracteres no permitidos';

  // --- Dirección escrita ---
  const direccion = normalizarTexto(formData.direccion_escrita);
  if (!direccion)
    errores.direccion_escrita = 'La dirección escrita es obligatoria';
  else if (direccion.length < 5)
    errores.direccion_escrita = 'La dirección debe tener al menos 5 caracteres';
  else if (direccion.length > 120)
    errores.direccion_escrita = 'La dirección no puede superar los 120 caracteres';
  else if (!caracteresPermitidos(direccion))
    errores.direccion_escrita = 'La dirección contiene caracteres no permitidos';

  // --- Referencia (opcional, pero se valida si tiene contenido) ---
  const referencia = normalizarTexto(formData.ubicacion?.referencia);
  if (referencia) {
    if (referencia.length > 150)
      errores.referencia = 'La referencia no puede superar los 150 caracteres';
    else if (!caracteresPermitidos(referencia))
      errores.referencia = 'La referencia contiene caracteres no permitidos';
  }

  // --- Ubicación (lat/lng) ---
  if (
    !formData.ubicacion ||
    typeof formData.ubicacion.lat !== 'number' ||
    typeof formData.ubicacion.lng !== 'number'
  ) {
    errores.ubicacion = 'Debes seleccionar una ubicación en el mapa';
  }

  return errores;
};

const Paso1InfoBasica = ({ formData, setFormData }) => {
  const [nombreLocal, setNombreLocal] = useState('');
  const [descripcionLocal, setDescripcionLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [referenciaLocal, setReferenciaLocal] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [coordenadasMostrar, setCoordenadasMostrar] = useState({ lat: null, lng: null });

  // ✅ Cargar datos cuando llega formData (nuevo o editado)
  useEffect(() => {
    if (!formData) return;

    setNombreLocal(formData.nombre || '');
    setDescripcionLocal(formData.descripcion || '');
    setDireccionLocal(formData.direccion_escrita || '');
    setReferenciaLocal(formData.ubicacion?.referencia || '');
    setTipoSeleccionado(formData.tipo || '');

    setCoordenadasMostrar({
      lat: formData.ubicacion?.lat || formData.latitud || null,
      lng: formData.ubicacion?.lng || formData.longitud || null,
    });
  }, [formData]);

  // --- Inicializar categoría al cargar ---
  useEffect(() => {
    if (formData?.categoria && categorias.length > 0) {
      const cat = categorias.find(c => c.id === formData.categoria);
      if (cat) {
        setBusqueda(cat.nombre);
      }
    }
  }, [formData?.categoria, categorias]);

  // --- Inicializar coordenadas ---
  useEffect(() => {
    if (formData?.ubicacion) {
      setCoordenadasMostrar({
        lat: formData.ubicacion.lat || null,
        lng: formData.ubicacion.lng || null,
      });
      setReferenciaLocal(formData.ubicacion.referencia || '');
    }
  }, [formData?.ubicacion]);

  // --- Cargar categorías según tipo ---
  useEffect(() => {
    const fetchCategorias = async () => {
      if (!tipoSeleccionado) {
        setCategorias([]);
        setBusqueda('');
        return;
      }
      setLoadingCategorias(true);
      try {
        const { data, error } = await supabase
          .from('categorias')
          .select('*')
          .eq('tipo', tipoSeleccionado)
          .eq('estado', 'activa');

        if (error) throw error;

        setCategorias(data || []);

        if (formData?.categoria) {
          const cat = data?.find((c) => c.id === formData.categoria);
          if (cat) {
            setBusqueda(cat.nombre);
          }
        }
      } catch (err) {
        setCategorias([]);
      } finally {
        setLoadingCategorias(false);
      }
    };
    fetchCategorias();
  }, [tipoSeleccionado, formData?.categoria]);

  const categoriasFiltradas = useMemo(() => {
    if (!categorias) return [];

    // Si hay categoría seleccionada, mostrar solo esa
    if (formData.categoria) {
      const catSeleccionada = categorias.find(c => c.id === formData.categoria);
      if (catSeleccionada) return [catSeleccionada];
    }

    // Si no hay selección, filtrar por búsqueda
    return categorias.filter((cat) =>
      cat.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [categorias, busqueda, formData.categoria]);

  // --- Handlers (guardan automáticamente en formData) ---
  const handleNombreChange = (e) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setNombreLocal(value);
      setFormData((prev) => ({ ...prev, nombre: value }));
    }
  };

  const handleTipoChange = (e) => {
    const value = e.target.value;
    setTipoSeleccionado(value);

    // 🔹 Limpiar categoría y búsqueda si cambiamos de tipo
    setFormData(prev => ({ ...prev, categoria: '' }));
    setBusqueda('');

    setFormData(prev => ({ ...prev, tipo: value }));
  };

  const handleDescripcionChange = (e) => {
    const value = e.target.value;
    if (value.length <= 300) {
      setDescripcionLocal(value);
      setFormData((prev) => ({ ...prev, descripcion: value }));
    }
  };

  const handleDireccionChange = (e) => {
    const value = e.target.value;
    if (value.length <= 120) {
      setDireccionLocal(value);
      setFormData((prev) => ({ ...prev, direccion_escrita: value }));
    }
  };

  const handleReferenciaChange = (e) => {
    const value = e.target.value;
    if (value.length <= 150) {
      setReferenciaLocal(value);
      setFormData((prev) => ({
        ...prev,
        ubicacion: {
          ...(prev?.ubicacion || {}),
          referencia: value,
        },
      }));
    }
  };

  const handleCategoriaClick = (categoria) => {
    setFormData((prev) => ({
      ...prev,
      categoria: categoria.id,
      categoriaNombre: categoria.nombre || ''
    }));
    setBusqueda(categoria.nombre || '');
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    setFormData((prev) => ({ ...prev, categoria: '' }));
  };

  // --- Modal mapa ---
  const abrirModalMapa = () => setModalAbierto(true);
  const cerrarModalMapa = () => setModalAbierto(false);
  const guardarUbicacion = (lat, lng) => {
    setFormData((prev) => ({ ...prev, ubicacion: { lat, lng, referencia: referenciaLocal } }));
    setCoordenadasMostrar({ lat, lng });
    setModalAbierto(false);
  };

  const mostrarCoordenada = (coord) =>
    typeof coord === 'number' ? coord.toFixed(6) : 'No definido';

  // --- JSX ---
  return (
    <div className="paso1-container">
      <h2 className="titulo-paso">Información básica</h2>
      {/* <p className="subtitulo-paso">
        Completa todos los campos que sean obligatorios para continuar.
      </p> */}

      <label>Nombre del servicio o producto *</label>
      <input
        type="text"
        value={nombreLocal}
        onChange={handleNombreChange}
        placeholder="Ej: Clases de guitarra, Venta de ropa artesanal"
        maxLength={50}
      />
      <div className="char-counter">{nombreLocal.length}/50</div>

      <label>¿Qué vas a publicar? *</label>
      <select value={tipoSeleccionado} onChange={handleTipoChange}>
        <option value="">Seleccioná tipo de servicio</option>
        <option value="servicio">Servicio</option>
        <option value="producto">Producto</option>
      </select>

      <label>Categoría relacionada *</label>
      <div className="input-busqueda-wrapper">
        <input
          type="text"
          value={busqueda || ''}
          onChange={(e) => {
            const value = e.target.value.slice(0, 50);
            setBusqueda(value);

            // 🔹 Si borramos todo, también limpiamos la categoría seleccionada
            if (!value) {
              setFormData(prev => ({ ...prev, categoria: '' }));
            }
          }}
          disabled={!tipoSeleccionado}
          placeholder="Escribí o seleccioná una categoría"
          maxLength={50}
        />

        {busqueda && (
          <button type="button" className="limpiar-btn" onClick={limpiarBusqueda}>
            &times;
          </button>
        )}
      </div>

      <div className="mg-categoria-list">
        {loadingCategorias ? (
          <div className="mg-spinner-wrapper" aria-live="polite">
            <p className="mg-spinner-text">Cargando categorías...</p>
            <div className="mg-mini-spinner" role="status" aria-label="Cargando"></div>
          </div>
        ) : categoriasFiltradas.length > 0 ? (
          <div className="mg-categoria-grid">
            {categoriasFiltradas.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`mg-categoria-item ${formData.categoria === cat.id ? 'mg-categoria-selected' : ''}`}
                onClick={() => handleCategoriaClick(cat)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        ) : tipoSeleccionado ? (
          <p className="sin-resultados">No se encontraron categorías</p>
        ) : null}
      </div>

      <label>Descripción *</label>
      <textarea
        value={descripcionLocal}
        onChange={handleDescripcionChange}
        rows={3}
        placeholder="Contá brevemente qué ofrecés y a quién está dirigido"
        maxLength={300}
      />
      <div className="char-counter">{descripcionLocal.length}/300</div>

      <label>Dirección escrita exacta *</label>
      <input
        type="text"
        value={direccionLocal}
        onChange={handleDireccionChange}
        placeholder="Ej: Barrio Alem, Calle Sarmiento, Número 123"
        maxLength={120}
      />
      <div className="char-counter">{direccionLocal.length}/120</div>

      <label>Referencia adicional (opcional)</label>
      <textarea
        value={referenciaLocal}
        onChange={handleReferenciaChange}
        rows={3}
        maxLength={150}
        placeholder="Ej: En una esquina, casa de color verde, frente a la plaza"
      />
      <div className="char-counter">{referenciaLocal.length}/150</div>

      <button type="button" className="btn-abrir-mapa" onClick={abrirModalMapa}>
        Abrir mapa para fijar ubicación exacta
      </button>

      {coordenadasMostrar.lat && coordenadasMostrar.lng && (
        <p className="coordenadas-info">
          📍 Ubicación guardada: <strong>Lat:</strong> {mostrarCoordenada(coordenadasMostrar.lat)} –{' '}
          <strong>Lng:</strong> {mostrarCoordenada(coordenadasMostrar.lng)}
        </p>
      )}

      {modalAbierto && (
  <ModalMapa 
    onGuardar={guardarUbicacion} 
    onCerrar={cerrarModalMapa}
    ubicacion={formData.ubicacion}
  />
)}
    </div>
  );
};

export default Paso1InfoBasica;