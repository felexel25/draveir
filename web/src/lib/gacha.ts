// Lógica de /invocacion, separada de la animación para poder probarla: qué
// rareza tiene cada historia, cuál sale en una tirada y cuándo toca la siguiente.
import { panamaDay, DIA_MS, PANAMA_OFFSET_MS } from './fresh';

export type Rarity = 3 | 4 | 5;

export interface GachaCard {
  slug: string;
  title: string;
  format: string | null;
  hidden: boolean;
  rarity: Rarity;
}

// La rareza sale del formato, que ya existe en cada novela: cuanto más larga la
// historia, más "premio" es sacarla. Un formato desconocido cae en 3★ — nunca se
// inventa una rareza alta por un dato que no reconocemos.
const RARITY_BY_FORMAT: Record<string, Rarity> = {
  Microrrelato: 3,
  Relato: 3,
  'Relato largo': 4,
  'Novela corta': 4,
  Novela: 5,
};

export function rarityOf(format: string | null, hidden = false): Rarity {
  if (hidden) return 5; // Una historia oculta siempre es el premio gordo.
  return (format && RARITY_BY_FORMAT[format]) || 3;
}

// Probabilidad de que una tirada venga del grupo de historias ocultas, mientras
// queden sin descubrir. Con una sola invocación al día, la escasez ya la impone
// el calendario: al 8% el hallazgo tardaría unos doce días de media, que es más
// abandono que misterio. Al 15% ronda la semana.
export const HIDDEN_CHANCE = 0.15;

// `rnd` se inyecta (Math.random en producción) para que la tirada sea testeable.
export function pick(
  visible: GachaCard[],
  undiscovered: GachaCard[],
  rnd: () => number,
): GachaCard | null {
  const pool = undiscovered.length > 0 && rnd() < HIDDEN_CHANCE ? undiscovered : visible;
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

// El día de invocación no empieza a medianoche sino a las 7 PM de Panamá, la
// misma hora a la que se publican los capítulos: quien entra a leer lo nuevo se
// encuentra la invocación recién abierta.
export const RESET_HOUR = 19;
const RESET_MS = RESET_HOUR * 60 * 60 * 1000;

export function invocationDay(ms: number): number {
  return panamaDay(ms - RESET_MS);
}

// Una invocación por día. Vive en localStorage, así que se salta borrándolo: es
// un ritmo, no un candado, y no hay nada que proteger detrás.
export function canPull(daily: { day: number } | null, nowMs: number): boolean {
  return daily === null || daily.day !== invocationDay(nowMs);
}

// Cuándo se abre la siguiente: el arranque del próximo día de invocación.
export function nextInvocationAt(nowMs: number): number {
  return (invocationDay(nowMs) + 1) * DIA_MS + PANAMA_OFFSET_MS + RESET_MS;
}
