// Interfaz del mapa (Explorar): buscador, filtros, lista de lugares y ficha.
//  - PC: panel fijo a la izquierda con todo, el mapa a la derecha.
//  - Celular: barra flotante arriba y una hoja que sube desde abajo.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { numeroParaWhatsapp } from '../../../utils/whatsapp';
import { getNivelWhatsapp } from '../../../utils/whatsappPlan';
import './PanelMapa.css';

const fotoValida = (f) => (f && f.trim() !== '' && f.toLowerCase() !== 'empty' ? f : null);

const registrarClicWhatsapp = (id) => {
  supabase.rpc('registrar_evento_servicio', { p_servicio_id: id, p_tipo: 'clic_whatsapp' }).then(() => {}, () => {});
};

const enlaceComoLlegar = (p) => {
  const lat = Number(p.latitud);
  const lng = Number(p.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

const Estrellas = ({ valor }) => {
  if (!valor) return null;
  return (
    <span className="pm-estrellas" aria-label={`Calificación ${valor.toFixed(1)} de 5`}>
      <span className="material-icons">star</span>
      {valor.toFixed(1)}
    </span>
  );
};

const Miniatura = ({ perfil, categoria, grande = false }) => {
  const foto = fotoValida(perfil.foto_portada);
  if (foto) return <img src={foto} alt="" className={grande ? 'pm-foto-grande' : 'pm-foto'} loading="lazy" />;
  return (
    <span
      className={grande ? 'pm-foto-grande pm-foto-icono' : 'pm-foto pm-foto-icono'}
      style={{ '--pm-color': categoria?.color || '#1774f6' }}
      aria-hidden="true"
    >
      <span className="material-icons">{categoria?.icon || 'storefront'}</span>
    </span>
  );
};

/* ------------------------------------------------------------------
   Buscador + filtros
   ------------------------------------------------------------------ */
export const BarraMapa = ({
  query, setQuery, tipo, setTipo, categoria, setCategoria, calificacion, setCalificacion,
  categoriasDisponibles, onVolver, onMenu, compacta = false,
}) => {
  const cambiarTipo = (t) => {
    setTipo(t);
    setCategoria('');
  };
  const hayFiltros = tipo || categoria || calificacion;

  return (
    <div className={`pm-barra ${compacta ? 'compacta' : ''}`}>
      <div className="pm-barra-fila">
        <button type="button" className="pm-icono-boton" onClick={onVolver} aria-label="Volver">
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="pm-buscador">
          <span className="material-icons">search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar plomero, tortas, barbería…"
            aria-label="Buscar en el mapa"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="pm-limpiar" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        <button type="button" className="pm-icono-boton" onClick={onMenu} aria-label="Menú">
          <span className="material-icons">menu</span>
        </button>
      </div>

      <div className="pm-filtros">
        <div className="pm-segmento" role="group" aria-label="Tipo">
          {[['', 'Todo'], ['servicio', 'Oficios'], ['producto', 'Negocios']].map(([v, t]) => (
            <button key={v || 'todo'} type="button" className={tipo === v ? 'activo' : ''} onClick={() => cambiarTipo(v)}>
              {t}
            </button>
          ))}
        </div>
        <label className={`pm-chip-select ${categoria ? 'activo' : ''}`}>
          <span className="material-icons">category</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
            <option value="">Categoría</option>
            {categoriasDisponibles.map((c) => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className={`pm-chip-select ${calificacion ? 'activo' : ''}`}>
          <span className="material-icons">star</span>
          <select value={calificacion} onChange={(e) => setCalificacion(e.target.value)} aria-label="Orden">
            <option value="">Orden</option>
            <option value="mayor">Mejor calificados</option>
            <option value="menor">Menor calificación</option>
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="pm-chip-limpiar"
            onClick={() => { setTipo(''); setCategoria(''); setCalificacion(''); }}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   Tarjeta de un lugar en la lista
   ------------------------------------------------------------------ */
const TarjetaLugar = ({ perfil, categoria, onAbrir, onLocalizar }) => {
  const navigate = useNavigate();
  const nivelWsp = getNivelWhatsapp(perfil.badge_texto);
  return (
    <li className={`pm-tarjeta ${perfil.pin_color ? 'destacada' : ''}`} style={perfil.pin_color ? { '--pm-destaque': perfil.pin_color } : undefined}>
      <button type="button" className="pm-tarjeta-principal" onClick={() => onAbrir(perfil)}>
        <Miniatura perfil={perfil} categoria={categoria} />
        <span className="pm-tarjeta-textos">
          <span className="pm-tarjeta-titulo">
            <strong>{perfil.nombre}</strong>
            {perfil.es_premium && perfil.badge_texto && (
              <span className="material-icons pm-verificado" title={perfil.badge_texto}>verified</span>
            )}
          </span>
          <span className="pm-tarjeta-meta">
            {categoria && (
              <span className="pm-cat" style={{ '--pm-color': categoria.color || '#1774f6' }}>{categoria.nombre}</span>
            )}
            <Estrellas valor={perfil.ratingPromedio} />
          </span>
          {perfil.descripcion && <span className="pm-tarjeta-desc">{perfil.descripcion}</span>}
        </span>
      </button>
      <div className="pm-tarjeta-acciones">
        {perfil.contacto_whatsapp && (
          <a
            href={`https://wa.me/${numeroParaWhatsapp(perfil.contacto_whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`pm-accion pm-wsp ${nivelWsp ? `pm-wsp-${nivelWsp}` : ''}`}
            onClick={() => registrarClicWhatsapp(perfil.id)}
          >
            <span className="material-icons">chat</span>
            WhatsApp
          </a>
        )}
        <button type="button" className="pm-accion" onClick={() => onLocalizar(perfil)}>
          <span className="material-icons">place</span>
          En el mapa
        </button>
        <button type="button" className="pm-accion" onClick={() => navigate(`/perfil/${perfil.id}`)}>
          <span className="material-icons">open_in_new</span>
          Perfil
        </button>
      </div>
    </li>
  );
};

/* ------------------------------------------------------------------
   Ficha de un lugar (al tocar un pin o una tarjeta)
   ------------------------------------------------------------------ */
export const FichaLugar = ({ perfil, categoria, onCerrar, enPanel = false }) => {
  const navigate = useNavigate();
  const [verMas, setVerMas] = useState(false);

  useEffect(() => {
    setVerMas(false);
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [perfil, onCerrar]);

  if (!perfil) return null;
  const llegar = enlaceComoLlegar(perfil);
  const nivelWsp = getNivelWhatsapp(perfil.badge_texto);
  const desc = perfil.descripcion || '';
  const larga = desc.length > 160;

  const redes = [
    perfil.contacto_instagram && { icono: 'photo_camera', texto: 'Instagram', href: `https://instagram.com/${perfil.contacto_instagram.replace('@', '')}` },
    perfil.contacto_facebook && { icono: 'thumb_up', texto: 'Facebook', href: `https://facebook.com/${perfil.contacto_facebook}` },
    perfil.contacto_email && { icono: 'mail', texto: 'Mail', href: `mailto:${perfil.contacto_email}` },
  ].filter(Boolean);

  return (
    <div className={`pm-ficha ${enPanel ? 'en-panel' : ''}`} role="dialog" aria-label={perfil.nombre}>
      <div className="pm-ficha-cabecera">
        <button type="button" className="pm-volver-texto" onClick={onCerrar}>
          <span className="material-icons">{enPanel ? 'arrow_back' : 'close'}</span>
          {enPanel ? 'Volver a resultados' : 'Cerrar'}
        </button>
      </div>

      <div className="pm-ficha-cuerpo">
        <Miniatura perfil={perfil} categoria={categoria} grande />

        <div className="pm-ficha-titulo">
          <h2>{perfil.nombre}</h2>
          {perfil.es_premium && perfil.badge_texto && (
            <span className="pm-insignia">
              <span className="material-icons">verified</span>
              {perfil.badge_texto}
            </span>
          )}
        </div>

        <div className="pm-tarjeta-meta">
          {categoria && <span className="pm-cat" style={{ '--pm-color': categoria.color || '#1774f6' }}>{categoria.nombre}</span>}
          <Estrellas valor={perfil.ratingPromedio} />
        </div>

        {perfil.direccion_escrita && (
          <p className="pm-ficha-direccion">
            <span className="material-icons">place</span>
            {perfil.direccion_escrita}
          </p>
        )}

        {desc && (
          <p className={`pm-ficha-desc ${verMas ? 'abierta' : ''}`}>
            {desc}
          </p>
        )}
        {larga && (
          <button type="button" className="pm-link" onClick={() => setVerMas((v) => !v)}>
            {verMas ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        <div className="pm-ficha-acciones">
          {perfil.contacto_whatsapp && (
            <a
              href={`https://wa.me/${numeroParaWhatsapp(perfil.contacto_whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`pm-boton pm-boton-wsp ${nivelWsp ? `pm-wsp-${nivelWsp}` : ''}`}
              onClick={() => registrarClicWhatsapp(perfil.id)}
            >
              <span className="material-icons">chat</span>
              Escribir por WhatsApp
            </a>
          )}
          <div className="pm-ficha-fila">
            {llegar && (
              <a href={llegar} target="_blank" rel="noopener noreferrer" className="pm-boton pm-boton-sec">
                <span className="material-icons">directions</span>
                Cómo llegar
              </a>
            )}
            <button type="button" className="pm-boton pm-boton-sec" onClick={() => navigate(`/perfil/${perfil.id}`)}>
              <span className="material-icons">person</span>
              Ver perfil
            </button>
          </div>
        </div>

        {redes.length > 0 && (
          <div className="pm-redes">
            {redes.map((r) => (
              <a key={r.texto} href={r.href} target="_blank" rel="noopener noreferrer" className="pm-red">
                <span className="material-icons">{r.icono}</span>
                {r.texto}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   Lista de resultados
   ------------------------------------------------------------------ */
export const ListaLugares = ({
  perfiles, total, categoriasMap, hayMas, onCargarMas, onAbrir, onLocalizar, query, onLimpiar,
}) => {
  if (total === 0) {
    return (
      <div className="pm-vacio">
        <span className="material-icons">search_off</span>
        <p>{query ? `No encontramos "${query}" en el mapa.` : 'No hay lugares con estos filtros.'}</p>
        <button type="button" className="pm-boton pm-boton-sec" onClick={onLimpiar}>Ver todos</button>
      </div>
    );
  }
  return (
    <>
      <ul className="pm-lista">
        {perfiles.map((p) => (
          <TarjetaLugar
            key={p.id}
            perfil={p}
            categoria={categoriasMap[p.categoria_id]}
            onAbrir={onAbrir}
            onLocalizar={onLocalizar}
          />
        ))}
      </ul>
      {hayMas && (
        <button type="button" className="pm-mas" onClick={onCargarMas}>
          Ver más ({perfiles.length} de {total})
        </button>
      )}
    </>
  );
};
