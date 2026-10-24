// src/components/home/CategoryList.jsx
// Lista de categorías del inicio:
//  - Un buscador que busca en Oficios y Negocios a la vez, entiende palabras comunes
//    ("uñas", "pasto", "remis") y también encuentra publicaciones por su nombre.
//  - "Las más elegidas" arriba y el resto agrupado por rubro.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { iconoDeGrupo } from '../../utils/iconosGrupos';
import { normalizar, prepararCategorias, buscarCategorias } from '../publicar/utils/categoriasSugeridas';
import './CategoryListNuevo.css';

const NOMBRE_TIPO = { servicio: 'Oficio', producto: 'Negocio' };
const POR_GRUPO = 6; // cuántas se ven por grupo antes de "ver más"
const MAS_ELEGIDAS = 6;

const textoPublicaciones = (n) => (n === 1 ? '1 publicación' : `${n} publicaciones`);

const TarjetaCategoria = ({ cat, onAbrir }) => (
  <button
    type="button"
    className="cl-tarjeta"
    data-category={cat.nombre}
    onClick={() => onAbrir(cat)}
    style={{ '--cl-color': cat.color || '#1774f6' }}
  >
    <span className="cl-tarjeta-icono">
      <span className="material-icons">{cat.icon || 'category'}</span>
    </span>
    <span className="cl-tarjeta-textos">
      <strong>{cat.nombre}</strong>
      <small>{textoPublicaciones(cat.cantidad)}</small>
    </span>
  </button>
);

