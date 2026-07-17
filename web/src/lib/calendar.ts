export interface ReleaseInput {
  firstChapterAt: string | null; // ISO del capítulo 1, si la historia ya empezó
  releaseWindow: string | null;  // texto libre de Notion: "Finales de 2027"
}

// Notion deja la fecha sin hora cuando el autor no la especifica ("2026-07-06").
// JavaScript la lee como medianoche UTC, y al mostrarla en Panamá (UTC-5)
// retrocede al día anterior. Se ancla al mediodía de Panamá: la fecha que el
// autor escribió es la que el lector ve.
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function parseFecha(iso: string): Date {
  return new Date(SOLO_FECHA.test(iso) ? `${iso}T12:00:00-05:00` : iso);
}

// Cascada deliberada: el hecho (una fecha real de publicación) gana a la
// promesa (la ventana que escribió el autor), y si no hay ninguna de las dos no
// se inventa nada.
export function releaseLabel({ firstChapterAt, releaseWindow }: ReleaseInput): string | null {
  if (firstChapterAt) {
    const d = parseFecha(firstChapterAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Panama',
      });
    }
  }
  return releaseWindow || null;
}

// El momento del próximo capítulo programado, ya formateado. El autor publica a
// las 7 PM hora de Panamá, y el locale español escribe esa franja como
// "7:00 p. m." — ruido en una línea de metadatos.
//
// Se arma pieza a pieza en vez de limpiar el texto ya montado: cada versión de
// ICU puntúa y espacia distinto ("p. m.", "p.m.", con espacios finos), y esto
// lo compila una máquina (Cloudflare) que no es la que corre los tests. Un
// `replace` sobre el texto final pasaba en CI y fallaba en producción.
export function nextChapterLabel(iso: string): string | null {
  const d = parseFecha(iso);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat('es', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Panama',
  }).formatToParts(d);
  const p = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((x) => x.type === tipo)?.value.replace('.', '') ?? '';
  const franja = p('dayPeriod').toLowerCase().startsWith('a') ? 'AM' : 'PM';
  return `${p('weekday')} ${p('day')} ${p('month')} · ${p('hour')}:${p('minute')} ${franja}`;
}

// La fase se anuncia con su número, como Marvel: "FASE I". El número sale de
// la posición de la fase en el orden, no de un campo de Notion: el autor ya
// ordena con "Orden" y no debe mantener dos números en sincronía. Llega hasta
// XX, de sobra para las fases que un autor va a tener; por encima devuelve el
// número tal cual en vez de mentir.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

export function romanNumeral(n: number): string {
  return ROMAN[n] ?? String(n);
}
