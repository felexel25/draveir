export interface HistoryEntry {
  novelSlug: string;
  chapterSlug: string;
  title: string;
  at: number;
}
export interface ReaderState {
  version: 1;
  favorites: string[];
  continueReading: Record<string, string>;
  // Posición de lectura por capítulo (`${novelSlug}/${chapterSlug}` → fracción 0..1).
  positions: Record<string, number>;
  history: HistoryEntry[];
  // Slugs de historias ocultas que el lector destapó en /invocacion.
  discovered: string[];
}

export const READER_KEY = 'draveir-reader';
const HISTORY_CAP = 50;

export function emptyState(): ReaderState {
  return { version: 1, favorites: [], continueReading: {}, positions: {}, history: [], discovered: [] };
}

export function parseState(raw: string | null): ReaderState {
  if (!raw) return emptyState();
  try {
    const o = JSON.parse(raw);
    if (!o || o.version !== 1) return emptyState();
    return {
      version: 1,
      favorites: Array.isArray(o.favorites) ? o.favorites : [],
      continueReading:
        o.continueReading && typeof o.continueReading === 'object' ? o.continueReading : {},
      positions: o.positions && typeof o.positions === 'object' ? o.positions : {},
      history: Array.isArray(o.history) ? o.history : [],
      // Campo añadido después de la v1: un estado guardado antes no lo trae.
      discovered: Array.isArray(o.discovered) ? o.discovered : [],
    };
  } catch {
    return emptyState();
  }
}

// Guarda dónde se quedó el lector en un capítulo. Clave: `${novelSlug}/${chapterSlug}`.
export function setPosition(s: ReaderState, key: string, frac: number): ReaderState {
  const clamped = Math.min(1, Math.max(0, frac));
  return { ...s, positions: { ...s.positions, [key]: clamped } };
}

export function getPosition(s: ReaderState, key: string): number {
  const v = s.positions[key];
  return typeof v === 'number' && v > 0 && v <= 1 ? v : 0;
}

// Leído = llegó al 90% del capítulo. No al 100%: el pie, la navegación entre
// capítulos y el margen inferior son parte del scroll pero no del texto, así que
// exigir el final exacto dejaría capítulos terminados sin marcar.
export const READ_THRESHOLD = 0.9;

export function isRead(s: ReaderState, key: string): boolean {
  return getPosition(s, key) >= READ_THRESHOLD;
}

export function countRead(s: ReaderState, keys: string[]): number {
  return keys.filter((k) => isRead(s, k)).length;
}

export function isFavorite(s: ReaderState, slug: string): boolean {
  return s.favorites.includes(slug);
}

export function toggleFavorite(s: ReaderState, slug: string): ReaderState {
  const favorites = isFavorite(s, slug)
    ? s.favorites.filter((x) => x !== slug)
    : [slug, ...s.favorites];
  return { ...s, favorites };
}

export function discover(s: ReaderState, slug: string): ReaderState {
  return s.discovered.includes(slug) ? s : { ...s, discovered: [...s.discovered, slug] };
}

export function recordRead(
  s: ReaderState,
  e: { novelSlug: string; chapterSlug: string; title: string; at: number },
): ReaderState {
  const continueReading = { ...s.continueReading, [e.novelSlug]: e.chapterSlug };
  const filtered = s.history.filter(
    (h) => !(h.novelSlug === e.novelSlug && h.chapterSlug === e.chapterSlug),
  );
  const history = [{ ...e }, ...filtered].slice(0, HISTORY_CAP);
  return { ...s, continueReading, history };
}
