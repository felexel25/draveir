// Lógica de /invocacion, separada de la animación para poder probarla: qué
// rareza tiene cada historia y cuál sale en una tirada.

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
// queden sin descubrir. Baja a propósito: el hallazgo tiene que sentirse raro.
export const HIDDEN_CHANCE = 0.08;

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

export function pickMany(
  visible: GachaCard[],
  undiscovered: GachaCard[],
  rnd: () => number,
  n: number,
): GachaCard[] {
  const out: GachaCard[] = [];
  // Las ocultas ya sacadas salen del bombo dentro de la misma tanda: repetir el
  // mismo hallazgo en una tirada de diez arruinaría el momento.
  let restantes = undiscovered;
  for (let i = 0; i < n; i++) {
    const c = pick(visible, restantes, rnd);
    if (!c) break;
    if (c.hidden) restantes = restantes.filter((h) => h.slug !== c.slug);
    out.push(c);
  }
  return out;
}
