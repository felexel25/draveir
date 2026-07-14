import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import type { NotionPage, NovelData, ChapterData, SagaData } from './types';
import { parseNovel, parseChapterMeta, parseSaga, novelSlugOf, symmetrizeRelated } from './transform';
import { isUnlocked } from '../../src/lib/unlock';

const NOVELS_DB = 'c03f5b38-513f-4c0f-8f91-1b69cad31673';
const CHAPTERS_DB = '4ac20247-41d9-46b7-b9ca-cae507c3eaf2';
const SAGAS_DB = '59e14fc6-5381-407b-99c2-c26d4e532a89';

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

export async function fetchSagas(): Promise<SagaData[]> {
  const pages = await queryAll(SAGAS_DB);
  return pages.map((page) => parseSaga(page)).sort((a, b) => a.order - b.order);
}

export async function fetchSagaSlugMap(): Promise<Map<string, string>> {
  const pages = await queryAll(SAGAS_DB);
  return new Map(pages.map((page) => [page.id, parseSaga(page).slug]));
}

export async function fetchNovels(
  sagaSlugById: Map<string, string>,
): Promise<{ novels: NovelData[]; novelSlugById: Map<string, string> }> {
  const pages = await queryAll(NOVELS_DB, PUBLISHED_NOVELS_FILTER);
  // El mapa se construye primero: `Relacionadas` apunta a estas mismas novelas.
  const novelSlugById = new Map(pages.map((page) => [page.id, novelSlugOf(page)]));
  const novels = symmetrizeRelated(
    pages.map((page) => parseNovel(page, sagaSlugById, novelSlugById)),
  );
  return { novels, novelSlugById };
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
