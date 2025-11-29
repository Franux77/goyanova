import React from 'react';
import './DisponibilidadPerfilRobusto.css';

const diasSemana = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const nombreDias = {
  lunes:'Lunes',martes:'Martes',miercoles:'Miércoles',jueves:'Jueves',
  viernes:'Viernes',sabado:'Sábado',domingo:'Domingo',
};

const DisponibilidadPerfilRobusto = ({ perfil }) => {
  const listaDisponibilidad = Array.isArray(perfil?.disponibilidad) ? perfil.disponibilidad : [];

  const normalizarDia = (dia) => dia?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,'') || '';

  const diasAgrupados = diasSemana.map(diaClave => {
    const turnosDia = listaDisponibilidad.filter(d => normalizarDia(d?.dia) === diaClave);
    return {
      dia: diaClave,
      turnos: turnosDia.map(t => ({
        desde: t?.hora_inicio?.slice(0,5) || '00:00',
        hasta: t?.hora_fin?.slice(0,5) || '00:00',
        tipo: t?.tipo || 'horario_fijo',
        mensaje: t?.mensaje || null,
        titulo: t?.titulo || null
      }))
    };
  });

  const getDiaClave = () => {
    const claves = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    return claves[new Date().getDay()];
  };

  const estaDisponibleAhora = () => {
    const hoy = diasAgrupados.find(d => d.dia === getDiaClave());
    if(!hoy || !hoy.turnos.length) return false;
    const ahora = new Date();
    const minutosAhora = ahora.getHours()*60 + ahora.getMinutes();

    return hoy.turnos.some(turno => {
      if(['whatsapp','no_disponible'].includes(turno.tipo)) return false;
      const [h1,m1] = turno.desde.split(':').map(Number);
      const [h2,m2] = turno.hasta.split(':').map(Number);
      const desde = h1*60 + m1;
      const hasta = h2*60 + m2;
      return minutosAhora >= desde && minutosAhora <= hasta;
    });
  };

  const renderEstado = () => {
    const activo = estaDisponibleAhora();
    const tipos = listaDisponibilidad.map(t => t.tipo);
    if(tipos.includes('whatsapp') || tipos.includes('no_disponible')) return null;

    return (
      <div className={`disponibilidad-estado-badge ${activo ? 'disponible':'no-disponible'}`}>
        <span className="material-icons disponibilidad-icono-estado">
          {activo ? 'check_circle' : 'cancel'}
        </span>
        {activo ? 'Disponible ahora':'Fuera de horario'}
      </div>
    );
  };

  const obtenerMensajesUnicos = () => {
    const seenTitulos = new Set();
    const seenMensajes = new Set();

    return listaDisponibilidad
      .filter(t => !['whatsapp','no_disponible'].includes(t.tipo))
      .filter(t => {
        const tituloKey = t.titulo || '__noTitulo__';
        const mensajeKey = t.mensaje || '__noMensaje__';

        if (!seenTitulos.has(tituloKey)) {
          seenTitulos.add(tituloKey);
          return true;
        }
        if (!t.titulo && !seenMensajes.has(mensajeKey)) {
          seenMensajes.add(mensajeKey);
          return true;
        }
        return false;
      });
  };

  return (
    <section className="disponibilidad-seccion-principal">
      <div className="disponibilidad-header-wrapper">
        <h3 className="disponibilidad-titulo-principal">
          <span className="material-icons disponibilidad-icono-titulo">schedule</span>
          Disponibilidad
        </h3>
        {renderEstado()}
      </div>

      <div className="disponibilidad-contenido-wrapper">
        {listaDisponibilidad.length === 0 && (
          <p className="disponibilidad-mensaje-vacio">No hay información de disponibilidad</p>
        )}

        {/* Mensajes especiales: whatsapp/no_disponible */}
        {listaDisponibilidad
          .filter(d => ['whatsapp','no_disponible'].includes(d.tipo))
          .map((d, idx) => (
            <div key={idx} className={`disponibilidad-mensaje-especial ${d.tipo}`}>
              <span className="material-icons disponibilidad-icono-especial">
                {d.tipo === 'whatsapp' ? 'phone' : 'block'}
              </span>
              {d.titulo || (d.tipo === 'whatsapp' ? 'Contactar por WhatsApp' : 'No disponible')}
            </div>
          ))
        }

        {/* Mensajes únicos de turnos/fijo/pedido */}
        {obtenerMensajesUnicos().map((t, idx) => (
          <div key={idx} className="disponibilidad-turno-card">
            {t.titulo && (
              <div className="disponibilidad-turno-titulo">
                <span className="material-icons disponibilidad-icono-turno">event</span>
                {t.titulo}
              </div>
            )}
            {t.mensaje && <div className="disponibilidad-turno-mensaje">{t.mensaje}</div>}
          </div>
        ))}

        {/* Tabla de horarios */}
        {diasAgrupados.some(d => d.turnos.some(t => !['whatsapp','no_disponible'].includes(t.tipo))) && (
          <table className="disponibilidad-tabla-horarios">
            <tbody>
              {diasAgrupados.map(dia => {
                const turnosVisibles = dia.turnos.filter(t => !['whatsapp','no_disponible'].includes(t.tipo));
                if(!turnosVisibles.length) return null;
                
                return (
                  <tr key={dia.dia} className={dia.dia === getDiaClave() ? 'dia-actual' : ''}>
                    <td>{nombreDias[dia.dia]}</td>
                    <td>
                      <div className="disponibilidad-turnos-container">
                        {turnosVisibles.map((t, i) => (
                          <span key={i} className="disponibilidad-turno-chip">
                            <span className="material-icons disponibilidad-icono-reloj">schedule</span>
                            {t.desde} - {t.hasta}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default DisponibilidadPerfilRobusto;