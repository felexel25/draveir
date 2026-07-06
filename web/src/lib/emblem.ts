export const EMBLEMS = ['sun', 'moon', 'eclipse', 'star', 'planet', 'tower', 'eye'] as const;
export type Emblem = (typeof EMBLEMS)[number];

// Emblema estable por novela: mismo slug → mismo emblema; slugs distintos varían.
export function pickEmblem(slug: string): Emblem {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return EMBLEMS[h % EMBLEMS.length];
}
