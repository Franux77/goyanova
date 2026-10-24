// Números de WhatsApp: limpieza, validación y armado del enlace.
//
// En Argentina un celular para WhatsApp es: 54 + 9 + código de área (sin el 0) +
// número (sin el 15). Siempre son 10 dígitos después del "549".
// La gente suele escribir "03777 15 412345", "3777412345", "15412345" o solo
// "412345". Acá se entiende todo eso y se arma el número correcto.

export const CODIGO_AREA_GOYA = '3777';

const soloDigitos = (texto) => String(texto || '').replace(/\D/g, '');

// Saca el 15 que va después del código de área (2, 3 o 4 dígitos)
const sacarQuince = (num) => {
  for (const largoArea of [4, 3, 2]) {
    if (num.slice(largoArea, largoArea + 2) === '15') {
      const sinQuince = num.slice(0, largoArea) + num.slice(largoArea + 2);
      if (sinQuince.length === 10) return sinQuince;
    }
  }
  return null;
};

/** Muestra un número nacional de 10 dígitos de forma legible: "3777 41-2345" */
export const formatearNacional = (nacional) => {
  if (!nacional || nacional.length !== 10) return nacional || '';
  // Buenos Aires: 11 + 8 dígitos
  if (nacional.startsWith('11')) {
    return `11 ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  }
  const area = nacional.slice(0, 4);
  const local = nacional.slice(4);
  return `${area} ${local.slice(0, 2)}-${local.slice(2)}`;
};

/**
 * Analiza lo que la persona escribió (número de Argentina).
 * Devuelve:
 *  - valido: si ya es un número completo
 *  - numero: el número listo para guardar ("549" + 10 dígitos), solo si es válido
 *  - visible: cómo se va a ver ("+54 9 3777 41-2345")
 *  - aviso: qué se corrigió solo (para contarle a la persona)
 *  - error: qué falta o sobra (texto corto y claro)
 */
export const analizarWhatsapp = (entrada) => {
  let num = soloDigitos(entrada);
  const avisos = [];

  if (!num) return { valido: false, numero: '', visible: '', aviso: '', error: '' };

  // Prefijo internacional y de país
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('549')) num = num.slice(3);
  else if (num.startsWith('54') && num.length >= 12) num = num.slice(2);

  // El 0 del código de área no va
  if (num.startsWith('0')) {
    num = num.replace(/^0+/, '');
    avisos.push('el 0');
  }

  // Número local de Goya escrito sin código de área
  if (num.length === 8 && num.startsWith('15')) {
    num = CODIGO_AREA_GOYA + num.slice(2);
    avisos.push('el 15');
    avisos.push('agregamos el 3777 de Goya');
  } else if (num.length === 6) {
    num = CODIGO_AREA_GOYA + num;
    avisos.push('agregamos el 3777 de Goya');
  }

  // El 15 después del código de área no va
  if (num.length === 12) {
    const sinQuince = sacarQuince(num);
    if (sinQuince) {
      num = sinQuince;
      avisos.push('el 15');
    }
  } else if (num.length === 11 && num.slice(4, 6) === '15') {
    // "3777 15 41234": tiene el 15 y además le falta un número
    num = num.slice(0, 4) + num.slice(6);
    avisos.push('el 15');
  }

  const quitados = avisos.filter((a) => a.startsWith('el '));
  const agregoGoya = avisos.includes('agregamos el 3777 de Goya');
  const aviso = [
    quitados.length ? `Sacamos ${quitados.join(' y ')}: para WhatsApp no van.` : '',
    agregoGoya ? 'Le agregamos el 3777 de Goya.' : '',
  ].filter(Boolean).join(' ');

  if (num.length < 10) {
    const faltan = 10 - num.length;
    return {
      valido: false,
      numero: '',
      visible: '',
      aviso,
      error: faltan === 1 ? 'Te falta 1 número' : `Te faltan ${faltan} números`,
      incompleto: true,
    };
  }

  if (num.length > 10) {
    const sobran = num.length - 10;
    return {
      valido: false,
      numero: '',
      visible: '',
      aviso,
      error: sobran === 1 ? 'Sobra 1 número. Revisalo' : `Sobran ${sobran} números. Revisalo`,
    };
  }

  return {
    valido: true,
    numero: `549${num}`,
    nacional: num,
    visible: `+54 9 ${formatearNacional(num)}`,
    aviso,
    error: '',
  };
};

/** Número de otro país: solo se valida el largo internacional (8 a 15 dígitos). */
export const analizarWhatsappInternacional = (entrada) => {
  const num = soloDigitos(entrada).replace(/^00/, '');
  if (!num) return { valido: false, numero: '', visible: '', error: '' };
  if (num.length < 8) return { valido: false, numero: '', visible: '', error: 'El número es muy corto', incompleto: true };
  if (num.length > 15) return { valido: false, numero: '', visible: '', error: 'El número es muy largo' };
  return { valido: true, numero: num, visible: `+${num}`, error: '' };
};

/**
 * Número listo para wa.me. Corrige los que se guardaron antes sin el 9
 * ("54" + 10 dígitos), que en algunos celulares no abren el chat.
 */
export const numeroParaWhatsapp = (guardado) => {
  const num = soloDigitos(guardado);
  if (num.startsWith('54') && !num.startsWith('549') && num.length === 12) {
    return `549${num.slice(2)}`;
  }
  return num;
};

export const enlaceWhatsapp = (guardado, mensaje) => {
  const base = `https://wa.me/${numeroParaWhatsapp(guardado)}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
};
