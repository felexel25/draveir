import './env'; // debe ir primero: carga .env antes de que notion.ts lea el token
import { fetchSagas, fetchSagaSlugMap, fetchNovels, fetchChapters } from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const [sagas, sagaSlugById] = await Promise.all([fetchSagas(), fetchSagaSlugMap()]);
  const { novels, novelSlugById } = await fetchNovels(sagaSlugById);
  const chapters = await fetchChapters(novelSlugById);
  const published = chapters.filter((c) => c.unlocked);
  const locked = chapters.filter((c) => !c.unlocked);
  await writeContent(sagas, novels, published, locked);
  console.log(
    `Sync OK: ${sagas.length} sagas, ${novels.length} novelas, ` +
      `${published.length} capítulos publicados, ${locked.length} bloqueados.`,
  );
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
