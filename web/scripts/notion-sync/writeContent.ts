import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import type { NovelData, ChapterData, SagaData } from './types';

const CONTENT = join(process.cwd(), 'src', 'content');
const SAGAS_DIR = join(CONTENT, 'sagas');
const NOVELS_DIR = join(CONTENT, 'novels');
const CHAPTERS_DIR = join(CONTENT, 'chapters');
const LOCKED_DIR = join(CONTENT, 'lockedChapters');
const KV_BULK = join(process.cwd(), '.kv-bulk.json');

function frontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export async function writeContent(
  sagas: SagaData[],
  novels: NovelData[],
  published: ChapterData[],
  locked: ChapterData[],
): Promise<void> {
  for (const dir of [SAGAS_DIR, NOVELS_DIR, CHAPTERS_DIR, LOCKED_DIR]) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
  }

  for (const s of sagas) {
    await writeFile(join(SAGAS_DIR, `${s.slug}.json`), JSON.stringify(s, null, 2));
  }

  for (const n of novels) {
    await writeFile(join(NOVELS_DIR, `${n.slug}.json`), JSON.stringify(n, null, 2));
  }

  for (const c of published) {
    const fm = frontmatter({
      novelSlug: c.novelSlug,
      number: c.number,
      title: c.title,
      chapterSlug: c.chapterSlug,
      publishedAt: c.publishedAt,
    });
    await writeFile(join(CHAPTERS_DIR, `${c.novelSlug}--${c.chapterSlug}.md`), `${fm}\n${c.bodyMarkdown}\n`);
  }

  // Bloqueados: metadatos al sitio (para la cuenta regresiva, SIN texto)…
  for (const c of locked) {
    const meta = {
      novelSlug: c.novelSlug,
      number: c.number,
      title: c.title,
      chapterSlug: c.chapterSlug,
      unlocksAt: c.publishedAt,
    };
    await writeFile(join(LOCKED_DIR, `${c.novelSlug}--${c.chapterSlug}.json`), JSON.stringify(meta, null, 2));
  }

  // …y el TEXTO (ya como HTML) solo a un bundle para KV (nunca al repo/dist).
  const kv = locked.map((c) => ({
    key: `${c.novelSlug}/${c.chapterSlug}`,
    value: JSON.stringify({
      unlocksAt: c.publishedAt,
      body: marked.parse(c.bodyMarkdown, { async: false }) as string,
    }),
  }));
  await writeFile(KV_BULK, JSON.stringify(kv, null, 2));
}
