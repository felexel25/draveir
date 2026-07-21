import type { NotionPage, NovelData, ChapterMeta, SagaData, PhaseData } from './types';

const plainText = (prop: any): string =>
  (prop?.title ?? prop?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const chapterSlug = (n: number): string => `capitulo-${n}`;

// Resuelve una relación de Notion a slugs, descartando las páginas que no están
// en el mapa (= no publicadas): mismo criterio que un capítulo sin novela.
const relationSlugs = (prop: any, byId?: Map<string, string>): string[] =>
  (prop?.relation ?? [])
    .map((r: any) => byId?.get(r.id))
    .filter((s: string | undefined): s is string => Boolean(s));

export function parseSaga(page: NotionPage): SagaData {
  const p = page.properties;
  const name = plainText(p['Nombre']);
  const rawSlug = plainText(p['Slug']);
  return {
    slug: rawSlug || slugify(name),
    name,
    description: plainText(p['Descripción']),
    order: p['Orden']?.number ?? 0,
  };
}

// Misma forma que una saga: nombre, slug, descripción y orden.
export function parsePhase(page: NotionPage): PhaseData {
  const p = page.properties;
  const name = plainText(p['Nombre']);
  const rawSlug = plainText(p['Slug']);
  return {
    slug: rawSlug || slugify(name),
    name,
    description: plainText(p['Descripción']),
    order: p['Orden']?.number ?? 0,
  };
}

// El slug de una novela sin resolver relaciones: hace falta para construir el
// mapa id→slug ANTES de poder resolver `Relacionadas`, que apunta a novelas.
export function novelSlugOf(page: NotionPage): string {
  const p = page.properties;
  return plainText(p['Slug']) || slugify(plainText(p['Título']));
}

export function parseNovel(
  page: NotionPage,
  sagaSlugById?: Map<string, string>,
  novelSlugById?: Map<string, string>,
  phaseSlugById?: Map<string, string>,
): NovelData {
  const p = page.properties;
  return {
    slug: novelSlugOf(page),
    title: plainText(p['Título']),
    synopsis: plainText(p['Sinopsis']),
    status: p['Estado']?.select?.name ?? null,
    format: p['Formato']?.select?.name ?? null,
    categories: (p['Categorías']?.multi_select ?? []).map((o: any) => o.name),
    tags: (p['Etiquetas']?.multi_select ?? []).map((o: any) => o.name),
    featured: Boolean(p['Destacada']?.checkbox),
    hidden: Boolean(p['Oculta']?.checkbox),
    saga: relationSlugs(p['Saga'], sagaSlugById)[0] ?? null,
    sagaOrder: p['Orden en saga']?.number ?? null,
    phase: relationSlugs(p['Fase'], phaseSlugById)[0] ?? null,
    phaseOrder: p['Orden en fase']?.number ?? null,
    releaseWindow: plainText(p['Ventana de lanzamiento']) || null,
    related: relationSlugs(p['Relacionadas'], novelSlugById),
  };
}

// Notion no simetriza las relaciones a sí misma: si A declara el cruce con B y B
// no declara nada, el lector nunca vería el enlace desde B. Cerramos el grafo.
export function symmetrizeRelated(novels: NovelData[]): NovelData[] {
  const known = new Set(novels.map((n) => n.slug));
  const links = new Map<string, Set<string>>(novels.map((n) => [n.slug, new Set<string>()]));
  for (const n of novels) {
    for (const other of n.related) {
      if (other === n.slug || !known.has(other)) continue;
      links.get(n.slug)!.add(other);
      links.get(other)!.add(n.slug);
    }
  }
  return novels.map((n) => ({ ...n, related: [...links.get(n.slug)!].sort() }));
}

export function parseChapterMeta(
  page: NotionPage,
  novelSlugById: Map<string, string>,
): ChapterMeta | null {
  const p = page.properties;
  const novelId = p['Novela']?.relation?.[0]?.id;
  const novelSlug = novelId ? novelSlugById.get(novelId) : undefined;
  if (!novelSlug) return null;

  const number = p['Número']?.number ?? 0;
  return {
    novelSlug,
    number,
    title: plainText(p['Título']),
    chapterSlug: chapterSlug(number),
    publishedAt: p['Fecha de publicación']?.date?.start ?? '',
  };
}
