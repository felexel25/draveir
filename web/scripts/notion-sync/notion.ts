import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import type { NotionPage, NovelData, ChapterData } from './types';
import { parseNovel, parseChapterMeta } from './transform';
import { isUnlocked } from '../../src/lib/unlock';

const NOVELS_DB = 'c03f5b38-513f-4c0f-8f91-1b69cad31673';
const CHAPTERS_DB = '4ac20247-41d9-46b7-b9ca-cae507c3eaf2';

const token = process.env.NOTION_TOKEN;
if (!token) throw new Error('Falta NOTION_TOKEN en el entorno.');

const notion = new Client({ auth: token, notionVersion: '2022-06-28' });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function queryAll(database_id: string, filter?: any): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...(res.results as unknown as NotionPage[]));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

const PUBLISHED_NOVELS_FILTER = {
  property: 'Publicada',
  checkbox: { equals: true },
};

export async function fetchPublishedNovels(): Promise<NovelData[]> {
  const pages = await queryAll(NOVELS_DB, PUBLISHED_NOVELS_FILTER);
  // Lambda explícita: `.map(parseNovel)` le colaría el índice como 2º argumento.
  return pages.map((page) => parseNovel(page));
}

export async function fetchNovelSlugMap(): Promise<Map<string, string>> {
  const pages = await queryAll(NOVELS_DB, PUBLISHED_NOVELS_FILTER);
  const map = new Map<string, string>();
  for (const page of pages) map.set(page.id, parseNovel(page).slug);
  return map;
}

// Todos los capítulos visibles: Publicado o Programado. Marca `unlocked` según
// estado/fecha; el orquestador separa estáticos (desbloqueados) de KV (bloqueados).
export async function fetchChapters(
  novelSlugById: Map<string, string>,
): Promise<ChapterData[]> {
  const pages = await queryAll(CHAPTERS_DB, {
    or: [
      { property: 'Estado', select: { equals: 'Publicado' } },
      { property: 'Estado', select: { equals: 'Programado' } },
    ],
  });

  const now = Date.now();
  const chapters: ChapterData[] = [];
  for (const page of pages) {
    const meta = parseChapterMeta(page, novelSlugById);
    if (!meta) continue; // capítulo de una novela no publicada → se omite
    const estado = page.properties['Estado']?.select?.name ?? '';
    const unlocked = estado === 'Publicado' || isUnlocked(meta.publishedAt, now);
    const blocks = await n2m.pageToMarkdown(page.id);
    const bodyMarkdown = n2m.toMarkdownString(blocks).parent ?? '';
    chapters.push({ ...meta, bodyMarkdown, unlocked });
  }
  return chapters;
}
