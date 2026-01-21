import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import './SaludoUsuario.css';

const SaludoUsuario = () => {
  const { user, perfil, loading } = useAuth();
  const navigate = useNavigate();
  const [saludo, setSaludo] = useState({ principal: '', secundario: '' });

  useEffect(() => {
    const generarSaludo = () => {
      if (!perfil?.nombre) return;
      
      const ahora = new Date();
      const hora = ahora.getHours();
      const nombre = perfil.nombre;
      
      // Clave única por bloque de 3 horas para no marear al usuario cambiando a cada rato
      const bloqueHorario = Math.floor(hora / 3);
      const fechaActual = ahora.toDateString();
      const claveAlmacenamiento = `saludo_${nombre}_${fechaActual}_${bloqueHorario}`;
      
      const saludoGuardado = localStorage.getItem(claveAlmacenamiento);
      
      if (saludoGuardado) {
        setSaludo(JSON.parse(saludoGuardado));
        return;
      }

      let saludos = [];

      // BLOQUE 1: MADRUGADA (00:00 a 05:59)
      if (hora >= 0 && hora < 6) {
        saludos = [
          { principal: `Che, ${nombre}`, secundario: 'A esta hora hay menos tráfico, navegá tranqui' },
          { principal: `Buenas noches, ${nombre}`, secundario: 'O buenos días, ya ni se sabe' },
          { principal: `Hola ${nombre}`, secundario: 'El sitio es todo tuyo a esta hora' },
          { principal: `¿Desvelo, ${nombre}?`, secundario: 'Buscá lo que necesites sin apuro' },
          { principal: `Buenas, ${nombre}`, secundario: 'Silencio absoluto, ideal para leer' },
          { principal: `Epa, ${nombre}`, secundario: 'Acá seguimos de guardia para vos' }
        ];
      } 
      // BLOQUE 2: MAÑANA (06:00 a 12:59) - Hasta la hora de comer
      else if (hora >= 6 && hora < 13) {
        saludos = [
          { principal: `¡Buen día, ${nombre}!`, secundario: 'Unos mates y arrancamos con todo' },
          { principal: `Buenas, ${nombre}`, secundario: 'Tenés todo el día por delante' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Fijate las novedades de hoy' },
          { principal: `Arriba, ${nombre}`, secundario: 'Acá tenés todo listo para empezar' },
          { principal: `¡Qué tal, ${nombre}!`, secundario: 'Linda mañana para encontrar lo que buscás' },
          { principal: `Dale ${nombre}`, secundario: 'Ponete cómodo que hay mucho para ver' }
        ];
      } 
      // BLOQUE 3: TARDE (13:00 a 20:59) - Horario extendido por verano/Goya
      else if (hora >= 13 && hora < 21) {
        saludos = [
          { principal: `Buenas tardes, ${nombre}`, secundario: 'Buscá tranqui, sin apuro' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Ideal para chusmear un poco la web' },
          { principal: `Che, ${nombre}`, secundario: 'Esquivando el calor, quedate por acá' },
          { principal: `Todo tranqui, ${nombre}`, secundario: 'Aprovechá y mirá lo último que subimos' },
          { principal: `¡Buenas, ${nombre}!`, secundario: 'Todavía queda día, aprovechalo' },
          { principal: `¡Epa ${nombre}!`, secundario: 'Acá estamos firmes, buscá lo que quieras' },
          { principal: `Hola de nuevo, ${nombre}`, secundario: 'Seguimos activos por acá' }
        ];
      } 
      // BLOQUE 4: NOCHE (21:00 a 23:59) - Cuando ya refrescó
      else {
        saludos = [
          { principal: `Buenas noches, ${nombre}`, secundario: 'Por fin aflojó el calor, relajate acá' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Cerrando el día en GoyaNova' },
          { principal: `¡Che ${nombre}!`, secundario: 'Antes de dormir, pegale una mirada a esto' },
          { principal: `Buenas, ${nombre}`, secundario: 'Momento de relax y navegación' },
          { principal: `Todo bien, ${nombre}`, secundario: 'Desconectá de todo, conectá con esto' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Ya es hora de bajar un cambio' }
        ];
      }

      const saludoSeleccionado = saludos[Math.floor(Math.random() * saludos.length)];
      
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(saludoSeleccionado));
      
      // Limpieza de caché viejo
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('saludo_') && key !== claveAlmacenamiento) {
          const partes = key.split('_');
          const fechaKey = partes[partes.length - 2];
          if (fechaKey !== fechaActual) {
            localStorage.removeItem(key);
          }
        }
      });
      
      setSaludo(saludoSeleccionado);
    };

    if (!loading && perfil?.nombre) {
      generarSaludo();
    }
  }, [perfil, loading]);

  // Saludos neutrales para gente sin cuenta
  const saludosSinLogin = [
    { principal: '¡Buenas!', secundario: 'Entrá a tu cuenta para ver todo completo' },
    { principal: '¡Hola!', secundario: 'Si iniciás sesión tenés más funciones' },
    { principal: '¡Bienvenido!', secundario: 'Unite a GoyaNova cuando quieras' }
  ];

  const saludoSinLogin = saludosSinLogin[Math.floor(Math.random() * saludosSinLogin.length)];

  return (
    <div className="saludo-wrapper fade-in">
      <div className="saludo-texto">
        {loading ? (
          <div className="spinner"></div>
        ) : user && perfil ? (
          <>
            <h2>{saludo.principal}</h2>
            <p>{saludo.secundario}</p>
          </>
        ) : (
          <>
            <h2>{saludoSinLogin.principal}</h2>
            <p>{saludoSinLogin.secundario}</p>
            <button
              className="login-buttonn"
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SaludoUsuario;