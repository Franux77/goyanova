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
      // Si no hay perfil todavía, no generar saludo
      if (!perfil?.nombre) return;
      
      const ahora = new Date();
      const hora = ahora.getHours();
      const nombre = perfil.nombre;
      
      // Crear una clave única que cambia cada 3 horas
      const bloqueHorario = Math.floor(hora / 3);
      const fechaActual = ahora.toDateString();
      const claveAlmacenamiento = `saludo_${nombre}_${fechaActual}_${bloqueHorario}`;
      
      // Verificar si ya hay un saludo guardado para este bloque horario
      const saludoGuardado = localStorage.getItem(claveAlmacenamiento);
      
      if (saludoGuardado) {
        setSaludo(JSON.parse(saludoGuardado));
        return;
      }

      let saludos = [];

      if (hora >= 0 && hora < 6) {
        // Madrugada (00:00 - 05:59)
        saludos = [
          { principal: `¿Qué hacés despierto, ${nombre}?`, secundario: 'Es re tarde ya' },
          { principal: `Buenas noches, ${nombre}`, secundario: 'O buenos días, quién sabe a esta hora' },
          { principal: `Hola ${nombre}`, secundario: 'Los búhos andan sueltos por acá' },
          { principal: `¿Trasnochando, ${nombre}?`, secundario: 'Bancá que viene el sueño' },
          { principal: `Che ${nombre}`, secundario: '¿anda buscando algo?' },
          { principal: `Che ${nombre}`, secundario: '¿No deberías estar durmiendo?' },
          { principal: `Es de madrugada, ${nombre}`, secundario: 'Modo noctámbulo activado' },
          { principal: `Mirá la hora, ${nombre}`, secundario: 'Pero bueno, busca lo necesario' },
          { principal: `¿Todo bien ${nombre}?`, secundario: 'Es medio tarde para estar por acá' },
          { principal: `Buenas ${nombre}`, secundario: 'Aunque no sé qué tan buenas a esta hora' }
        ];
      } else if (hora >= 6 && hora < 12) {
        // Mañana (06:00 - 11:59)
        saludos = [
          { principal: `¡Buen día, ${nombre}!`, secundario: 'Arrancamos con todo' },
          { principal: `¡Buenos días, ${nombre}!`, secundario: '¿Ya tomaste mate?' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Que sea un buen día' },
          { principal: `¡Qué tal, ${nombre}!`, secundario: 'Linda mañana para empezar' },
          { principal: `¡Dale ${nombre}!`, secundario: 'A romperla hoy' },
          { principal: `¡Ey ${nombre}!`, secundario: 'Arrancamos con la mejor' },
          { principal: `¡Hola de nuevo, ${nombre}!`, secundario: 'Listo para el día' },
          { principal: `¡Che ${nombre}!`, secundario: 'A darle con ganas hoy' },
          { principal: `¡Buenas ${nombre}!`, secundario: 'El día está para aprovechar' },
          { principal: `¿Como va ${nombre}?`, secundario: 'Arrancó la jornada' }
        ];
      } else if (hora >= 12 && hora < 19) {
        // Tarde (12:00 - 18:59)
        saludos = [
          { principal: `¡Buenas tardes, ${nombre}!`, secundario: '¿Cómo va el día?' },
          { principal: `¡Hola ${nombre}!`, secundario: 'Ya pasó medio día' },
          { principal: `¡Qué tal, ${nombre}!`, secundario: 'La tarde está tranqui' },
          { principal: `¡Ey ${nombre}!`, secundario: 'Seguimos en la lucha' },
          { principal: `¡Che ${nombre}!`, secundario: '¿Todo bien por ahí?' },
          { principal: `¡Buenas ${nombre}!`, secundario: 'A full con la tarde' },
          { principal: `¡Hola de vuelta, ${nombre}!`, secundario: 'La tarde vuela' },
          { principal: `¡Qué onda ${nombre}!`, secundario: 'Seguimos activos' },
          { principal: `¡Dale ${nombre}!`, secundario: 'Falta poco para la noche' },
          { principal: `¡Epa ${nombre}!`, secundario: 'La tarde está buena' }
        ];
      } else {
        // Noche (19:00 - 23:59)
        saludos = [
          { principal: `¡Buenas noches, ${nombre}!`, secundario: 'Hora de relajar' },
          { principal: `¡Hola ${nombre}!`, secundario: 'La noche es joven todavía' },
          { principal: `¡Qué tal, ${nombre}!`, secundario: '¿Cómo estuvo el día?' },
          { principal: `¡Ey ${nombre}!`, secundario: 'Llegó la noche' },
          { principal: `¡Che ${nombre}!`, secundario: 'A disfrutar la noche' },
          { principal: `¡Buenas ${nombre}!`, secundario: 'Ya cayó el sol' },
          { principal: `¡Hola de nuevo, ${nombre}!`, secundario: 'La noche pinta bien' },
          { principal: `¡Qué onda ${nombre}!`, secundario: 'Momento de descansar' },
          { principal: `¡Dale ${nombre}!`, secundario: 'Termina el día tranqui' },
          { principal: `¡Dale ${nombre}!`, secundario: 'A cerrar el día con onda' }
        ];
      }

      // Seleccionar uno aleatorio
      const saludoSeleccionado = saludos[Math.floor(Math.random() * saludos.length)];
      
      // Guardar en localStorage para este bloque horario
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(saludoSeleccionado));
      
      // Limpiar saludos viejos (más de 24 horas)
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

  // Saludo para usuarios sin login
  const saludosSinLogin = [
    { principal: '¡Bienvenido!', secundario: 'Unite a GoyaNova' },
    { principal: '¡Hola!', secundario: 'Iniciá sesión para mejorar tu experiencia' },
    { principal: '¡Qué tal!', secundario: 'Entrá para poder disfrutar de más funciones' }
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