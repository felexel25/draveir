// El mismo criterio de orden sirve para la saga (orden de lectura) y para la
// fase (orden de anuncio): un número que decide el autor, y punto.
export interface OrderedNovel {
  slug: string;
  title: string;
  order: number | null;
}

// Las que no tienen orden van al final: una lista a medio numerar no debe
// colarse por delante de la primera novela.
export function readingOrder(novels: OrderedNovel[]): OrderedNovel[] {
  return [...novels].sort((a, b) => {
    if (a.order === null && b.order === null) {
      return a.title.localeCompare(b.title, 'es');
    }
    if (a.order === null) return 1;
    if (b.order === null) return -1;
    return a.order - b.order;
  });
}

export function positionIn(slug: string, ordered: OrderedNovel[]): string | null {
  if (ordered.length < 2) return null; // "1ª de 1" no le dice nada al lector
  const i = ordered.findIndex((n) => n.slug === slug);
  return i === -1 ? null : `${i + 1}ª de ${ordered.length}`;
}
