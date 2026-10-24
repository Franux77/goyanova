// Encabezado de sección para los paneles (admin y usuario).
// Dentro de una sección muestra "← Panel" + el nombre de la sección, para poder
// volver al inicio del panel sin abrir el menú.
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './EncabezadoSeccion.css';

/** Busca en qué sección está (la ruta más larga que coincide) */
export const useSeccionActual = (secciones, rutaInicio) => {
  const { pathname } = useLocation();
  const limpia = pathname.replace(/\/+$/, '');
  const enInicio = limpia === rutaInicio || limpia === rutaInicio.replace(/\/[^/]+$/, '');
  const seccion = [...secciones]
    .filter((s) => s.ruta && (limpia === s.ruta || limpia.startsWith(`${s.ruta}/`)))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];
  return { enInicio, seccion };
};

/** Contenido de la barra de arriba en el celular */
export const BarraMovilPanel = ({ secciones, rutaInicio, nombreInicio, onMenu, logo, ocultarEn = [] }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { enInicio, seccion } = useSeccionActual(secciones, rutaInicio);
  const sinVolver = enInicio || ocultarEn.some((r) => pathname.startsWith(r));

  if (sinVolver) {
    return (
      <div className="enc-movil">
        <button type="button" className="enc-movil-boton" onClick={onMenu} aria-label="Abrir menú">
          <span className="material-icons">menu</span>
        </button>
        <div className="enc-movil-logo">{logo}</div>
        <span className="enc-movil-espacio" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="enc-movil">
      <button
        type="button"
        className="enc-movil-volver"
        onClick={() => navigate(rutaInicio)}
        aria-label={`Volver a ${nombreInicio}`}
      >
        <span className="material-icons">arrow_back</span>
        <span className="enc-movil-volver-texto">{nombreInicio}</span>
      </button>
      <div className="enc-movil-titulo">
        {seccion?.icono && <span className="material-icons">{seccion.icono}</span>}
        <strong>{seccion?.nombre || 'Sección'}</strong>
      </div>
      <button type="button" className="enc-movil-boton" onClick={onMenu} aria-label="Abrir menú">
        <span className="material-icons">menu</span>
      </button>
    </div>
  );
};

/** Barra de "migas" en la PC: ← Volver al panel · Panel › Sección */
export const MigasPanel = ({ secciones, rutaInicio, nombreInicio, ocultarEn = [] }) => {
  const { pathname } = useLocation();
  const { enInicio, seccion } = useSeccionActual(secciones, rutaInicio);
  if (enInicio || ocultarEn.some((r) => pathname.startsWith(r))) return null;

  return (
    <nav className="enc-migas" aria-label="Ubicación">
      <Link to={rutaInicio} className="enc-migas-volver">
        <span className="material-icons">arrow_back</span>
        {/^mi /i.test(nombreInicio) ? `Volver a ${nombreInicio}` : `Volver al ${nombreInicio.toLowerCase()}`}
      </Link>
      <span className="enc-migas-ruta">
        <Link to={rutaInicio}>{nombreInicio}</Link>
        <span className="material-icons" aria-hidden="true">chevron_right</span>
        <strong>
          {seccion?.icono && <span className="material-icons">{seccion.icono}</span>}
          {seccion?.nombre || 'Sección'}
        </strong>
      </span>
    </nav>
  );
};
