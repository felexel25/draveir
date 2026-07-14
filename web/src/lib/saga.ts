export interface SagaNovel {
  slug: string;
  title: string;
  sagaOrder: number | null;
}

// Las que no tienen orden van al final: una saga a medio numerar no debe
// colarse por delante de la primera novela.
export function readingOrder(novels: SagaNovel[]): SagaNovel[] {
  return [...novels].sort((a, b) => {
    if (a.sagaOrder === null && b.sagaOrder === null) {
      return a.title.localeCompare(b.title, 'es');
    }
    if (a.sagaOrder === null) return 1;
    if (b.sagaOrder === null) return -1;
    return a.sagaOrder - b.sagaOrder;
  });
}

export function positionIn(slug: string, ordered: SagaNovel[]): string | null {
  if (ordered.length < 2) return null; // "1ª de 1" no le dice nada al lector
  const i = ordered.findIndex((n) => n.slug === slug);
  return i === -1 ? null : `${i + 1}ª de ${ordered.length}`;
}
