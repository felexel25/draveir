import { getCollection, type CollectionEntry } from 'astro:content';

// Una historia anunciada (sincronizada pero sin ningún capítulo publicado) solo
// existe en /calendario. En cualquier otro sitio sería una ficha vacía y un clic
// muerto — misma regla que "una saga sin novelas publicadas no genera página".
export async function getReadableNovels(): Promise<CollectionEntry<'novels'>[]> {
  const chapters = await getCollection('chapters');
  const conCapitulos = new Set(chapters.map((c) => c.data.novelSlug));
  return (await getCollection('novels')).filter((n) => conCapitulos.has(n.data.slug));
}
