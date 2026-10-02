// GoyaNova - Limpia el texto que escribe el usuario.
// Quita emojis/símbolos gráficos, caracteres de control, invisibles, de dirección de texto
// y acentos apilados ("Zalgo"). Es la misma regla que aplica la base de datos (limpiar_texto).
// No recorta espacios al final para no molestar mientras se escribe: usar .trim() al enviar.

const EMOJIS =
  /[\u{1F000}-\u{1FAFF}\u{E0000}-\u{E007F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{A9}\u{AE}]/gu;

const INVISIBLES =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­͏̀-ͯ؜ᅟᅠ឴឵᠋-᠎​‌‎‏‪-‮⁠-⁯ㅤ︎﻿ﾠ￰-￿]/g;

export const limpiarTexto = (texto) => {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFC')
    .replace(EMOJIS, '')
    .replace(INVISIBLES, '')
    .replace(/(\r?\n){3,}/g, '\n\n');
};

export const tieneEmojis = (texto) =>
  typeof texto === 'string' && (EMOJIS.lastIndex = 0, EMOJIS.test(texto));
