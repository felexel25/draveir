// Historias ocultas: no salen en ningún listado ni en el sitemap, pero su página
// existe y funciona. Se destapan buscando el título en /buscar o invocándolas en
// /invocacion.
//
// La lista vive aquí y no en el JSON de la novela porque el sync con Notion
// borra y reescribe src/content/novels entero: un flag puesto a mano ahí duraría
// hasta el próximo `npm run sync`.
//
// Esto es ocultamiento de descubrimiento, no un candado. El sitio es estático:
// el HTML de una historia oculta está publicado y quien tenga la URL la lee.
// Para contenido que de verdad no debe verse todavía está el bloqueo por fecha
// de functions/, que sí es servidor.
// Vacío a propósito: el mecanismo está listo, pero ocultar una historia ya
// publicada la haría desaparecer para quien la seguía. Se llena cuando exista
// una historia escrita para ser encontrada.
export const HIDDEN_SLUGS: string[] = [];

export function isHidden(slug: string): boolean {
  return HIDDEN_SLUGS.includes(slug);
}
