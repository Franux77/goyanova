import React, { useState, useEffect, useMemo } from 'react';
import ModalMapa from './ModalMapa';
import { supabase } from '../../utils/supabaseClient';
import './Paso1InfoBasica.css';

const caracteresPermitidos = (texto) =>
  /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ.,;:()¡!?"' -]+$/.test(texto);

const normalizarTexto = (t) => t?.trim().replace(/\s+/g, ' ') || '';

export const validarPaso1 = (formData) => {
  const errores = {};

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

  if (!formData.tipo?.trim()) errores.tipo = 'Selecciona un tipo';

  if (!formData.categoria?.toString()?.trim())
    errores.categoria = 'Selecciona una categoría válida';

  const descripcion = normalizarTexto(formData.descripcion);
  if (!descripcion)
    errores.descripcion = 'La descripción es obligatoria';
  else if (descripcion.length < 10)
    errores.descripcion = 'La descripción debe tener al menos 10 caracteres';
  else if (descripcion.length > 300)
    errores.descripcion = 'La descripción no puede superar los 300 caracteres';
  else if (!caracteresPermitidos(descripcion))
    errores.descripcion = 'La descripción contiene caracteres no permitidos';

  const direccion = normalizarTexto(formData.direccion_escrita);
  if (!direccion)
    errores.direccion_escrita = 'La dirección escrita es obligatoria';
  else if (direccion.length < 5)
    errores.direccion_escrita = 'La dirección debe tener al menos 5 caracteres';
  else if (direccion.length > 120)
    errores.direccion_escrita = 'La dirección no puede superar los 120 caracteres';
  else if (!caracteresPermitidos(direccion))
    errores.direccion_escrita = 'La dirección contiene caracteres no permitidos';

  const referencia = normalizarTexto(formData.ubicacion?.referencia);
  if (referencia) {
    if (referencia.length > 150)
      errores.referencia = 'La referencia no puede superar los 150 caracteres';
    else if (!caracteresPermitidos(referencia))
      errores.referencia = 'La referencia contiene caracteres no permitidos';
  }

  if (
    !formData.ubicacion ||
    typeof formData.ubicacion.lat !== 'number' ||
    typeof formData.ubicacion.lng !== 'number'
  ) {
    errores.ubicacion = 'Debes seleccionar una ubicación en el mapa';
  }

  return errores;
};

// 🔥 FUZZY SEARCH - Distancia Levenshtein
const calcularDistanciaLevenshtein = (a, b) => {
  const matriz = [];
  for (let i = 0; i <= b.length; i++) {
    matriz[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matriz[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriz[i][j] = matriz[i - 1][j - 1];
      } else {
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        );
      }
    }
  }
  return matriz[b.length][a.length];
};

// 🔥 Buscar categorías similares
const buscarSimilares = (busqueda, categorias, limite = 50) => {
  if (!busqueda || busqueda.length < 2) return categorias;
  
  const busquedaLower = busqueda.toLowerCase();
  
  const resultados = categorias
    .map(cat => {
      const nombreLower = cat.nombre.toLowerCase();
      const distancia = calcularDistanciaLevenshtein(busquedaLower, nombreLower);
      const porcentajeSimilitud = 1 - distancia / Math.max(busquedaLower.length, nombreLower.length);
      
      return {
        ...cat,
        distancia,
        similitud: porcentajeSimilitud,
        coincideExacto: nombreLower.includes(busquedaLower),
        empiezaCon: nombreLower.startsWith(busquedaLower)
      };
    })
    .filter(cat => cat.similitud > 0.4 || cat.coincideExacto)
    .sort((a, b) => {
      if (a.coincideExacto && !b.coincideExacto) return -1;
      if (!a.coincideExacto && b.coincideExacto) return 1;
      if (a.empiezaCon && !b.empiezaCon) return -1;
      if (!a.empiezaCon && b.empiezaCon) return 1;
      return b.similitud - a.similitud;
    })
    .slice(0, limite);
  
  return resultados;
};

