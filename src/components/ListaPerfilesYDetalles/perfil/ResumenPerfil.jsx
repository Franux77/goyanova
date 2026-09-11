import React, { useState, useEffect, useContext } from 'react';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import MenuOpciones from './MenuOpciones';
import ModalReporte from './ModalReporte';
import ModalAvisoLogin from './ModalAvisoLogin';
import VisorHistorias from './VisorHistorias';
import { AuthContext } from '../../../auth/AuthContext';
import { supabase } from '../../../utils/supabaseClient';
import { getNivelWhatsapp } from '../../../utils/whatsappPlan';
import EstadoActividad from './EstadoActividad';
import './ResumenPerfil.css';

const coloresSuaves = [
  '#e3f2fd', '#e8f5e9', '#f3e5f5', '#fff9c4', '#ffe0b2', '#e1bee7', '#b2dfdb'
];

const getColorAleatorio = () =>
  coloresSuaves[Math.floor(Math.random() * coloresSuaves.length)];

const getIniciales = (texto) => {
  if (!texto) return '?';
  const palabras = texto.split(' ');
  if (palabras.length === 1) return palabras[0][0].toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
};

const ResumenPerfil = ({ perfil }) => {
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [descripcionExpandida, setDescripcionExpandida] = useState(false);
  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;

  // 🆕 Reel activo de este servicio (si tiene uno vigente)
  const [reelActivo, setReelActivo] = useState(null);
  const [mostrarVisor, setMostrarVisor] = useState(false);

  useEffect(() => {
    if (!perfil?.id) return;

    const cargarReel = async () => {
      const { data } = await supabase
        .from('reels_servicio')
        .select('id, video_url')
        .eq('servicio_id', perfil.id)
        .eq('activo', true)
        .gt('expira_en', new Date().toISOString())
        .order('publicado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      setReelActivo(data || null);
    };

    cargarReel();
  }, [perfil?.id]);

  if (!perfil) return null;

  const handleReportarClick = () => {
    if (!isLoggedIn) {
      setModalLoginAbierto(true);
      return;
    }
    setModalReporteAbierto(true);
  };

  const rating = perfil.opiniones?.length
    ? Math.round(perfil.opiniones.reduce((sum, o) => sum + (o.rating || 0), 0) / perfil.opiniones.length)
    : 0;

  const estrellas = Array.from({ length: rating }, (_, i) => (
    <FaStar key={i} color="#ffc107" size={16} />
  ));

  const foto = perfil.foto_portada || '';
  const descripcion = perfil.descripcion || 'Sin descripción';
  const mostrarVerMas = descripcion.length > 120;

  const whatsappNumero = perfil.contacto_whatsapp || '549000000000';
  const mensajePredefinido = perfil.whatsapp_mensaje_personalizado?.trim();
  const contactoUrl = mensajePredefinido
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensajePredefinido)}`
    : `https://wa.me/${whatsappNumero}`;
    const nivelWsp = getNivelWhatsapp(perfil.badge_texto);

  const handleCompartir = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: perfil.nombre,
          text: `Mira este servicio: ${perfil.nombre}`,
          url: url
        });
      } catch (err) {
        console.error('Error al compartir:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles');
    }
  };

  return (
    <>
      {perfil.badge_texto === 'Elite' && (
        <div className="resumen-banner-elite">
          <span className="material-icons">workspace_premium</span>
          <span>Prestador Elite de GoyaNova</span>
        </div>
      )}

      <div className="resumen-lista">
        <MenuOpciones
          onReportar={handleReportarClick}
          onCompartir={handleCompartir}
          tipo="servicio"
        />

        {perfil.es_premium && perfil.badge_texto && (
          <div className="resumen-badge-premium-perfil">
            <span className="material-icons resumen-badge-star-icon">star</span>
            <span className="resumen-badge-label">{perfil.badge_texto}</span>
          </div>
        )}

        {/* 🆕 Foto con anillo clickeable si hay historia activa */}
        {foto ? (
          <div
            className={`resumen-foto-wrapper ${reelActivo ? 'con-historia' : ''}`}
            onClick={() => reelActivo && setMostrarVisor(true)}
          >
            <img src={foto} alt={perfil.nombre} className="resumen-foto-perfil" />
            {reelActivo && (
              <span className="resumen-historia-badge">
                <span className="material-icons">play_circle</span>
                Ver historia
              </span>
            )}
          </div>
        ) : (
          <div
            className={`resumen-placeholder-perfil ${reelActivo ? 'con-historia' : ''}`}
            style={{ backgroundColor: getColorAleatorio() }}
            onClick={() => reelActivo && setMostrarVisor(true)}
          >
            {getIniciales(perfil.nombre)}
            {reelActivo && (
              <span className="resumen-historia-badge">
                <span className="material-icons">play_circle</span>
                Ver historia
              </span>
            )}
          </div>
        )}

        <div className="resumen-contenido-perfil">
                    <h2 className="resumen-titulo-perfil">
            <span className="resumen-titulo-texto">{perfil.nombre}</span>
            {perfil.es_premium && perfil.badge_texto && (
              <span className="material-icons insignia-verificado-resumen" title="Cuenta verificada">verified</span>
            )}
          </h2>
                    <EstadoActividad
            ultimaActividad={perfil.usuario?.ultima_actividad}
            esPremium={perfil.es_premium}
          />

          <div>
            <p className={`resumen-descripcion-perfil ${descripcionExpandida ? 'expanded' : ''}`}>
              {descripcion}
            </p>
            {!descripcionExpandida && mostrarVerMas && (
              <div className="resumen-gradient-descripcion"></div>
            )}
            {mostrarVerMas && (
              <button
                className="resumen-ver-mas-btn"
                onClick={() => setDescripcionExpandida(!descripcionExpandida)}
              >
                {descripcionExpandida ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>

          <div className="resumen-estrellas-perfil">{estrellas}</div>

          {perfil.mostrar_boton_whatsapp && (
            <a
              href={contactoUrl}
              target="_blank"
              rel="noreferrer"
                            className={`resumen-btn-contacto ${nivelWsp ? `resumen-btn-contacto-${nivelWsp}` : ''}`}
                            onClick={async () => {
                const { error } = await supabase.rpc('registrar_evento_servicio', {
                  p_servicio_id: perfil.id,
                  p_tipo: 'clic_whatsapp'
                });
                if (error) console.error('Error al registrar clic WhatsApp:', error);
              }}
            >
              <FaWhatsapp /> Contactar
            </a>
          )}
        </div>
      </div>

      {/* 🆕 Visor de historia, solo si el usuario tocó "Ver historia" */}
      {mostrarVisor && reelActivo && (
        <VisorHistorias
          reels={[{
            reel_id: reelActivo.id,
            servicio_id: perfil.id,
            servicio_nombre: perfil.nombre,
            video_url: reelActivo.video_url
          }]}
          indiceInicial={0}
          onClose={() => setMostrarVisor(false)}
        />
      )}

      <ModalReporte
        isOpen={modalReporteAbierto}
        onClose={() => setModalReporteAbierto(false)}
        tipoContenido="servicio"
        contenidoId={perfil.id}
        servicioId={perfil.id}
        nombreServicio={perfil.nombre}
      />

      <ModalAvisoLogin
        isOpen={modalLoginAbierto}
        onClose={() => setModalLoginAbierto(false)}
        mensaje="Pedimos que inicies sesión para reportar contenido: así evitamos reportes falsos o coordinados, y nos aseguramos de que cada aviso venga de una persona real. Esto protege a los negocios de la comunidad de denuncias maliciosas."
      />
    </>
  );
};

export default ResumenPerfil;