import './env'; // debe ir primero: carga .env antes de que notion.ts lea el token
import { fetchPublishedNovels, fetchNovelSlugMap, fetchChapters } from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const [novels, novelSlugById] = await Promise.all([
    fetchPublishedNovels(),
    fetchNovelSlugMap(),
  ]);
  const chapters = await fetchChapters(novelSlugById);
  const published = chapters.filter((c) => c.unlocked);
  const locked = chapters.filter((c) => !c.unlocked);
  await writeContent(novels, published, locked);
  console.log(
    `Sync OK: ${novels.length} novelas, ${published.length} capítulos publicados, ${locked.length} bloqueados.`,
  );
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
