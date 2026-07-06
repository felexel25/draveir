import type { NotionPage, NovelData, ChapterMeta } from './types';

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

export function parseNovel(page: NotionPage): NovelData {
  const p = page.properties;
  const title = plainText(p['Título']);
  const rawSlug = plainText(p['Slug']);
  return {
    slug: rawSlug || slugify(title),
    title,
    synopsis: plainText(p['Sinopsis']),
    status: p['Estado']?.select?.name ?? null,
    categories: (p['Categorías']?.multi_select ?? []).map((o: any) => o.name),
    tags: (p['Etiquetas']?.multi_select ?? []).map((o: any) => o.name),
    featured: Boolean(p['Destacada']?.checkbox),
  };
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
    slug: chapterSlug(number),
    publishedAt: p['Fecha de publicación']?.date?.start ?? '',
  };
}
