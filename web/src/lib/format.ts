// El término culto solo acompaña a los dos formatos cuyo nombre claro se queda
// corto; "Novelette" y "Nouvelle" como etiqueta principal no los reconoce el
// lector, así que van de subtítulo o no van.
// Map en vez de objeto literal: el formato viene de un select de Notion (entrada
// externa) y un objeto literal hereda de Object.prototype, así que
// SUBTITLES['toString'] devolvería la función en vez de undefined.
const SUBTITLES = new Map<string, string>([
  ['Relato largo', 'novelette'],
  ['Novela corta', 'nouvelle'],
]);

export function formatSubtitle(format: string | null): string | null {
  return (format && SUBTITLES.get(format)) ?? null;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
