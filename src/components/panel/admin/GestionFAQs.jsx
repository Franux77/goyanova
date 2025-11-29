import React, { useState, useEffect } from 'react';
import { supabase, selectWithRetry, insertWithRetry, updateWithRetry, deleteWithRetry } from '../../../utils/supabaseClient';
import './GestionFAQs.css';
import Loading from '../../loading/Loading';

const GestionFAQs = () => {
  const [categorias, setCategorias] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const [formFAQ, setFormFAQ] = useState({
    categoria_id: '',
    pregunta: '',
    respuesta: '',
    orden: 0,
    activo: true
  });

  const [formCategoria, setFormCategoria] = useState({
    nombre: '',
    icono: '📋',
    descripcion: '',
    orden: 0,
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    console.log('🔵 [FAQs] Iniciando carga de datos...');
    try {
      setCargando(true);

      // 🆕 Cargar categorías con retry
      console.log('🔵 [FAQs] Cargando categorías...');
      const resultCats = await selectWithRetry(
        supabase
          .from('categorias_faqs')
          .select('*')
          .order('orden', { ascending: true })
      );

      console.log('🔵 [FAQs] Resultado categorías:', resultCats);

      if (resultCats.error) {
        console.error('❌ [FAQs] Error al cargar categorías:', resultCats.error);
        setCategorias([]);
      } else {
        console.log('✅ [FAQs] Categorías cargadas:', resultCats.data?.length || 0);
        setCategorias(resultCats.data || []);
      }

      // 🆕 Cargar FAQs con retry
      console.log('🔵 [FAQs] Cargando FAQs...');
      const resultFaqs = await selectWithRetry(
        supabase
          .from('faqs')
          .select(`
            *,
            categorias_faqs (
              nombre,
              icono
            )
          `)
          .order('orden', { ascending: true })
      );

      console.log('🔵 [FAQs] Resultado FAQs:', resultFaqs);

      if (resultFaqs.error) {
        console.error('❌ [FAQs] Error al cargar FAQs:', resultFaqs.error);
        setFaqs([]);
      } else {
        console.log('✅ [FAQs] FAQs cargadas:', resultFaqs.data?.length || 0);
        setFaqs(resultFaqs.data || []);
      }

    } catch (error) {
      console.error('❌ [FAQs] Error crítico al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      console.log('🔵 [FAQs] Finalizando carga, setCargando(false)');
      setCargando(false);
    }
  };

  const handleChangeFAQ = (e) => {
    const { name, value, type, checked } = e.target;
    setFormFAQ({
      ...formFAQ,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleChangeCategoria = (e) => {
    const { name, value, type, checked } = e.target;
    setFormCategoria({
      ...formCategoria,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const abrirModalFAQ = (faq = null) => {
    if (faq) {
      setEditando(faq.id);
      setFormFAQ({
        categoria_id: faq.categoria_id,
        pregunta: faq.pregunta,
        respuesta: faq.respuesta,
        orden: faq.orden,
        activo: faq.activo
      });
    } else {
      setEditando(null);
      setFormFAQ({
        categoria_id: '',
        pregunta: '',
        respuesta: '',
        orden: 0,
        activo: true
      });
    }
    setModalAbierto(true);
  };

  const abrirModalCategoria = (categoria = null) => {
    if (categoria) {
      setEditandoCategoria(categoria.id);
      setFormCategoria({
        nombre: categoria.nombre,
        icono: categoria.icono,
        descripcion: categoria.descripcion || '',
        orden: categoria.orden,
        activo: categoria.activo
      });
    } else {
      setEditandoCategoria(null);
      setFormCategoria({
        nombre: '',
        icono: '📋',
        descripcion: '',
        orden: 0,
        activo: true
      });
    }
    setModalCategoria(true);
  };

  const guardarFAQ = async (e) => {
    e.preventDefault();

    try {
      if (editando) {
        // 🆕 Actualizar con retry
        const { error } = await updateWithRetry(
          supabase
            .from('faqs')
            .update(formFAQ)
            .eq('id', editando)
        );

        if (error) throw error;
        alert('FAQ actualizada');
      } else {
        // 🆕 Crear con retry
        const { error } = await insertWithRetry(
          supabase
            .from('faqs')
            .insert([formFAQ])
        );

        if (error) throw error;
        alert('FAQ creada');
      }

      setModalAbierto(false);
      await cargarDatos();

    } catch (error) {
      console.error('Error al guardar FAQ:', error);
      alert('Error al guardar FAQ');
    }
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();

    try {
      if (editandoCategoria) {
        // 🆕 Actualizar con retry
        const { error } = await updateWithRetry(
          supabase
            .from('categorias_faqs')
            .update(formCategoria)
            .eq('id', editandoCategoria)
        );

        if (error) throw error;
        alert('Categoría actualizada');
      } else {
        // 🆕 Crear con retry
        const { error } = await insertWithRetry(
          supabase
            .from('categorias_faqs')
            .insert([formCategoria])
        );

        if (error) throw error;
        alert('Categoría creada');
      }

      setModalCategoria(false);
      await cargarDatos();

    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert('Error al guardar categoría');
    }
  };

  const eliminarFAQ = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta FAQ?')) return;

    try {
      // 🆕 Eliminar con retry
      const { error } = await deleteWithRetry(
        supabase
          .from('faqs')
          .delete()
          .eq('id', id)
      );

      if (error) throw error;

      alert('FAQ eliminada');
      await cargarDatos();

    } catch (error) {
      console.error('Error al eliminar FAQ:', error);
      alert('Error al eliminar FAQ');
    }
  };

  const eliminarCategoria = async (id) => {
    const faqsConCategoria = faqs.filter(f => f.categoria_id === id);
    if (faqsConCategoria.length > 0) {
      alert(`No se puede eliminar. Hay ${faqsConCategoria.length} FAQs en esta categoría.`);
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      // 🆕 Eliminar con retry
      const { error } = await deleteWithRetry(
        supabase
          .from('categorias_faqs')
          .delete()
          .eq('id', id)
      );

      if (error) throw error;

      alert('Categoría eliminada');
      await cargarDatos();

    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('Error al eliminar categoría');
    }
  };

  const toggleActivoFAQ = async (id, activo) => {
    try {
      // 🆕 Update con retry
      const { error } = await updateWithRetry(
        supabase
          .from('faqs')
          .update({ activo: !activo })
          .eq('id', id)
      );

      if (error) throw error;
      await cargarDatos();

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  const toggleActivoCategoria = async (id, activo) => {
    try {
      // 🆕 Update con retry
      const { error } = await updateWithRetry(
        supabase
          .from('categorias_faqs')
          .update({ activo: !activo })
          .eq('id', id)
      );

      if (error) throw error;
      await cargarDatos();

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  const faqsFiltradas = faqs.filter(faq => {
    const categoriaMatch = categoriaFiltro === 'todas' || faq.categoria_id === parseInt(categoriaFiltro);
    const busquedaMatch = !busqueda || 
      faq.pregunta.toLowerCase().includes(busqueda.toLowerCase()) ||
      faq.respuesta.toLowerCase().includes(busqueda.toLowerCase());
    
    return categoriaMatch && busquedaMatch;
  });

  const iconosDisponibles = ['📋', '📝', '🔒', '💳', '🔧', '❓', '💡', '🎯', '📌', '⚙️', '🛠️', '📊'];

if (cargando) {
  return <Loading message="Cargando..." />;
}

  return (
    <div className="gfaqs-container">
      <div className="gfaqs-header">
        <div className="gfaqs-titulo-section">
          <span className="material-icons gfaqs-header-icon">quiz</span>
          <div>
            <h1 className="gfaqs-titulo">Gestión de FAQs</h1>
            <p className="gfaqs-subtitulo">Administra las preguntas frecuentes del sistema</p>
          </div>
        </div>
        <div className="gfaqs-header-actions">
          <button onClick={() => abrirModalCategoria()} className="gfaqs-btn-secondary">
            <span className="material-icons">create_new_folder</span>
            Nueva Categoría
          </button>
          <button onClick={() => abrirModalFAQ()} className="gfaqs-btn-primary">
            <span className="material-icons">add</span>
            Nueva FAQ
          </button>
        </div>
      </div>

      <div className="gfaqs-seccion">
        <h2 className="gfaqs-seccion-titulo">
          <span className="material-icons">folder</span>
          Categorías ({categorias.length})
        </h2>
        <div className="gfaqs-categorias-grid">
          {categorias.map(cat => (
            <div key={cat.id} className={`gfaqs-categoria-card ${!cat.activo ? 'gfaqs-inactivo' : ''}`}>
              <div className="gfaqs-categoria-header">
                <span className="gfaqs-categoria-icono">{cat.icono}</span>
                <div className="gfaqs-categoria-info">
                  <h3 className="gfaqs-categoria-nombre">{cat.nombre}</h3>
                  <p className="gfaqs-categoria-desc">{cat.descripcion}</p>
                </div>
              </div>
              <div className="gfaqs-categoria-stats">
                <span className="gfaqs-stat-badge">
                  {faqs.filter(f => f.categoria_id === cat.id).length} FAQs
                </span>
                <span className={`gfaqs-estado-badge ${cat.activo ? 'gfaqs-activo' : 'gfaqs-inactivo'}`}>
                  {cat.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="gfaqs-categoria-actions">
                <button 
                  onClick={() => toggleActivoCategoria(cat.id, cat.activo)}
                  className="gfaqs-btn-icon"
                  title={cat.activo ? 'Desactivar' : 'Activar'}
                >
                  <span className="material-icons">
                    {cat.activo ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button 
                  onClick={() => abrirModalCategoria(cat)}
                  className="gfaqs-btn-icon"
                  title="Editar"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button 
                  onClick={() => eliminarCategoria(cat.id)}
                  className="gfaqs-btn-icon gfaqs-btn-danger"
                  title="Eliminar"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gfaqs-seccion">
        <div className="gfaqs-faqs-header">
          <h2 className="gfaqs-seccion-titulo">
            <span className="material-icons">help</span>
            FAQs ({faqsFiltradas.length})
          </h2>
          <div className="gfaqs-filtros">
            <div className="gfaqs-buscador-wrapper">
              <span className="material-icons gfaqs-buscador-icon">search</span>
              <input
                type="search"
                placeholder="Buscar FAQs..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="gfaqs-buscador"
              />
            </div>
            <select 
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="gfaqs-select"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="gfaqs-lista">
          {faqsFiltradas.length === 0 ? (
            <div className="gfaqs-empty">
              <span className="material-icons gfaqs-empty-icon">help_outline</span>
              <p>No hay FAQs que mostrar</p>
            </div>
          ) : (
            faqsFiltradas.map(faq => (
              <div key={faq.id} className={`gfaqs-faq-card ${!faq.activo ? 'gfaqs-inactivo' : ''}`}>
                <div className="gfaqs-faq-header">
                  <div className="gfaqs-faq-categoria-badge">
                    {faq.categorias_faqs?.icono} {faq.categorias_faqs?.nombre}
                  </div>
                  <div className="gfaqs-faq-actions">
                    <button
                      onClick={() => toggleActivoFAQ(faq.id, faq.activo)}
                      className="gfaqs-btn-icon"
                      title={faq.activo ? 'Desactivar' : 'Activar'}
                    >
                      <span className="material-icons">
                        {faq.activo ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      onClick={() => abrirModalFAQ(faq)}
                      className="gfaqs-btn-icon"
                      title="Editar"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      onClick={() => eliminarFAQ(faq.id)}
                      className="gfaqs-btn-icon gfaqs-btn-danger"
                      title="Eliminar"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
                <h3 className="gfaqs-faq-pregunta">{faq.pregunta}</h3>
                <p className="gfaqs-faq-respuesta">{faq.respuesta}</p>
                <div className="gfaqs-faq-footer">
                  <span className={`gfaqs-estado-badge ${faq.activo ? 'gfaqs-activo' : 'gfaqs-inactivo'}`}>
                    {faq.activo ? 'Activa' : 'Inactiva'}
                  </span>
                  <span className="gfaqs-vistas">
                    <span className="material-icons">visibility</span>
                    {faq.vistas || 0} vistas
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="gfaqs-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="gfaqs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gfaqs-modal-header">
              <h2 className="gfaqs-modal-titulo">
                {editando ? 'Editar FAQ' : 'Nueva FAQ'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="gfaqs-modal-close">
                <span className="material-icons">close</span>
              </button>
            </div>
            <form onSubmit={guardarFAQ} className="gfaqs-modal-form">
              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Categoría *</label>
                <select
                  name="categoria_id"
                  value={formFAQ.categoria_id}
                  onChange={handleChangeFAQ}
                  className="gfaqs-input"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.filter(c => c.activo).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Pregunta *</label>
                <input
                  type="text"
                  name="pregunta"
                  value={formFAQ.pregunta}
                  onChange={handleChangeFAQ}
                  className="gfaqs-input"
                  placeholder="¿Cómo...?"
                  required
                />
              </div>

              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Respuesta *</label>
                <textarea
                  name="respuesta"
                  value={formFAQ.respuesta}
                  onChange={handleChangeFAQ}
                  className="gfaqs-textarea"
                  placeholder="Escribe la respuesta detallada..."
                  rows={6}
                  required
                />
              </div>

              <div className="gfaqs-form-row">
                <div className="gfaqs-form-group">
                  <label className="gfaqs-label">Orden</label>
                  <input
                    type="number"
                    name="orden"
                    value={formFAQ.orden}
                    onChange={handleChangeFAQ}
                    className="gfaqs-input"
                    min="0"
                  />
                </div>

                <div className="gfaqs-form-group">
                  <label className="gfaqs-checkbox-label">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formFAQ.activo}
                      onChange={handleChangeFAQ}
                      className="gfaqs-checkbox"
                    />
                    <span>Activo</span>
                  </label>
                </div>
              </div>

              <div className="gfaqs-modal-actions">
                <button type="button" onClick={() => setModalAbierto(false)} className="gfaqs-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="gfaqs-btn-submit">
                  <span className="material-icons">save</span>
                  {editando ? 'Actualizar' : 'Crear'} FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCategoria && (
        <div className="gfaqs-modal-overlay" onClick={() => setModalCategoria(false)}>
          <div className="gfaqs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gfaqs-modal-header">
              <h2 className="gfaqs-modal-titulo">
                {editandoCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={() => setModalCategoria(false)} className="gfaqs-modal-close">
                <span className="material-icons">close</span>
              </button>
            </div>
            <form onSubmit={guardarCategoria} className="gfaqs-modal-form">
              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formCategoria.nombre}
                  onChange={handleChangeCategoria}
                  className="gfaqs-input"
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>

              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Icono *</label>
                <div className="gfaqs-iconos-grid">
                  {iconosDisponibles.map(icono => (
                    <button
                      key={icono}
                      type="button"
                      onClick={() => setFormCategoria({ ...formCategoria, icono })}
                      className={`gfaqs-icono-btn ${formCategoria.icono === icono ? 'gfaqs-icono-seleccionado' : ''}`}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gfaqs-form-group">
                <label className="gfaqs-label">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formCategoria.descripcion}
                  onChange={handleChangeCategoria}
                  className="gfaqs-textarea"
                  placeholder="Descripción breve de la categoría"
                  rows={3}
                />
              </div>

              <div className="gfaqs-form-row">
                <div className="gfaqs-form-group">
                  <label className="gfaqs-label">Orden</label>
                  <input
                    type="number"
                    name="orden"
                    value={formCategoria.orden}
                    onChange={handleChangeCategoria}
                    className="gfaqs-input"
                    min="0"
                  />
                </div>

                <div className="gfaqs-form-group">
                  <label className="gfaqs-checkbox-label">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formCategoria.activo}
                      onChange={handleChangeCategoria}
                      className="gfaqs-checkbox"
                    />
                    <span>Activo</span>
                  </label>
                </div>
              </div>

              <div className="gfaqs-modal-actions">
                <button type="button" onClick={() => setModalCategoria(false)} className="gfaqs-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="gfaqs-btn-submit">
                  <span className="material-icons">save</span>
                  {editandoCategoria ? 'Actualizar' : 'Crear'} Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionFAQs;