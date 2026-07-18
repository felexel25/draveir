// Un capítulo es "nuevo" mientras su publicación sea reciente: menos de `days`
// días atrás. La ventana se mide contra un `now` inyectado (la hora del build)
// para que sea testeable y determinista. Un capítulo con fecha futura o ilegible
// no es nuevo: nunca se inventa frescura.
const DIA_MS = 24 * 60 * 60 * 1000;

export function isFresh(publishedAt: string, now: Date, days = 3): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  const edad = now.getTime() - t;
  return edad >= 0 && edad < days * DIA_MS;
}

// Panamá es UTC-05:00 sin horario de verano (ver release-schedule).
const PANAMA_OFFSET_MS = 5 * 60 * 60 * 1000;

// "hoy" / "ayer" / "hace N días" por DÍA DE CALENDARIO en Panamá, no por bloques
// de 24h: un capítulo de ayer 7 PM visto hoy a las 10 AM dice "ayer", no "hoy".
// Fecha ilegible → cadena vacía (el llamador decide el respaldo).
export function relativeDayLabel(publishedAt: string, now: Date): string {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return '';
  const dia = (ms: number) => Math.floor((ms - PANAMA_OFFSET_MS) / DIA_MS);
  const diff = dia(now.getTime()) - dia(t);
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff} días`;
}
