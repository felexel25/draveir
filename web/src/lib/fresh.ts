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
