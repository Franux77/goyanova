import React, { useState, useEffect, useMemo } from 'react';
import ModalMapa from './ModalMapa';
import { supabase } from '../../utils/supabaseClient';
import './Paso1InfoBasica.css';
import {
  prepararCategorias,
  sugerirCategorias,
  buscarCategorias,
  puntajeCategoria,
} from './utils/categoriasSugeridas';
import { ICONOS_GRUPO } from '../../utils/iconosGrupos';

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


const NOMBRE_TIPO = { servicio: 'Oficios', producto: 'Negocios' };

/* Modal "Ver todas las categorías": pestañas Oficios / Negocios, buscador que
   entiende palabras comunes y grupos que se abren con sus categorías. */
const ModalCategorias = ({ categorias, preparadas, tipoInicial, categoriaSeleccionada, onSeleccionar, onCerrar }) => {
  const [tipoVista, setTipoVista] = useState(tipoInicial || 'servicio');
  const [busquedaModal, setBusquedaModal] = useState('');
  const [grupoAbierto, setGrupoAbierto] = useState(() => {
    const actual = categorias.find((c) => c.id === categoriaSeleccionada);
    return actual?.grupo || null;
  });

  // Bloquear el scroll de la página y cerrar con Escape
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar]);

  const grupos = useMemo(() => {
    const porGrupo = {};
    categorias
      .filter((c) => c.tipo === tipoVista)
      .forEach((cat) => {
        const g = cat.grupo || 'Otros';
        if (!porGrupo[g]) porGrupo[g] = [];
        porGrupo[g].push(cat);
      });
    return Object.entries(porGrupo).sort(([a], [b]) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [categorias, tipoVista]);

  const resultados = useMemo(
    () => (busquedaModal.trim().length >= 2 ? buscarCategorias(busquedaModal, preparadas, 30) : null),
    [busquedaModal, preparadas]
  );

  const totalTipo = (t) => categorias.filter((c) => c.tipo === t).length;

  const elegir = (cat) => {
    onSeleccionar(cat);
    onCerrar();
  };

  return (
    <div className="psf-mcat-fondo" onClick={onCerrar}>
      <div
        className="psf-mcat"
        role="dialog"
        aria-modal="true"
        aria-labelledby="psf-mcat-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="psf-mcat-cabecera">
          <div className="psf-mcat-titulos">
            <h3 id="psf-mcat-titulo">Todas las categorías</h3>
            <p>Elegí la que mejor describe lo principal que hacés</p>
          </div>
          <button type="button" className="psf-mcat-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="psf-mcat-herramientas">
          <div className="psf-buscador">
            <span className="material-icons">search</span>
            <input
              type="text"
              value={busquedaModal}
              onChange={(e) => setBusquedaModal(e.target.value.slice(0, 50))}
              placeholder="Buscá: plomero, tortas, uñas, flete…"
              autoComplete="off"
              aria-label="Buscar categoría"
            />
            {busquedaModal && (
              <button type="button" className="psf-buscador-limpiar" onClick={() => setBusquedaModal('')} aria-label="Borrar búsqueda">
                <span className="material-icons">close</span>
              </button>
            )}
          </div>

          {!resultados && (
            <div className="psf-mcat-pestanas" role="tablist">
              {['servicio', 'producto'].map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tipoVista === t}
                  className={tipoVista === t ? 'activa' : ''}
                  onClick={() => {
                    setTipoVista(t);
                    setGrupoAbierto(null);
                  }}
                >
                  <span className="material-icons">{t === 'servicio' ? 'handyman' : 'storefront'}</span>
                  {NOMBRE_TIPO[t]}
                  <small>{totalTipo(t)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="psf-mcat-lista">
          {resultados ? (
            resultados.length > 0 ? (
              <>
                <p className="psf-mcat-info">
                  {resultados.length === 1 ? '1 categoría encontrada' : `${resultados.length} categorías encontradas`}
                </p>
                <ul className="psf-mcat-resultados">
                  {resultados.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        className={cat.id === categoriaSeleccionada ? 'elegida' : ''}
                        onClick={() => elegir(cat)}
                      >
                        <span className="material-icons psf-mcat-res-icono">
                          {ICONOS_GRUPO[cat.grupo] || 'sell'}
                        </span>
                        <span className="psf-mcat-res-textos">
                          <strong>{cat.nombre}</strong>
                          <small>{NOMBRE_TIPO[cat.tipo]}{cat.grupo ? ` · ${cat.grupo}` : ''}</small>
                        </span>
                        {cat.id === categoriaSeleccionada && <span className="material-icons psf-mcat-check">check_circle</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="psf-mcat-vacio">
                <span className="material-icons">search_off</span>
                <p>No encontramos "{busquedaModal}"</p>
                <small>Probá con otra palabra, o borrá la búsqueda y mirá por grupos.</small>
              </div>
            )
          ) : (
            grupos.map(([grupo, cats]) => {
              const abierto = grupoAbierto === grupo;
              const tieneElegida = cats.some((c) => c.id === categoriaSeleccionada);
              return (
                <div key={grupo} className={`psf-mcat-grupo ${abierto ? 'abierto' : ''}`}>
                  <button
                    type="button"
                    className="psf-mcat-grupo-cabecera"
                    aria-expanded={abierto}
                    onClick={() => setGrupoAbierto(abierto ? null : grupo)}
                  >
                    <span className="material-icons psf-mcat-grupo-icono">{ICONOS_GRUPO[grupo] || 'sell'}</span>
                    <span className="psf-mcat-grupo-nombre">
                      {grupo}
                      {tieneElegida && <span className="psf-mcat-punto" aria-label="Tu categoría está acá" />}
                    </span>
                    <span className="psf-mcat-grupo-cantidad">{cats.length}</span>
                    <span className="material-icons psf-mcat-flecha" aria-hidden="true">expand_more</span>
                  </button>
                  {abierto && (
                    <div className="psf-mcat-chips">
                      {cats.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`psf-mcat-chip ${cat.id === categoriaSeleccionada ? 'elegida' : ''}`}
                          onClick={() => elegir(cat)}
                        >
                          {cat.id === categoriaSeleccionada && <span className="material-icons">check</span>}
                          {cat.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="psf-mcat-pie">
          <span className="material-icons">lightbulb</span>
          ¿Hacés varias cosas? Elegí la principal y contá el resto en la descripción.
        </footer>
      </div>
    </div>
  );
};

// Cómo se llama cada tipo para la gente (igual que en el Home: Oficios / Negocios)
const TIPOS = {
  servicio: {
    titulo: 'Un oficio o servicio',
    corto: 'Oficios',
    icono: 'handyman',
    ejemplos: 'Lo hacés vos: arreglos, clases, belleza, salud, fletes, eventos…',
  },
  producto: {
    titulo: 'Un negocio o productos',
    corto: 'Negocios',
    icono: 'storefront',
    ejemplos: 'Vendés cosas: comida, ropa, una tienda, artesanías, plantas…',
  },
};

const Contador = ({ actual, max }) => (
  <span className={`psf-contador ${actual > max * 0.9 ? 'casi' : ''}`}>{actual}/{max}</span>
);

const ErrorCampo = ({ mensaje }) =>
  mensaje ? (
    <p className="psf-error" role="alert">
      <span className="material-icons">error_outline</span>
      {mensaje}
    </p>
  ) : null;

const Paso1InfoBasica = ({ formData, setFormData, errores = {}, parte = 'todo' }) => {
  const [todasCategorias, setTodasCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false);
  const [avisoCambioTipo, setAvisoCambioTipo] = useState('');

  const tipo = formData?.tipo || '';
  const mostrarInfo = parte !== 'ubicacion';
  const mostrarUbicacion = parte !== 'info';

  // Todas las categorías activas de una sola vez (de los dos tipos), así el
  // buscador encuentra la categoría aunque la persona haya elegido mal el tipo.
  useEffect(() => {
    if (!mostrarInfo) return undefined;
    let activo = true;
    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('categorias')
          .select('id, nombre, tipo, grupo')
          .eq('estado', 'activa')
          .order('nombre', { ascending: true });
        if (error) throw error;
        if (activo) setTodasCategorias(data || []);
      } catch {
        if (activo) setTodasCategorias([]);
      } finally {
        if (activo) setLoadingCategorias(false);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [mostrarInfo]);

  const preparadas = useMemo(() => prepararCategorias(todasCategorias), [todasCategorias]);
  const categoriasDelTipo = useMemo(
    () => todasCategorias.filter((c) => c.tipo === tipo),
    [todasCategorias, tipo]
  );
  const seleccionada = useMemo(
    () => todasCategorias.find((c) => c.id === formData?.categoria) || null,
    [todasCategorias, formData?.categoria]
  );

  // Si se editó un servicio viejo, completar el nombre de la categoría
  useEffect(() => {
    if (seleccionada && formData.categoriaNombre !== seleccionada.nombre) {
      setFormData((prev) => ({ ...prev, categoriaNombre: seleccionada.nombre }));
    }
  }, [seleccionada, formData.categoriaNombre, setFormData]);

  const textoBase = `${formData?.nombre || ''} ${formData?.descripcion || ''}`;
  const sugerencias = useMemo(
    () => sugerirCategorias(textoBase, preparadas, { limite: 4, tipoPreferido: tipo }),
    [textoBase, preparadas, tipo]
  );
  const resultadosBusqueda = useMemo(
    () => buscarCategorias(busqueda, preparadas, 10),
    [busqueda, preparadas]
  );

  // ¿La categoría elegida no tiene nada que ver con lo que escribió?
  const sugerenciaMejor = useMemo(() => {
    if (!seleccionada || textoBase.trim().length < 15) return null;
    const mejor = sugerencias[0];
    if (!mejor || mejor.cat.id === seleccionada.id || mejor.puntos < 4) return null;
    const prep = preparadas.find((p) => p.cat.id === seleccionada.id);
    return puntajeCategoria(textoBase, prep) < 2 ? mejor.cat : null;
  }, [seleccionada, sugerencias, preparadas, textoBase]);

  // ------------------ cambios ------------------
  const cambiarCampo = (campo, max) => (e) => {
    const value = e.target.value;
    if (value.length <= max) setFormData((prev) => ({ ...prev, [campo]: value }));
  };

  const elegirTipo = (nuevo) => {
    setAvisoCambioTipo('');
    setFormData((prev) => {
      const sigue = seleccionada && seleccionada.tipo === nuevo;
      return {
        ...prev,
        tipo: nuevo,
        categoria: sigue ? prev.categoria : '',
        categoriaNombre: sigue ? prev.categoriaNombre : '',
      };
    });
  };

  const elegirCategoria = (cat) => {
    if (tipo && cat.tipo !== tipo) {
      setAvisoCambioTipo(`Cambiamos a "${TIPOS[cat.tipo]?.titulo}" porque ahí está la categoría ${cat.nombre}.`);
    } else {
      setAvisoCambioTipo('');
    }
    setFormData((prev) => ({
      ...prev,
      tipo: cat.tipo,
      categoria: cat.id,
      categoriaNombre: cat.nombre || '',
    }));
    setBusqueda('');
  };

  const quitarCategoria = () => {
    setAvisoCambioTipo('');
    setFormData((prev) => ({ ...prev, categoria: '', categoriaNombre: '' }));
  };

  const cambiarReferencia = (e) => {
    const value = e.target.value;
    if (value.length <= 150) {
      setFormData((prev) => ({
        ...prev,
        ubicacion: { ...(prev?.ubicacion || {}), referencia: value },
      }));
    }
  };

  const guardarUbicacion = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      ubicacion: { lat, lng, referencia: prev?.ubicacion?.referencia || '' },
    }));
    setModalAbierto(false);
  };

  const lat = formData?.ubicacion?.lat ?? formData?.latitud ?? null;
  const lng = formData?.ubicacion?.lng ?? formData?.longitud ?? null;
  const ubicacionLista = typeof lat === 'number' && typeof lng === 'number';

  const nombre = formData?.nombre || '';
  const descripcion = formData?.descripcion || '';
  const direccion = formData?.direccion_escrita || '';
  const referencia = formData?.ubicacion?.referencia || '';

  const etiquetaCat = (cat) => `${TIPOS[cat.tipo]?.corto || ''}${cat.grupo ? ` · ${cat.grupo}` : ''}`;

  return (
    <div className="paso1-container psf-paso">
      {mostrarInfo && (
        <>
          {/* 1. Tipo */}
          <div className="psf-campo">
            <span className="psf-label" id="psf-tipo-label">
              ¿Qué vas a publicar?
            </span>
            <div className="psf-tipos" role="radiogroup" aria-labelledby="psf-tipo-label">
              {Object.entries(TIPOS).map(([valor, t]) => (
                <button
                  key={valor}
                  type="button"
                  name="tipo"
                  role="radio"
                  aria-checked={tipo === valor}
                  className={`psf-tipo ${tipo === valor ? 'activo' : ''}`}
                  onClick={() => elegirTipo(valor)}
                >
                  <span className="material-icons psf-tipo-icono">{t.icono}</span>
                  <span className="psf-tipo-textos">
                    <strong>{t.titulo}</strong>
                    <span>{t.ejemplos}</span>
                  </span>
                  <span className="material-icons psf-tipo-check" aria-hidden="true">
                    {tipo === valor ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>
              ))}
            </div>
            <ErrorCampo mensaje={errores.tipo} />
          </div>

          {/* 2. Nombre */}
          <div className="psf-campo">
            <label className="psf-label" htmlFor="psf-nombre">
              ¿Cómo se llama tu negocio o cómo te conocen?
            </label>
            <input
              id="psf-nombre"
              name="nombre"
              type="text"
              value={nombre}
              onChange={cambiarCampo('nombre', 50)}
              placeholder="Ej: Delicias Jessi, Roberto Gómez Electricista"
              maxLength={50}
              autoComplete="organization"
              className={errores.nombre ? 'input-error' : ''}
            />
            <div className="psf-pie-campo">
              <ErrorCampo mensaje={errores.nombre} />
              <Contador actual={nombre.length} max={50} />
            </div>
          </div>

          {/* 3. Descripción */}
          <div className="psf-campo">
            <label className="psf-label" htmlFor="psf-descripcion">
              Contá qué hacés o qué vendés
            </label>
            <p className="psf-ayuda">Con tus palabras. Esto también nos ayuda a sugerirte la categoría.</p>
            <textarea
              id="psf-descripcion"
              name="descripcion"
              value={descripcion}
              onChange={cambiarCampo('descripcion', 300)}
              rows={4}
              placeholder="Ej: Hago tortas y alfajores caseros por pedido. Entrego los fines de semana."
              maxLength={300}
              className={errores.descripcion ? 'input-error' : ''}
            />
            <div className="psf-pie-campo">
              <ErrorCampo mensaje={errores.descripcion} />
              <Contador actual={descripcion.length} max={300} />
            </div>
          </div>

          {/* 4. Categoría */}
          <div className="psf-campo" data-campo="categoria">
            <span className="psf-label">
              Categoría
            </span>
            <p className="psf-ayuda">
              Es donde te van a buscar. Elegí <strong>lo principal</strong> que hacés; si además ofrecés
              otra cosa, contalo en la descripción.
            </p>

            {seleccionada ? (
              <div className="psf-cat-elegida">
                <span className="material-icons psf-cat-elegida-icono">check_circle</span>
                <div className="psf-cat-elegida-textos">
                  <span>Vas a aparecer en</span>
                  <strong>{seleccionada.nombre}</strong>
                  <small>{etiquetaCat(seleccionada)}</small>
                </div>
                <button type="button" className="psf-boton-secundario" onClick={quitarCategoria}>
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                {/* Sugerencias según lo que escribió */}
                {sugerencias.length > 0 && (
                  <div className="psf-cat-sugeridas">
                    <p className="psf-cat-sugeridas-titulo">
                      <span className="material-icons">auto_awesome</span>
                      Por lo que escribiste, puede ser:
                    </p>
                    <div className="psf-chips">
                      {sugerencias.map(({ cat }) => (
                        <button key={cat.id} type="button" className="psf-chip-cat" onClick={() => elegirCategoria(cat)}>
                          <strong>{cat.nombre}</strong>
                          <small>{etiquetaCat(cat)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buscador en todas las categorías */}
                <div className="psf-buscador">
                  <span className="material-icons">search</span>
                  <input
                    type="text"
                    name="categoria"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value.slice(0, 50))}
                    placeholder="Buscá tu rubro: plomero, tortas, ropa, uñas…"
                    autoComplete="off"
                    aria-label="Buscar categoría"
                  />
                  {busqueda && (
                    <button type="button" className="psf-buscador-limpiar" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">
                      <span className="material-icons">close</span>
                    </button>
                  )}
                </div>

                {loadingCategorias ? (
                  <p className="psf-ayuda psf-cargando">Cargando categorías…</p>
                ) : busqueda.trim().length >= 2 ? (
                  resultadosBusqueda.length > 0 ? (
                    <ul className="psf-resultados">
                      {resultadosBusqueda.map((cat) => (
                        <li key={cat.id}>
                          <button type="button" onClick={() => elegirCategoria(cat)}>
                            <span>{cat.nombre}</span>
                            <small>{etiquetaCat(cat)}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="psf-sin-resultados">
                      No encontramos "{busqueda}". Probá con otra palabra o mirá la lista completa.
                    </p>
                  )
                ) : null}

                <button
                  type="button"
                  className="psf-link-boton"
                  onClick={() => setModalCategoriasAbierto(true)}
                >
                  <span className="material-icons">list</span>
                  {tipo
                    ? `Ver todas las categorías de ${TIPOS[tipo].corto} (${categoriasDelTipo.length})`
                    : `Ver todas las categorías (${todasCategorias.length})`}
                </button>
              </>
            )}

            {avisoCambioTipo && (
              <p className="psf-nota">
                <span className="material-icons">info</span>
                {avisoCambioTipo}
              </p>
            )}

            {sugerenciaMejor && (
              <div className="psf-alerta">
                <span className="material-icons">help_outline</span>
                <div>
                  <p>
                    Por lo que contaste, tu publicación parece más de <strong>{sugerenciaMejor.nombre}</strong>.
                    Si elegís bien la categoría, te encuentra la gente que te busca.
                  </p>
                  <button type="button" className="psf-boton-primario-chico" onClick={() => elegirCategoria(sugerenciaMejor)}>
                    Cambiar a {sugerenciaMejor.nombre}
                  </button>
                </div>
              </div>
            )}

            <ErrorCampo mensaje={errores.categoria} />
          </div>
        </>
      )}

      {mostrarUbicacion && (
        <>
          <div className="psf-campo">
            <label className="psf-label" htmlFor="psf-direccion">
              Dirección
            </label>
            <input
              id="psf-direccion"
              name="direccion_escrita"
              type="text"
              value={direccion}
              onChange={cambiarCampo('direccion_escrita', 120)}
              placeholder="Ej: San Martín 456, Barrio Centro"
              maxLength={120}
              autoComplete="street-address"
              className={errores.direccion_escrita ? 'input-error' : ''}
            />
            <div className="psf-pie-campo">
              <ErrorCampo mensaje={errores.direccion_escrita} />
              <Contador actual={direccion.length} max={120} />
            </div>
          </div>

          <div className="psf-campo">
            <span className="psf-label">
              Marcá el lugar en el mapa
            </span>
            <button
              type="button"
              name="ubicacion"
              className={`btn-abrir-mapa psf-boton-mapa ${ubicacionLista ? 'btn-abrir-mapa-listo' : ''}`}
              onClick={() => setModalAbierto(true)}
            >
              <span className="btn-abrir-mapa-icono">
                <span className="material-icons">{ubicacionLista ? 'check_circle' : 'place'}</span>
              </span>
              <span className="btn-abrir-mapa-textos">
                <span className="btn-abrir-mapa-titulo">
                  {ubicacionLista ? 'Ubicación marcada' : 'Marcar mi ubicación en el mapa'}
                </span>
                <span className="btn-abrir-mapa-sub">
                  {ubicacionLista
                    ? 'Tocá si la querés mover'
                    : 'Así aparecés en el mapa de GoyaNova y te encuentran más fácil'}
                </span>
              </span>
              <span className="material-icons psf-boton-mapa-flecha" aria-hidden="true">chevron_right</span>
            </button>
            <ErrorCampo mensaje={errores.ubicacion} />
          </div>

          <div className="psf-campo">
            <label className="psf-label" htmlFor="psf-referencia">
              ¿Algo que ayude a encontrarte? <span className="psf-opcional">Opcional</span>
            </label>
            <textarea
              id="psf-referencia"
              name="referencia"
              value={referencia}
              onChange={cambiarReferencia}
              rows={2}
              maxLength={150}
              placeholder="Ej: Casa amarilla al lado del kiosco, frente a la plaza"
            />
            <div className="psf-pie-campo">
              <ErrorCampo mensaje={errores.referencia} />
              <Contador actual={referencia.length} max={150} />
            </div>
          </div>

          {modalAbierto && (
            <ModalMapa
              onGuardar={guardarUbicacion}
              onCerrar={() => setModalAbierto(false)}
              ubicacion={formData.ubicacion}
            />
          )}
        </>
      )}

      {modalCategoriasAbierto && (
        <ModalCategorias
          categorias={todasCategorias}
          preparadas={preparadas}
          tipoInicial={tipo}
          categoriaSeleccionada={formData.categoria}
          onSeleccionar={elegirCategoria}
          onCerrar={() => setModalCategoriasAbierto(false)}
        />
      )}
    </div>
  );
};

export default Paso1InfoBasica;
