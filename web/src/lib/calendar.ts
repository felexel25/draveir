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

// El momento del próximo capítulo programado, ya formateado. El autor publica
// a las 7 PM hora de Panamá. El locale español escribe "7:00 p. m.", que en
// una línea de metadatos se lee como ruido. Se normaliza a la forma corta.
export function nextChapterLabel(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const TZ = 'America/Panama';
  const dia = d.toLocaleDateString('es', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
  });
  const hora = d
    .toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
    .replace('p. m.', 'PM')
    .replace('a. m.', 'AM');
  return `${dia.replace(',', '')} · ${hora}`;
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
