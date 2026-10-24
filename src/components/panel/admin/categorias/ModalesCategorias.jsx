import React, { useEffect, useMemo, useState } from 'react';
import { NOMBRE_TIPO, buscarParecidas, grupoParecido, normalizar } from './utilsCategorias';

const useModal = (onCerrar) => {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar]);
};

const MiniIcono = ({ cat }) => (
  <span className="cat-mini-icono" style={{ background: cat.color || '#64748b' }}>
    <span className="material-icons">{cat.icon || 'category'}</span>
  </span>
);

/* ------------------------------------------------------------------
   Eliminar: si tiene publicaciones, primero hay que elegir a dónde pasan.
   Sugiere categorías parecidas y ofrece suspender en vez de borrar.
   ------------------------------------------------------------------ */
export const ModalEliminar = ({ cat, categorias, publicaciones, trabajando, onConfirmar, onSuspender, onCerrar }) => {
  useModal(onCerrar);
  const [busqueda, setBusqueda] = useState('');
  const [destino, setDestino] = useState(null);

  const sugeridas = useMemo(
    () => buscarParecidas(cat.nombre, categorias.filter((c) => c.activa), cat.id).map((p) => p.cat),
    [cat, categorias]
  );

  const opciones = useMemo(() => {
    const q = normalizar(busqueda);
    const activas = categorias.filter((c) => c.activa && c.id !== cat.id);
    const delGrupo = activas.filter((c) => c.tipo === cat.tipo && c.grupo === cat.grupo);
    const filtradas = q.length >= 2
      ? activas.filter((c) => normalizar(`${c.nombre} ${c.grupo || ''}`).includes(q))
      : sugeridas.length > 0
        ? sugeridas
        : delGrupo;
    // Primero las del mismo tipo
    return [...filtradas].sort((a, b) => (a.tipo === cat.tipo ? -1 : 0) - (b.tipo === cat.tipo ? -1 : 0)).slice(0, 12);
  }, [busqueda, categorias, cat, sugeridas]);

  return (
    <div className="cat-modal-fondo" onClick={onCerrar}>
      <div className="cat-modal cat-modal-chico" role="dialog" aria-modal="true" aria-labelledby="cat-del-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="cat-modal-cabecera">
          <div>
            <h3 id="cat-del-titulo">Eliminar "{cat.nombre}"</h3>
            <p>{publicaciones > 0 ? `Tiene ${publicaciones} ${publicaciones === 1 ? 'publicación' : 'publicaciones'}` : 'No tiene publicaciones'}</p>
          </div>
          <button type="button" className="cat-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="cat-modal-cuerpo">
          {publicaciones > 0 ? (
            <>
              <p className="cat-texto">
                Antes de borrarla, elegí a qué categoría pasan sus publicaciones. Si la nueva es de{' '}
                {NOMBRE_TIPO[cat.tipo === 'servicio' ? 'producto' : 'servicio']}, las publicaciones también cambian de tipo.
              </p>
              <div className="cat-buscador">
                <span className="material-icons">search</span>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar categoría destino…"
                  aria-label="Buscar categoría destino"
                />
              </div>
              {!busqueda && opciones.length > 0 && (
                <p className="cat-ayuda">{sugeridas.length > 0 ? 'Parecidas:' : `Del mismo grupo (${cat.grupo || 'sin grupo'}):`}</p>
              )}
              <ul className="cat-opciones">
                {opciones.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={destino?.id === c.id ? 'activo' : ''} onClick={() => setDestino(c)}>
                      <MiniIcono cat={c} />
                      <span>
                        <strong>{c.nombre}</strong>
                        <small>{NOMBRE_TIPO[c.tipo]} · {c.grupo || 'Sin grupo'}</small>
                      </span>
                      {destino?.id === c.id && <span className="material-icons cat-ok">check_circle</span>}
                    </button>
                  </li>
                ))}
                {opciones.length === 0 && <li className="cat-vacio-chico">Buscá la categoría a la que querés pasarlas.</li>}
              </ul>
            </>
          ) : (
            <p className="cat-texto">Se va a borrar para siempre. Si capaz la usás más adelante, mejor suspendela: deja de aparecer y la podés reactivar.</p>
          )}
        </div>

        <footer className="cat-modal-pie">
          <div className="cat-fila cat-fila-final">
            {cat.activa && (
              <button type="button" className="cat-boton-sec" onClick={onSuspender} disabled={trabajando}>
                Suspender en vez de borrar
              </button>
            )}
            <button
              type="button"
              className="cat-boton cat-boton-peligro"
              disabled={trabajando || (publicaciones > 0 && !destino)}
              onClick={() => onConfirmar(destino)}
            >
              <span className="material-icons">delete</span>
              {publicaciones > 0 ? (destino ? `Pasar a ${destino.nombre} y borrar` : 'Elegí el destino') : 'Borrar'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   Grupos: ver cuántas categorías tiene cada uno y renombrarlos.
   ------------------------------------------------------------------ */
export const ModalGrupos = ({ categorias, trabajando, onRenombrar, onCerrar }) => {
  useModal(onCerrar);
  const [tipo, setTipo] = useState('servicio');
  const [editando, setEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const grupos = useMemo(() => {
    const mapa = {};
    categorias
      .filter((c) => c.tipo === tipo)
      .forEach((c) => {
        const g = c.grupo || 'Sin grupo';
        if (!mapa[g]) mapa[g] = [];
        mapa[g].push(c);
      });
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [categorias, tipo]);

  const nombres = grupos.map(([g]) => g);
  const parecido = editando && nuevoNombre ? grupoParecido(nuevoNombre, nombres.filter((g) => g !== editando)) : null;

  const guardar = () => {
    const nombre = nuevoNombre.trim().replace(/\s+/g, ' ');
    if (!nombre || nombre === editando) {
      setEditando(null);
      return;
    }
    onRenombrar(tipo, editando, nombre);
    setEditando(null);
  };

  return (
    <div className="cat-modal-fondo" onClick={onCerrar}>
      <div className="cat-modal cat-modal-chico" role="dialog" aria-modal="true" aria-labelledby="cat-grupos-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="cat-modal-cabecera">
          <div>
            <h3 id="cat-grupos-titulo">Grupos</h3>
            <p>Renombrá un grupo y se actualizan todas sus categorías</p>
          </div>
          <button type="button" className="cat-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="cat-modal-cuerpo">
          <div className="cat-segmento">
            {['servicio', 'producto'].map((t) => (
              <button key={t} type="button" className={tipo === t ? 'activo' : ''} onClick={() => { setTipo(t); setEditando(null); }}>
                {NOMBRE_TIPO[t]}
              </button>
            ))}
          </div>

          <ul className="cat-grupos-lista">
            {grupos.map(([g, cats]) => (
              <li key={g}>
                {editando === g ? (
                  <div className="cat-grupo-editar">
                    <div className="cat-fila">
                      <input
                        type="text"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value.slice(0, 40))}
                        onKeyDown={(e) => e.key === 'Enter' && guardar()}
                        autoFocus
                        aria-label={`Nuevo nombre para ${g}`}
                      />
                      <button type="button" className="cat-boton" onClick={guardar} disabled={trabajando || !nuevoNombre.trim()}>
                        Guardar
                      </button>
                      <button type="button" className="cat-boton-sec" onClick={() => setEditando(null)}>
                        Cancelar
                      </button>
                    </div>
                    {parecido && (
                      <p className="cat-aviso">
                        <span className="material-icons">merge</span>
                        Ya existe <strong>{parecido}</strong>: si guardás con ese nombre, las categorías se juntan en un solo grupo.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="cat-grupo-info">
                      <strong>{g}</strong>
                      <small>
                        {cats.length} {cats.length === 1 ? 'categoría' : 'categorías'}:{' '}
                        {cats.slice(0, 4).map((c) => c.nombre).join(', ')}
                        {cats.length > 4 ? '…' : ''}
                      </small>
                    </div>
                    {g !== 'Sin grupo' && (
                      <button
                        type="button"
                        className="cat-icono-boton"
                        onClick={() => { setEditando(g); setNuevoNombre(g); }}
                        aria-label={`Renombrar ${g}`}
                        title="Renombrar"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="cat-ayuda">
            Para crear un grupo nuevo, elegí "Nuevo grupo" al crear o editar una categoría. Un grupo sin categorías desaparece solo.
          </p>
        </div>
      </div>
    </div>
  );
};
