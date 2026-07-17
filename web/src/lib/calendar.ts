export interface ReleaseInput {
  firstChapterAt: string | null; // ISO del capítulo 1, si la historia ya empezó
  releaseWindow: string | null;  // texto libre de Notion: "Finales de 2027"
}

// Cascada deliberada: el hecho (una fecha real de publicación) gana a la
// promesa (la ventana que escribió el autor), y si no hay ninguna de las dos no
// se inventa nada.
export function releaseLabel({ firstChapterAt, releaseWindow }: ReleaseInput): string | null {
  if (firstChapterAt) {
    const d = new Date(firstChapterAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Panama',
      });
    }
  }
  return releaseWindow || null;
}