const CategoryList = ({ type, onSelectCategory }) => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abiertos, setAbiertos] = useState({});

  // Se trae todo una sola vez (los dos tipos): son pocas filas y así el buscador
  // encuentra cosas aunque estén en la otra pestaña.
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      const [cats, servs] = await Promise.all([
        supabase.from('categorias').select('id, nombre, icon, color, grupo, tipo').eq('estado', 'activa'),
        supabase
          .from('servicios')
          .select('id, nombre, descripcion, categoria_id, foto_portada')
          .eq('estado', 'activo')
          .eq('oculto_por_reportes', false),
      ]);
      if (!activo) return;
      if (cats.error) {
        setError(true);
        setCargando(false);
        return;
      }
      setCategorias(cats.data || []);
      setServicios(servs.data || []);
      setError(false);
      setCargando(false);
    };
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    setAbiertos({});
  }, [type]);

  // Solo categorías con publicaciones, con su cantidad
  const conPublicaciones = useMemo(() => {
    const cuenta = {};
    servicios.forEach((s) => {
      cuenta[s.categoria_id] = (cuenta[s.categoria_id] || 0) + 1;
    });
    return categorias
      .filter((c) => cuenta[c.id])
      .map((c) => ({ ...c, cantidad: cuenta[c.id] }));
  }, [categorias, servicios]);

  const delTipo = useMemo(() => conPublicaciones.filter((c) => c.tipo === type), [conPublicaciones, type]);

  const masElegidas = useMemo(
    () => [...delTipo].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es')).slice(0, MAS_ELEGIDAS),
    [delTipo]
  );

  const grupos = useMemo(() => {
    const mapa = {};
    delTipo.forEach((c) => {
      const g = c.grupo || 'Otros';
      if (!mapa[g]) mapa[g] = [];
      mapa[g].push(c);
    });
    const armar = (nombre, cats) => ({
      nombre,
      cats: cats.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      total: cats.reduce((s, c) => s + c.cantidad, 0),
    });
    // Los rubros con una sola categoría se juntan al final, así la lista no queda cortada
    const grandes = [];
    const sueltas = [];
    Object.entries(mapa).forEach(([nombre, cats]) => {
      if (cats.length > 1) grandes.push(armar(nombre, cats));
      else sueltas.push(...cats);
    });
    grandes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (sueltas.length === 1 && grandes.length === 0) return [armar(sueltas[0].grupo || 'Otros', sueltas)];
    if (sueltas.length > 0) grandes.push({ ...armar('Más rubros', sueltas), icono: 'apps' });
    return grandes;
  }, [delTipo]);

  // ---------- Búsqueda ----------
  const preparadas = useMemo(() => prepararCategorias(conPublicaciones), [conPublicaciones]);
  const q = normalizar(busqueda);
  const buscando = q.length >= 2;

  const resultados = useMemo(() => {
    if (!buscando) return { categorias: [], publicaciones: [] };

    // Categorías: por nombre, grupo y palabras que usa la gente
    const porSinonimo = buscarCategorias(busqueda, preparadas, 12);
    const porNombre = conPublicaciones.filter((c) => normalizar(`${c.nombre} ${c.grupo || ''}`).includes(q));
    const ids = new Set();
    const cats = [];
    [...porNombre, ...porSinonimo].forEach((c) => {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        cats.push(conPublicaciones.find((x) => x.id === c.id) || c);
      }
    });

    // Publicaciones: por nombre (primero) o descripción
    const pubs = servicios
      .map((s) => {
        const nombre = normalizar(s.nombre);
        const desc = normalizar(s.descripcion);
        const puntos = nombre.startsWith(q) ? 3 : nombre.includes(q) ? 2 : desc.includes(q) ? 1 : 0;
        return { s, puntos };
      })
      .filter((r) => r.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 6)
      .map((r) => ({ ...r.s, categoria: categorias.find((c) => c.id === r.s.categoria_id) }));

    // Las categorías de las publicaciones encontradas también suman
    pubs.forEach((p) => {
      const c = conPublicaciones.find((x) => x.id === p.categoria_id);
      if (c && !ids.has(c.id)) {
        ids.add(c.id);
        cats.push(c);
      }
    });

    // Primero las del tipo de la pestaña abierta
    cats.sort((a, b) => (a.tipo === type ? 0 : 1) - (b.tipo === type ? 0 : 1));
    return { categorias: cats.slice(0, 10), publicaciones: pubs };
  }, [buscando, busqueda, q, preparadas, conPublicaciones, servicios, categorias, type]);

  // ---------- Abrir ----------
  const abrirCategoria = (cat) => {
    const nombre = encodeURIComponent(cat.nombre);
    if (cat.tipo === type && typeof onSelectCategory === 'function') {
      onSelectCategory(nombre);
    } else {
      navigate(`/categoria/${cat.tipo}/${nombre}`, {
        state: { fromHome: true, type: cat.tipo, categoryName: nombre },
      });
    }
  };

  // ---------- Vista ----------
  if (cargando) {
    return (
      <div className="cl">
        <div className="cl-esqueleto" aria-label="Cargando categorías">
          {Array.from({ length: 6 }).map((_, i) => <span key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cl">
        <div className="cl-vacio">
          <span className="material-icons">cloud_off</span>
          <p>No pudimos cargar las categorías. Revisá tu conexión.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cl">
      {/* Buscador */}
      <div className="cl-buscador">
        <span className="material-icons">search</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value.slice(0, 60))}
          placeholder="¿Qué necesitás? Ej: plomero, tortas, uñas…"
          aria-label="Buscar oficios, negocios o publicaciones"
          enterKeyHint="search"
        />
        {busqueda && (
          <button type="button" className="cl-buscador-limpiar" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">
            <span className="material-icons">close</span>
          </button>
        )}
      </div>

      {buscando ? (
        <div className="cl-resultados" aria-live="polite">
          {resultados.categorias.length === 0 && resultados.publicaciones.length === 0 ? (
            <div className="cl-vacio">
              <span className="material-icons">search_off</span>
              <p>
                No encontramos "<strong>{busqueda}</strong>" en Goya todavía.
              </p>
              <small>Probá con otra palabra o mirá el mapa.</small>
              <button type="button" className="cl-boton-sec" onClick={() => navigate('/explorar')}>
                <span className="material-icons">map</span>
                Ver el mapa
              </button>
            </div>
          ) : (
            <>
              {resultados.categorias.length > 0 && (
                <section>
                  <h3 className="cl-subtitulo">Categorías</h3>
                  <ul className="cl-lista-resultados">
                    {resultados.categorias.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => abrirCategoria(c)} style={{ '--cl-color': c.color || '#1774f6' }}>
                          <span className="cl-tarjeta-icono">
                            <span className="material-icons">{c.icon || 'category'}</span>
                          </span>
                          <span className="cl-resultado-textos">
                            <strong>{c.nombre}</strong>
                            <small>{textoPublicaciones(c.cantidad)}</small>
                          </span>
                          <span className={`cl-etiqueta cl-etiqueta-${c.tipo}`}>{NOMBRE_TIPO[c.tipo]}</span>
                          <span className="material-icons cl-flecha">chevron_right</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {resultados.publicaciones.length > 0 && (
                <section>
                  <h3 className="cl-subtitulo">Publicaciones</h3>
                  <ul className="cl-lista-resultados">
                    {resultados.publicaciones.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => navigate(`/perfil/${p.id}`)}>
                          {p.foto_portada ? (
                            <img src={p.foto_portada} alt="" className="cl-foto" loading="lazy" />
                          ) : (
                            <span className="cl-tarjeta-icono" style={{ '--cl-color': p.categoria?.color || '#64748b' }}>
                              <span className="material-icons">{p.categoria?.icon || 'storefront'}</span>
                            </span>
                          )}
                          <span className="cl-resultado-textos">
                            <strong>{p.nombre}</strong>
                            <small>{p.categoria?.nombre || 'Publicación'}</small>
                          </span>
                          <span className="material-icons cl-flecha">chevron_right</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      ) : delTipo.length === 0 ? (
        <div className="cl-vacio">
          <span className="material-icons">{type === 'servicio' ? 'handyman' : 'storefront'}</span>
          <p>Todavía no hay {type === 'servicio' ? 'oficios' : 'negocios'} publicados.</p>
          <button type="button" className="cl-boton" onClick={() => navigate('/publicar')}>
            <span className="material-icons">add_circle</span>
            Publicar el primero
          </button>
        </div>
      ) : (
        <>
          {/* Las más elegidas */}
          {masElegidas.length >= 3 && (
            <section className="cl-destacadas">
              <h3 className="cl-subtitulo">
                <span className="material-icons">local_fire_department</span>
                Las más elegidas
              </h3>
              <div className="cl-chips">
                {masElegidas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="cl-chip"
                    onClick={() => abrirCategoria(c)}
                    style={{ '--cl-color': c.color || '#1774f6' }}
                  >
                    <span className="material-icons">{c.icon || 'category'}</span>
                    {c.nombre}
                    <b>{c.cantidad}</b>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Todas, por rubro */}
          <div className="cl-grupos">
            {grupos.map((g) => {
              const abierto = abiertos[g.nombre];
              const visibles = abierto ? g.cats : g.cats.slice(0, POR_GRUPO);
              const resto = g.cats.length - visibles.length;
              return (
                <section key={g.nombre} className="cl-grupo">
                  <h3 className="cl-grupo-titulo">
                    <span className="material-icons">{g.icono || iconoDeGrupo(g.nombre)}</span>
                    {g.nombre}
                    <small>{textoPublicaciones(g.total)}</small>
                  </h3>
                  <div className="cl-grilla">
                    {visibles.map((c) => <TarjetaCategoria key={c.id} cat={c} onAbrir={abrirCategoria} />)}
                  </div>
                  {(resto > 0 || abierto) && g.cats.length > POR_GRUPO && (
                    <button
                      type="button"
                      className="cl-ver-mas"
                      onClick={() => setAbiertos((a) => ({ ...a, [g.nombre]: !a[g.nombre] }))}
                      aria-expanded={!!abierto}
                    >
                      {abierto ? 'Ver menos' : `Ver ${resto} más de ${g.nombre}`}
                      <span className="material-icons">{abierto ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryList;