// 🆕 Modal para ver todas las categorías CON FUZZY SEARCH (SIN AGRUPACIONES)
// 🆕 Modal para ver todas las categorías POR GRUPO CON FUZZY SEARCH
const ModalCategorias = ({ categorias, categoriaSeleccionada, onSeleccionar, onCerrar }) => {
  const [busquedaModal, setBusquedaModal] = useState('');
  const [grupoExpandido, setGrupoExpandido] = useState(null);

  // Agrupar categorías
  const categoriasPorGrupo = useMemo(() => {
    const grupos = {};
    categorias.forEach(cat => {
      const grupo = cat.grupo || 'Sin grupo';
      if (!grupos[grupo]) grupos[grupo] = [];
      grupos[grupo].push(cat);
    });
    return grupos;
  }, [categorias]);

  // Filtrar con fuzzy search
  const resultadosBusqueda = useMemo(() => {
    if (!busquedaModal || busquedaModal.length < 2) return null;
    return buscarSimilares(busquedaModal, categorias, 20);
  }, [busquedaModal, categorias]);

  const handleSeleccionar = (cat) => {
    onSeleccionar(cat);
    onCerrar();
  };

  const toggleGrupo = (grupo) => {
    setGrupoExpandido(prev => prev === grupo ? null : grupo);
  };

  return (
    <div className="modal-categorias-overlay" onClick={onCerrar}>
      <div className="modal-categorias-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-categorias-header">
          <h3>Seleccionar categoría</h3>
          <button className="modal-categorias-close" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-categorias-busqueda">
          <input
            type="text"
            value={busquedaModal}
            onChange={(e) => setBusquedaModal(e.target.value)}
            placeholder="🔍 Buscar categoría... (Ej: remis, comida, plomero)"
            autoFocus
          />
        </div>

        <div className="modal-categorias-lista">
          {resultadosBusqueda ? (
            // MOSTRAR RESULTADOS DE BÚSQUEDA
            resultadosBusqueda.length > 0 ? (
              <div>
                <p className="modal-resultados-info">
                  {resultadosBusqueda.length} {resultadosBusqueda.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </p>
                {resultadosBusqueda.map((cat) => (
                  <button
                    key={cat.id}
                    className={`modal-categoria-item ${categoriaSeleccionada === cat.id ? 'selected' : ''}`}
                    onClick={() => handleSeleccionar(cat)}
                  >
                    <span className="modal-categoria-nombre">
                      {cat.nombre}
                      {cat.grupo && (
                        <span className="modal-categoria-grupo-badge">{cat.grupo}</span>
                      )}
                    </span>
                    {categoriaSeleccionada === cat.id && <span className="modal-categoria-check">✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="modal-sin-resultados">
                <p>❌ No se encontró "{busquedaModal}"</p>
                <p className="modal-sugerencia-texto">Intenta con otra palabra o navega por grupos</p>
              </div>
            )
          ) : (
            // MOSTRAR GRUPOS COLAPSABLES
            Object.entries(categoriasPorGrupo)
              .sort(([a], [b]) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
              .map(([grupo, cats]) => (
                <div key={grupo} className="modal-grupo-contenedor">
                  <button
                    className="modal-grupo-header"
                    onClick={() => toggleGrupo(grupo)}
                  >
                    <span className="modal-grupo-titulo">
                      {grupo} <span className="modal-grupo-count">({cats.length})</span>
                    </span>
                    <span className={`modal-grupo-icono ${grupoExpandido === grupo ? 'expandido' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {grupoExpandido === grupo && (
                    <div className="modal-grupo-categorias">
                      {cats.map((cat) => (
                        <button
                          key={cat.id}
                          className={`modal-categoria-item ${categoriaSeleccionada === cat.id ? 'selected' : ''}`}
                          onClick={() => handleSeleccionar(cat)}
                        >
                          <span className="modal-categoria-nombre">{cat.nombre}</span>
                          {categoriaSeleccionada === cat.id && <span className="modal-categoria-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>

        <div className="modal-categorias-footer">
          <p className="modal-categorias-count">
            {categorias.length} categorías disponibles
          </p>
        </div>
      </div>
    </div>
  );
};

const Paso1InfoBasica = ({ formData, setFormData }) => {
  const [nombreLocal, setNombreLocal] = useState('');
  const [descripcionLocal, setDescripcionLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [referenciaLocal, setReferenciaLocal] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [coordenadasMostrar, setCoordenadasMostrar] = useState({ lat: null, lng: null });

  const LIMITE_ACCESO_RAPIDO = 6;

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

  useEffect(() => {
    if (formData?.categoria && categorias.length > 0) {
      const cat = categorias.find(c => c.id === formData.categoria);
      if (cat) {
        setBusqueda(cat.nombre);
      }
    }
  }, [formData?.categoria, categorias]);

  useEffect(() => {
    if (formData?.ubicacion) {
      setCoordenadasMostrar({
        lat: formData.ubicacion.lat || null,
        lng: formData.ubicacion.lng || null,
      });
      setReferenciaLocal(formData.ubicacion.referencia || '');
    }
  }, [formData?.ubicacion]);

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
          .eq('estado', 'activa')
          .order('nombre', { ascending: true });

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

  // 🔥 Categorías de acceso rápido con fuzzy search
  const categoriasAccesoRapido = useMemo(() => {
    if (!categorias || categorias.length === 0) return [];
    
    if (formData.categoria) {
      const catSeleccionada = categorias.find(c => c.id === formData.categoria);
      if (catSeleccionada) return [catSeleccionada];
    }

    if (busqueda) {
      return buscarSimilares(busqueda, categorias, LIMITE_ACCESO_RAPIDO);
    }

    return categorias.slice(0, LIMITE_ACCESO_RAPIDO);
  }, [categorias, busqueda, formData.categoria]);

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

  const abrirModalMapa = () => setModalAbierto(true);
  const cerrarModalMapa = () => setModalAbierto(false);
  const guardarUbicacion = (lat, lng) => {
    setFormData((prev) => ({ ...prev, ubicacion: { lat, lng, referencia: referenciaLocal } }));
    setCoordenadasMostrar({ lat, lng });
    setModalAbierto(false);
  };

  const mostrarCoordenada = (coord) =>
    typeof coord === 'number' ? coord.toFixed(6) : 'No definido';

  return (
    <div className="paso1-container">
      <h2 className="titulo-paso">Información básica</h2>

      <label>¿Cómo se llama tu negocio/emprendimiento o vos?</label>
      <input
        type="text"
        value={nombreLocal}
        onChange={handleNombreChange}
        placeholder="Ej: Delicias Jessi, Roberto Gómez"
        maxLength={50}
      />
      <div className="char-counter">{nombreLocal.length}/50</div>

      <label>¿Qué querés publicar? *</label>
<select value={tipoSeleccionado} onChange={handleTipoChange}>
  <option value="">Elegí una opción</option>
  <option value="servicio">Un servicio (plomero, electricista, delivery)</option>
  <option value="producto">Un producto (ropa, comida, artesanías)</option>
</select>

      <label>¿A qué te dedicás? *</label>
<div className="input-busqueda-wrapper">
  <input
    type="text"
    value={busqueda || ''}
    onChange={(e) => {
      const value = e.target.value.slice(0, 50);
      setBusqueda(value);
      if (!value) {
        setFormData(prev => ({ ...prev, categoria: '' }));
      }
    }}
    disabled={!tipoSeleccionado}
    placeholder="Escribí acá: remis, pizzas, plomero, ropa..."
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
        ) : categoriasAccesoRapido.length > 0 ? (
          <>
            {busqueda && !formData.categoria && (
              <p className="mg-sugerencias-titulo">💡 Sugerencias para "{busqueda}":</p>
            )}
            <div className="mg-categoria-grid">
              {categoriasAccesoRapido.map((cat) => (
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
            
            <button
              type="button"
              className="btn-ver-todas-categorias"
              onClick={() => setModalCategoriasAbierto(true)}
            >
              {busqueda ? '🔍 Buscar en todas las categorías' : `📂 Ver todas las categorías (${categorias.length})`}
            </button>
          </>
        ) : tipoSeleccionado && busqueda ? (
          <div className="sin-resultados-container">
            <p className="sin-resultados">❌ No se encontró "{busqueda}"</p>
            <button
              type="button"
              className="btn-ver-todas-categorias"
              onClick={() => setModalCategoriasAbierto(true)}
            >
              📂 Ver todas las categorías ({categorias.length})
            </button>
          </div>
        ) : tipoSeleccionado ? (
          <p className="sin-resultados">No se encontraron categorías</p>
        ) : null}
      </div>

      <label>Contanos qué hacés/vendés u ofrecés *</label>
<textarea
  value={descripcionLocal}
  onChange={handleDescripcionChange}
  rows={3}
  placeholder="Ej: Vendo pizzas caseras. Delivery los fines de semana. Acepto pedidos con 1 día de anticipación"
  maxLength={300}
/>
      <div className="char-counter">{descripcionLocal.length}/300</div>

      <label>¿Dónde estás? (dirección completa) *</label>
<input
  type="text"
  value={direccionLocal}
  onChange={handleDireccionChange}
  placeholder="Ej: Barrio Centro, calle San Martín 456"
  maxLength={120}
/>
      <div className="char-counter">{direccionLocal.length}/120</div>

      <label>¿Hay algo cerca? (opcional)</label>
<textarea
  value={referenciaLocal}
  onChange={handleReferenciaChange}
  rows={3}
  maxLength={150}
  placeholder="Ej: Casa amarilla al lado del kiosco, frente a la plaza"
/>
      <div className="char-counter">{referenciaLocal.length}/150</div>

      <button type="button" className="btn-abrir-mapa" onClick={abrirModalMapa}>
  📍 Tocar acá para marcar en el mapa
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

      {modalCategoriasAbierto && (
        <ModalCategorias
          categorias={categorias}
          categoriaSeleccionada={formData.categoria}
          onSeleccionar={handleCategoriaClick}
          onCerrar={() => setModalCategoriasAbierto(false)}
        />
      )}
    </div>
  );
};

export default Paso1InfoBasica;