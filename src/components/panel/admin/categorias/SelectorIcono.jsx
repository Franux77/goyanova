import React, { useMemo, useState } from 'react';
import { GRUPOS_ICONOS, buscarIconos, sugerirIconos, tituloDeIcono } from './iconosCatalogo';

/* Selector de íconos en español: sugeridos por el nombre de la categoría,
   buscador ("pizza", "pasto", "uñas") y lista por temas. */
const SelectorIcono = ({ valor, color, nombreCategoria, onElegir }) => {
  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState('sugeridos');
  const [avanzado, setAvanzado] = useState(false);
  const [tecnico, setTecnico] = useState('');

  const sugeridos = useMemo(() => sugerirIconos(nombreCategoria || '', 10), [nombreCategoria]);
  const resultados = useMemo(() => buscarIconos(busqueda, 60), [busqueda]);

  const lista = busqueda.trim().length >= 2
    ? resultados
    : tema === 'sugeridos'
      ? sugeridos
      : GRUPOS_ICONOS.find((g) => g.clave === tema)?.iconos || [];

  const temas = [{ clave: 'sugeridos', titulo: 'Sugeridos' }, ...GRUPOS_ICONOS.map(({ clave, titulo }) => ({ clave, titulo }))];

  return (
    <div className="cat-iconos">
      <div className="cat-iconos-elegido">
        <span className="cat-iconos-muestra" style={{ background: color }}>
          <span className="material-icons">{valor || 'category'}</span>
        </span>
        <div>
          <strong>{valor ? tituloDeIcono(valor) : 'Sin ícono'}</strong>
          <small>{valor ? 'Así se va a ver en el mapa y en el inicio' : 'Elegí uno de abajo'}</small>
        </div>
      </div>

      <div className="cat-buscador">
        <span className="material-icons">search</span>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value.slice(0, 40))}
          placeholder="Buscá en español: pizza, pasto, uñas, auto…"
          aria-label="Buscar ícono"
        />
        {busqueda && (
          <button type="button" className="cat-buscador-limpiar" onClick={() => setBusqueda('')} aria-label="Borrar">
            <span className="material-icons">close</span>
          </button>
        )}
      </div>

      {busqueda.trim().length < 2 && (
        <div className="cat-iconos-temas" role="tablist" aria-label="Temas de íconos">
          {temas.map((t) => (
            <button
              key={t.clave}
              type="button"
              role="tab"
              aria-selected={tema === t.clave}
              className={tema === t.clave ? 'activo' : ''}
              onClick={() => setTema(t.clave)}
            >
              {t.clave === 'sugeridos' && <span className="material-icons">auto_awesome</span>}
              {t.titulo}
            </button>
          ))}
        </div>
      )}

      {lista.length > 0 ? (
        <div className="cat-iconos-grilla">
          {lista.map((ic) => (
            <button
              key={ic.nombre}
              type="button"
              className={`cat-icono ${valor === ic.nombre ? 'elegido' : ''}`}
              onClick={() => onElegir(ic.nombre)}
              title={ic.titulo}
              style={valor === ic.nombre ? { '--cat-color': color } : undefined}
            >
              <span className="material-icons">{ic.nombre}</span>
              <small>{ic.titulo}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="cat-vacio-chico">
          {busqueda.trim().length >= 2
            ? `No encontramos íconos para "${busqueda}". Probá con otra palabra (ej: comida, tienda, auto).`
            : tema === 'sugeridos'
              ? 'Escribí el nombre de la categoría arriba y te sugerimos íconos.'
              : 'No hay íconos en este tema.'}
        </p>
      )}

      <button type="button" className="cat-link" onClick={() => setAvanzado((v) => !v)}>
        <span className="material-icons">{avanzado ? 'expand_less' : 'expand_more'}</span>
        Usar un ícono que no está en la lista
      </button>
      {avanzado && (
        <div className="cat-iconos-tecnico">
          <p>
            Escribí el nombre en inglés de{' '}
            <a href="https://fonts.google.com/icons?icon.set=Material+Icons" target="_blank" rel="noopener noreferrer">
              Material Icons
            </a>{' '}
            (ej: <code>local_pizza</code>).
          </p>
          <div className="cat-fila">
            <input
              type="text"
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40))}
              placeholder="nombre_del_icono"
              aria-label="Nombre técnico del ícono"
            />
            <span className="cat-iconos-prueba material-icons" aria-hidden="true">{tecnico || 'help'}</span>
            <button type="button" className="cat-boton-sec" disabled={!tecnico} onClick={() => onElegir(tecnico)}>
              Usar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorIcono;
