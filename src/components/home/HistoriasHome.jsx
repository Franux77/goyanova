import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import VisorHistorias from '../ListaPerfilesYDetalles/perfil/VisorHistorias';
import './HistoriasHome.css';

const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const palabras = nombre.trim().split(/\s+/);
  return palabras.slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
};

const HistoriasHome = () => {
  const [reels, setReels] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [indiceAbierto, setIndiceAbierto] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase.rpc('listar_reels_activos');
      if (!error) setReels(data || []);
      setCargando(false);
    };
    cargar();
  }, []);

  if (cargando || reels.length === 0) return null;

  return (
    <>
      <div className="historiashome-container">
        <div className="historiashome-scroll">
          {reels.map((r, i) => (
            <button
              key={r.reel_id}
              className="historiashome-item"
              onClick={() => setIndiceAbierto(i)}
            >
              <div className="historiashome-anillo">
                {r.foto_portada ? (
                  <img src={r.foto_portada} alt={r.servicio_nombre} />
                ) : (
                  <div className="historiashome-iniciales">
                    {getIniciales(r.servicio_nombre)}
                  </div>
                )}
              </div>
              <span className="historiashome-nombre">
                {r.servicio_nombre?.length > 12
                  ? r.servicio_nombre.slice(0, 11) + '…'
                  : r.servicio_nombre}
              </span>
            </button>
          ))}
        </div>
      </div>

      {indiceAbierto !== null && (
        <VisorHistorias
          reels={reels}
          indiceInicial={indiceAbierto}
          onClose={() => setIndiceAbierto(null)}
        />
      )}
    </>
  );
};

export default HistoriasHome;