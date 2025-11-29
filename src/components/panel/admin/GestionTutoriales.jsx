import React, { useState, useEffect } from 'react';
import { supabase, selectWithRetry, insertWithRetry, updateWithRetry, deleteWithRetry } from '../../../utils/supabaseClient';
import './GestionTutoriales.css';
import Loading from '../../loading/Loading';

const GestionTutoriales = () => {
  const [tutoriales, setTutoriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'video',
    url: '',
    thumbnail: '',
    duracion: '',
    paginas: '',
    plataforma: 'youtube',
    orden: 0,
    activo: true
  });

  useEffect(() => {
    cargarTutoriales();
  }, []);

  const cargarTutoriales = async () => {
    try {
      setCargando(true);

      // 🆕 Cargar con retry
      const result = await selectWithRetry(
        supabase
          .from('tutoriales')
          .select('*')
          .order('orden', { ascending: true })
      );

      if (result.error) {
        console.error('Error al cargar tutoriales:', result.error);
        setTutoriales([]);
      } else {
        setTutoriales(result.data || []);
      }

    } catch (error) {
      console.error('Error al cargar tutoriales:', error);
      alert('Error al cargar tutoriales');
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const abrirModal = (tutorial = null) => {
    if (tutorial) {
      setEditando(tutorial.id);
      setForm({
        titulo: tutorial.titulo,
        descripcion: tutorial.descripcion || '',
        tipo: tutorial.tipo,
        url: tutorial.url || '',
        thumbnail: tutorial.thumbnail || '',
        duracion: tutorial.duracion || '',
        paginas: tutorial.paginas || '',
        plataforma: tutorial.plataforma || 'youtube',
        orden: tutorial.orden,
        activo: tutorial.activo
      });
    } else {
      setEditando(null);
      setForm({
        titulo: '',
        descripcion: '',
        tipo: 'video',
        url: '',
        thumbnail: '',
        duracion: '',
        paginas: '',
        plataforma: 'youtube',
        orden: 0,
        activo: true
      });
    }
    setModalAbierto(true);
  };

  const generarThumbnail = () => {
    if (!form.url) return;

    let thumbnail = '';

    if (form.url.includes('youtube.com') || form.url.includes('youtu.be')) {
      const videoId = extraerYoutubeId(form.url);
      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } else if (form.url.includes('drive.google.com')) {
      const fileId = extraerGoogleDriveId(form.url);
      if (fileId) {
        thumbnail = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
      }
    }

    if (thumbnail) {
      setForm({ ...form, thumbnail });
    } else {
      alert('No se pudo generar el thumbnail automáticamente. Por favor, ingresa la URL manualmente.');
    }
  };

  const extraerYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const extraerGoogleDriveId = (url) => {
    const regExp = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const guardarTutorial = async (e) => {
    e.preventDefault();

    if (form.tipo === 'video' && !form.duracion) {
      alert('Por favor, ingresa la duración del video');
      return;
    }

    if (form.tipo === 'documento' && !form.paginas) {
      alert('Por favor, ingresa el número de páginas');
      return;
    }

    try {
      if (editando) {
        // 🆕 Actualizar con retry
        const { error } = await updateWithRetry(
          supabase
            .from('tutoriales')
            .update(form)
            .eq('id', editando)
        );

        if (error) throw error;
        alert('Tutorial actualizado');
      } else {
        // 🆕 Crear con retry
        const { error } = await insertWithRetry(
          supabase
            .from('tutoriales')
            .insert([form])
        );

        if (error) throw error;
        alert('Tutorial creado');
      }

      setModalAbierto(false);
      await cargarTutoriales();

    } catch (error) {
      console.error('Error al guardar tutorial:', error);
      alert('Error al guardar tutorial');
    }
  };

  const eliminarTutorial = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este tutorial?')) return;

    try {
      // 🆕 Eliminar con retry
      const { error } = await deleteWithRetry(
        supabase
          .from('tutoriales')
          .delete()
          .eq('id', id)
      );

      if (error) throw error;

      alert('Tutorial eliminado');
      await cargarTutoriales();

    } catch (error) {
      console.error('Error al eliminar tutorial:', error);
      alert('Error al eliminar tutorial');
    }
  };

  const toggleActivo = async (id, activo) => {
    try {
      // 🆕 Update con retry
      const { error } = await updateWithRetry(
        supabase
          .from('tutoriales')
          .update({ activo: !activo })
          .eq('id', id)
      );

      if (error) throw error;
      await cargarTutoriales();

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  const tutorialesFiltrados = tutoriales.filter(tutorial => {
    const tipoMatch = filtroTipo === 'todos' || tutorial.tipo === filtroTipo;
    const busquedaMatch = !busqueda || 
      tutorial.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (tutorial.descripcion && tutorial.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    
    return tipoMatch && busquedaMatch;
  });

  const getTipoIcono = (tipo) => {
    switch (tipo) {
      case 'video': return 'play_circle';
      case 'documento': return 'description';
      case 'imagen': return 'image';
      default: return 'help';
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'video': return '#f44336';
      case 'documento': return '#2196F3';
      case 'imagen': return '#4caf50';
      default: return '#666';
    }
  };

  const estadisticas = {
    total: tutoriales.length,
    videos: tutoriales.filter(t => t.tipo === 'video').length,
    documentos: tutoriales.filter(t => t.tipo === 'documento').length,
    imagenes: tutoriales.filter(t => t.tipo === 'imagen').length,
    activos: tutoriales.filter(t => t.activo).length
  };

  if (cargando) {
    return <Loading message="Cargando..." />;
  }

  return (
    <div className="gtut-container">
      <div className="gtut-header">
        <div className="gtut-titulo-section">
          <span className="material-icons gtut-header-icon">video_library</span>
          <div>
            <h1 className="gtut-titulo">Gestión de Tutoriales</h1>
            <p className="gtut-subtitulo">Administra videos, documentos y guías de ayuda</p>
          </div>
        </div>
        <button onClick={() => abrirModal()} className="gtut-btn-primary">
          <span className="material-icons">add</span>
          Nuevo Tutorial
        </button>
      </div>

      <div className="gtut-stats">
        <div className="gtut-stat-card">
          <span className="material-icons gtut-stat-icon" style={{ color: '#1774f6' }}>folder</span>
          <div>
            <div className="gtut-stat-numero">{estadisticas.total}</div>
            <div className="gtut-stat-label">Total</div>
          </div>
        </div>
        <div className="gtut-stat-card">
          <span className="material-icons gtut-stat-icon" style={{ color: '#f44336' }}>play_circle</span>
          <div>
            <div className="gtut-stat-numero">{estadisticas.videos}</div>
            <div className="gtut-stat-label">Videos</div>
          </div>
        </div>
        <div className="gtut-stat-card">
          <span className="material-icons gtut-stat-icon" style={{ color: '#2196F3' }}>description</span>
          <div>
            <div className="gtut-stat-numero">{estadisticas.documentos}</div>
            <div className="gtut-stat-label">Documentos</div>
          </div>
        </div>
        <div className="gtut-stat-card">
          <span className="material-icons gtut-stat-icon" style={{ color: '#4caf50' }}>check_circle</span>
          <div>
            <div className="gtut-stat-numero">{estadisticas.activos}</div>
            <div className="gtut-stat-label">Activos</div>
          </div>
        </div>
      </div>

      <div className="gtut-filtros">
        <div className="gtut-buscador-wrapper">
          <span className="material-icons gtut-buscador-icon">search</span>
          <input
            type="search"
            placeholder="Buscar tutoriales..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="gtut-buscador"
          />
        </div>

        <select 
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="gtut-select"
        >
          <option value="todos">Todos los tipos</option>
          <option value="video">Videos</option>
          <option value="documento">Documentos</option>
          <option value="imagen">Imágenes</option>
        </select>

        <button onClick={cargarTutoriales} className="gtut-btn-refrescar">
          <span className="material-icons">refresh</span>
          Actualizar
        </button>
      </div>

      <div className="gtut-grid">
        {tutorialesFiltrados.length === 0 ? (
          <div className="gtut-empty">
            <span className="material-icons gtut-empty-icon">video_library</span>
            <p>No hay tutoriales que mostrar</p>
          </div>
        ) : (
          tutorialesFiltrados.map(tutorial => (
            <div key={tutorial.id} className={`gtut-card ${!tutorial.activo ? 'gtut-inactivo' : ''}`}>
              <div className="gtut-card-thumbnail">
                {tutorial.thumbnail ? (
                  <img src={tutorial.thumbnail} alt={tutorial.titulo} className="gtut-thumbnail-img" />
                ) : (
                  <div className="gtut-thumbnail-placeholder">
                    <span className="material-icons">{getTipoIcono(tutorial.tipo)}</span>
                  </div>
                )}
                <div className="gtut-card-overlay">
                  <span className="material-icons gtut-overlay-icon">{getTipoIcono(tutorial.tipo)}</span>
                  <span className="gtut-duracion">
                    {tutorial.tipo === 'video' ? tutorial.duracion : tutorial.paginas}
                  </span>
                </div>
                <span 
                  className="gtut-tipo-badge"
                  style={{ backgroundColor: getTipoColor(tutorial.tipo) }}
                >
                  {tutorial.tipo}
                </span>
              </div>

              <div className="gtut-card-contenido">
                <h3 className="gtut-card-titulo">{tutorial.titulo}</h3>
                <p className="gtut-card-descripcion">{tutorial.descripcion}</p>

                <div className="gtut-card-meta">
                  <span className="gtut-plataforma-badge">
                    <span className="material-icons">cloud</span>
                    {tutorial.plataforma}
                  </span>
                  <span className="gtut-vistas">
                    <span className="material-icons">visibility</span>
                    {tutorial.vistas || 0}
                  </span>
                </div>

                <div className="gtut-card-actions">
                  <button
                    onClick={() => toggleActivo(tutorial.id, tutorial.activo)}
                    className="gtut-btn-icon"
                    title={tutorial.activo ? 'Desactivar' : 'Activar'}
                  >
                    <span className="material-icons">
                      {tutorial.activo ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <a
                    href={tutorial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gtut-btn-icon"
                    title="Ver tutorial"
                  >
                    <span className="material-icons">open_in_new</span>
                  </a>
                  <button
                    onClick={() => abrirModal(tutorial)}
                    className="gtut-btn-icon"
                    title="Editar"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    onClick={() => eliminarTutorial(tutorial.id)}
                    className="gtut-btn-icon gtut-btn-danger"
                    title="Eliminar"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>

              {!tutorial.activo && (
                <div className="gtut-inactivo-overlay">
                  <span className="material-icons">visibility_off</span>
                  Inactivo
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {modalAbierto && (
        <div className="gtut-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="gtut-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gtut-modal-header">
              <h2 className="gtut-modal-titulo">
                {editando ? 'Editar Tutorial' : 'Nuevo Tutorial'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="gtut-modal-close">
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={guardarTutorial} className="gtut-modal-form">
              <div className="gtut-form-group">
                <label className="gtut-label">Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  className="gtut-input"
                  placeholder="Título del tutorial"
                  required
                />
              </div>

              <div className="gtut-form-group">
                <label className="gtut-label">Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  className="gtut-textarea"
                  placeholder="Descripción breve del tutorial"
                  rows={3}
                />
              </div>

              <div className="gtut-form-row">
                <div className="gtut-form-group">
                  <label className="gtut-label">Tipo *</label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleChange}
                    className="gtut-input"
                    required
                  >
                    <option value="video">Video</option>
                    <option value="documento">Documento</option>
                    <option value="imagen">Imagen</option>
                  </select>
                </div>

                <div className="gtut-form-group">
                  <label className="gtut-label">Plataforma *</label>
                  <select
                    name="plataforma"
                    value={form.plataforma}
                    onChange={handleChange}
                    className="gtut-input"
                    required
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="google-drive">Google Drive</option>
                    <option value="google-docs">Google Docs</option>
                    <option value="local">Local</option>
                  </select>
                </div>
              </div>

              <div className="gtut-form-group">
                <label className="gtut-label">URL del Tutorial *</label>
                <div className="gtut-input-with-button">
                  <input
                    type="url"
                    name="url"
                    value={form.url}
                    onChange={handleChange}
                    className="gtut-input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                  <button
                    type="button"
                    onClick={generarThumbnail}
                    className="gtut-btn-generar"
                    title="Generar thumbnail automáticamente"
                  >
                    <span className="material-icons">auto_awesome</span>
                  </button>
                </div>
                <small className="gtut-hint">Pega la URL y presiona el botón para generar el thumbnail automáticamente</small>
              </div>

              <div className="gtut-form-group">
                <label className="gtut-label">URL del Thumbnail</label>
                <input
                  type="url"
                  name="thumbnail"
                  value={form.thumbnail}
                  onChange={handleChange}
                  className="gtut-input"
                  placeholder="https://..."
                />
                {form.thumbnail && (
                  <div className="gtut-thumbnail-preview">
                    <img src={form.thumbnail} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="gtut-form-row">
                {form.tipo === 'video' && (
                  <div className="gtut-form-group">
                    <label className="gtut-label">Duración *</label>
                    <input
                      type="text"
                      name="duracion"
                      value={form.duracion}
                      onChange={handleChange}
                      className="gtut-input"
                      placeholder="Ej: 5:30"
                      required={form.tipo === 'video'}
                    />
                  </div>
                )}

                {form.tipo === 'documento' && (
                  <div className="gtut-form-group">
                    <label className="gtut-label">Páginas *</label>
                    <input
                      type="text"
                      name="paginas"
                      value={form.paginas}
                      onChange={handleChange}
                      className="gtut-input"
                      placeholder="Ej: 12 páginas"
                      required={form.tipo === 'documento'}
                    />
                  </div>
                )}

                <div className="gtut-form-group">
                  <label className="gtut-label">Orden</label>
                  <input
                    type="number"
                    name="orden"
                    value={form.orden}
                    onChange={handleChange}
                    className="gtut-input"
                    min="0"
                  />
                </div>
              </div>

              <div className="gtut-form-group">
                <label className="gtut-checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={form.activo}
                    onChange={handleChange}
                    className="gtut-checkbox"
                  />
                  <span>Activo (visible para usuarios)</span>
                </label>
              </div>

              <div className="gtut-modal-actions">
                <button type="button" onClick={() => setModalAbierto(false)} className="gtut-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="gtut-btn-submit">
                  <span className="material-icons">save</span>
                  {editando ? 'Actualizar' : 'Crear'} Tutorial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionTutoriales;