// El término culto solo acompaña a los dos formatos cuyo nombre claro se queda
// corto; "Novelette" y "Nouvelle" como etiqueta principal no los reconoce el
// lector, así que van de subtítulo o no van.
const SUBTITLES: Record<string, string> = {
  'Relato largo': 'novelette',
  'Novela corta': 'nouvelle',
};

export function formatSubtitle(format: string | null): string | null {
  return (format && SUBTITLES[format]) ?? null;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
