import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import './SaludoUsuario.css';

// Coordenadas de Goya, Corrientes (fijas, así no hace falta pedirle geolocalización al usuario)
const LAT_GOYA = -29.1382;
const LON_GOYA = -59.266;

// Cuánto tiempo guardamos el clima en caché antes de volver a pedirlo (30 minutos)
const CLIMA_CACHE_MS = 30 * 60 * 1000;
const CLAVE_CACHE_CLIMA = 'goyanova_clima_cache';

/**
 * Traduce el weather_code (estándar WMO) que devuelve Open-Meteo
 * a una categoría simple que podemos usar en los mensajes.
 */
const categorizarClima = (weatherCode) => {
  if ([95, 96, 99].includes(weatherCode)) return 'tormenta';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'lluvia';
  if ([45, 48].includes(weatherCode)) return 'niebla';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'nieve'; // rarísimo en Goya, pero por las dudas
  if ([1, 2, 3].includes(weatherCode)) return 'nublado';
  return 'despejado'; // weather_code 0
};

const categorizarTemperatura = (temp) => {
  if (temp >= 34) return 'calor_extremo';
  if (temp >= 28) return 'calor';
  if (temp >= 18) return 'templado';
  return 'fresco';
};

/**
 * Pide el clima actual a Open-Meteo (API gratuita, sin API key ni límite
 * para este volumen de uso: https://open-meteo.com).
 * Usa caché en localStorage para no pedirlo de más, y nunca rompe el saludo
 * si algo falla: ante cualquier error devuelve null y seguimos con el saludo de siempre.
 */
const obtenerClimaActual = async () => {
  try {
    const cacheGuardado = localStorage.getItem(CLAVE_CACHE_CLIMA);

    if (cacheGuardado) {
      const { data, timestamp } = JSON.parse(cacheGuardado);
      if (Date.now() - timestamp < CLIMA_CACHE_MS) {
        return data;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT_GOYA}&longitude=${LON_GOYA}&current=temperature_2m,weather_code&timezone=America%2FArgentina%2FBuenos_Aires`;
    const respuesta = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!respuesta.ok) return null;

    const json = await respuesta.json();
    const actual = json?.current;
    if (!actual || typeof actual.temperature_2m !== 'number') return null;

    const data = {
      temperatura: actual.temperature_2m,
      condicion: categorizarClima(actual.weather_code),
      temperaturaCategoria: categorizarTemperatura(actual.temperature_2m)
    };

    localStorage.setItem(CLAVE_CACHE_CLIMA, JSON.stringify({ data, timestamp: Date.now() }));

    return data;
  } catch (error) {
    // Sin internet, timeout, o cualquier otro problema: seguimos sin clima, no rompemos nada
    console.warn('No se pudo obtener el clima:', error);
    return null;
  }
};

/**
 * Devuelve frases alternativas de "secundario" con onda climática,
 * o null si el clima no aporta nada especial (ej: nublado y templado, sin nada para destacar).
 */
const obtenerSecundarioClima = (clima) => {
  if (!clima) return null;

  const { condicion, temperaturaCategoria, temperatura } = clima;
  const tempRedondeada = Math.round(temperatura);

  if (condicion === 'tormenta') {
    return [
      'Hay tormenta por Goya, quedate resguardado y navegá tranqui desde acá',
      'Truena feo afuera, aprovechá para resolver todo desde adentro'
    ];
  }

  if (condicion === 'lluvia') {
    return [
      'Está lloviendo, día perfecto para resolver todo desde el celular',
      'Con este día de lluvia, quedate cómodo y buscá lo que necesites acá'
    ];
  }

  if (condicion === 'niebla') {
    return ['Amaneció con niebla en Goya, si salís andá con cuidado'];
  }

  if (temperaturaCategoria === 'calor_extremo') {
    return [
      `Estamos a ${tempRedondeada}°, un embole de calor. Quedate fresquito acá adentro`,
      'Día de horno en Goya, mejor resolvé todo sin salir al rayo del sol'
    ];
  }

  if (temperaturaCategoria === 'calor') {
    return [
      `Van ${tempRedondeada}° y pica el sol, aprovechá la sombra virtual`,
      'Día caluroso, ideal para buscar todo tranquilo desde la sombra'
    ];
  }

  if (temperaturaCategoria === 'fresco') {
    return [
      `Refrescó, estamos a ${tempRedondeada}°. Abrigate si salís`,
      'Bajaron las temperaturas, buen día para quedarte buscando cositas'
    ];
  }

  if (condicion === 'despejado') {
    return [
      'Día despejado en Goya, ideal para aprovechar y ver las novedades',
      'Cielo limpio hoy, buen momento para chusmear el sitio'
    ];
  }

  return null; // nublado y templado: dejamos el saludo de siempre, sin forzar nada
};

const SaludoUsuario = () => {
  const { user, perfil, loading } = useAuth();
  const navigate = useNavigate();
  const [saludo, setSaludo] = useState({ principal: '', secundario: '' });

  useEffect(() => {
    const generarSaludo = async () => {
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
        try {
          setSaludo(JSON.parse(saludoGuardado));
          return;
        } catch (error) {
          // Caché corrupto: seguimos de largo y generamos un saludo nuevo
          console.warn('Caché de saludo corrupto, se descarta:', error);
        }
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

      let saludoSeleccionado = saludos[Math.floor(Math.random() * saludos.length)];

      // Sumamos un toque de clima real. Si la API falla o tarda, seguimos con el saludo de siempre
      const clima = await obtenerClimaActual();
      const opcionesClima = obtenerSecundarioClima(clima);
      if (opcionesClima && opcionesClima.length > 0) {
        // 65% de las veces usamos la frase con clima, para no perder la variedad de las de siempre
        if (Math.random() < 0.65) {
          const secundarioClima = opcionesClima[Math.floor(Math.random() * opcionesClima.length)];
          saludoSeleccionado = { ...saludoSeleccionado, secundario: secundarioClima };
        }
      }

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

  // Saludos neutrales para gente sin cuenta.
  // Se eligen una sola vez por carga de página (useMemo), así el texto no
  // te cambia solo si el componente se vuelve a renderizar por otro motivo.
  const saludoSinLogin = useMemo(() => {
    const saludosSinLogin = [
      { principal: '¡Buenas!', secundario: 'Entrá a tu cuenta para ver todo completo' },
      { principal: '¡Hola!', secundario: 'Si iniciás sesión tenés más funciones' },
      { principal: '¡Bienvenido!', secundario: 'Unite a GoyaNova cuando quieras' }
    ];
    return saludosSinLogin[Math.floor(Math.random() * saludosSinLogin.length)];
  }, []);

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