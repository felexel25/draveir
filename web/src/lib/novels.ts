import { getCollection, type CollectionEntry } from 'astro:content';

// Una historia anunciada (sincronizada pero sin ningún capítulo, ni publicado ni
// programado) solo existe en /calendario. En cualquier otro sitio sería una ficha
// vacía y un clic muerto — misma regla que "una saga sin novelas publicadas no
// genera página". Los capítulos programados (colección lockedChapters) cuentan
// como capítulos: la ficha ya existe y muestra su cuenta atrás, así que la novela
// es legible aunque todavía no tenga nada publicado.
// Una historia oculta (checkbox "Oculta" en Notion) no sale en ningún listado:
// solo se llega a ella buscándola por su nombre o invocándola en /invocacion.
// Es ocultamiento de descubrimiento, no un candado — el sitio es estático y su
// HTML está publicado. Para lo que de verdad no debe verse todavía está el
// bloqueo por fecha de functions/, que sí es servidor.
//
// Se excluyen por defecto para que cualquier listado nuevo herede el secreto sin
// acordarse de nada. Solo piden `includeHidden` los tres sitios que las
// necesitan: la propia página de la novela, el buscador y /invocacion.
export async function getReadableNovels(
  { includeHidden = false } = {},
): Promise<CollectionEntry<'novels'>[]> {
  const chapters = await getCollection('chapters');
  const lockedChapters = await getCollection('lockedChapters');
  const conCapitulos = new Set([
    ...chapters.map((c) => c.data.novelSlug),
    ...lockedChapters.map((c) => c.data.novelSlug),
  ]);
  return (await getCollection('novels')).filter(
    (n) => conCapitulos.has(n.data.slug) && (includeHidden || !n.data.hidden),
  );
}
