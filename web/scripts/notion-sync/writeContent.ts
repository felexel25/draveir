import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NovelData, ChapterData } from './types';

const CONTENT = join(process.cwd(), 'src', 'content');
const NOVELS_DIR = join(CONTENT, 'novels');
const CHAPTERS_DIR = join(CONTENT, 'chapters');

function frontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export async function writeContent(novels: NovelData[], chapters: ChapterData[]): Promise<void> {
  await rm(NOVELS_DIR, { recursive: true, force: true });
  await rm(CHAPTERS_DIR, { recursive: true, force: true });
  await mkdir(NOVELS_DIR, { recursive: true });
  await mkdir(CHAPTERS_DIR, { recursive: true });

  for (const n of novels) {
    await writeFile(join(NOVELS_DIR, `${n.slug}.json`), JSON.stringify(n, null, 2));
  }

  for (const c of chapters) {
    const fm = frontmatter({
      novelSlug: c.novelSlug,
      number: c.number,
      title: c.title,
      chapterSlug: c.chapterSlug,
      publishedAt: c.publishedAt,
    });
    const file = join(CHAPTERS_DIR, `${c.novelSlug}--${c.chapterSlug}.md`);
    await writeFile(file, `${fm}\n${c.bodyMarkdown}\n`);
  }
}
