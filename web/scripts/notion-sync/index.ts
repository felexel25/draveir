import './env'; // debe ir primero: carga .env antes de que notion.ts lea el token
import { fetchPublishedNovels, fetchNovelSlugMap, fetchPublishedChapters } from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const [novels, novelSlugById] = await Promise.all([
    fetchPublishedNovels(),
    fetchNovelSlugMap(),
  ]);
  const chapters = await fetchPublishedChapters(novelSlugById);
  await writeContent(novels, chapters);
  console.log(`Sync OK: ${novels.length} novelas, ${chapters.length} capítulos.`);
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
