// Draveir Studio — panel local para gestionar las fichas de metadatos en las
// tablas de Notion (Capítulos / Novelas). Crea, edita y elimina filas; el
// contenido (texto) se escribe en Notion. No lee ni copia el cuerpo.
//
// Uso:  node scripts/admin/server.mjs         (http://localhost:4477)
//       node scripts/admin/server.mjs --selfcheck   (verifica la lógica, sin red)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(__dirname, '../..');

const NOVELS_DB = 'c03f5b38-513f-4c0f-8f91-1b69cad31673';
const CHAPTERS_DB = '4ac20247-41d9-46b7-b9ca-cae507c3eaf2';
const SAGAS_DB = '59e14fc6-5381-407b-99c2-c26d4e532a89';
const PORT = 4477;
const REPO = 'felexel25/draveir';
const WORKFLOW = 'Sincronización programada';
const IDLE_MS = 20 * 60 * 1000; // red de seguridad: se apaga tras 20 min sin señal
const BYE_GRACE_MS = 4000;      // al cerrar la pestaña, apaga tras esta gracia (salvo refresco)

// ── Lógica pura (cubierta por --selfcheck) ────────────────────────────────
const CHAPTER_ESTADOS = ['Publicado', 'Programado', 'Borrador'];
const NOVEL_ESTADOS = ['En progreso', 'Completa', 'Pausada'];

// 'AAAA-MM-DD' → ISO a las 19:00 hora Panamá (-05:00, sin horario de verano).
export function unlockDate(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) throw new Error('Fecha inválida (usa AAAA-MM-DD).');
  return `${fecha}T19:00:00.000-05:00`;
}

export function chapterProps({ novelId, title, number, estado, fecha }) {
  if (!title || !title.trim()) throw new Error('Falta el título del capítulo.');
  if (!novelId) throw new Error('Elige la novela.');
  if (!Number.isFinite(Number(number))) throw new Error('El número no es válido.');
  if (!CHAPTER_ESTADOS.includes(estado)) throw new Error('Estado inválido.');
  if (estado === 'Programado' && !fecha) throw new Error('Un capítulo programado necesita fecha.');
  return {
    'Título': { title: [{ text: { content: title.trim() } }] },
    'Novela': { relation: [{ id: novelId }] },
    'Número': { number: Number(number) },
    'Estado': { select: { name: estado } },
    // Siempre presente: al editar, limpia la fecha si deja de estar programado.
    'Fecha de publicación': estado === 'Programado' ? { date: { start: unlockDate(fecha) } } : { date: null },
  };
}

export function novelProps({
  title, slug, synopsis, estado, categorias, publicada, destacada,
  saga, ordenSaga, relacionadas, pageId,
}) {
  if (!title || !title.trim()) throw new Error('Falta el título de la novela.');
  const orden = ordenSaga === '' || ordenSaga == null ? null : Number(ordenSaga);
  if (orden !== null && !Number.isFinite(orden)) throw new Error('El orden en la saga no es válido.');
  // Una novela no se relaciona consigo misma: el sync la descartaría igualmente.
  const rel = (Array.isArray(relacionadas) ? relacionadas : []).filter((id) => id && id !== pageId);
  return {
    'Título': { title: [{ text: { content: title.trim() } }] },
    'Sinopsis': { rich_text: synopsis && synopsis.trim() ? [{ text: { content: synopsis.trim() } }] : [] },
    'Slug': { rich_text: slug && slug.trim() ? [{ text: { content: slug.trim() } }] : [] },
    'Estado': { select: estado && NOVEL_ESTADOS.includes(estado) ? { name: estado } : null },
    'Categorías': { multi_select: (Array.isArray(categorias) ? categorias : []).map((name) => ({ name })) },
    'Publicada': { checkbox: !!publicada },
    'Destacada': { checkbox: !!destacada },
    // Siempre presentes: al editar, quitar la saga aquí debe limpiarla en Notion.
    'Saga': { relation: saga ? [{ id: saga }] : [] },
    'Orden en saga': { number: orden },
    'Relacionadas': { relation: rel.map((id) => ({ id })) },
  };
}

// ── Self-check (sin red) ──────────────────────────────────────────────────
if (process.argv.includes('--selfcheck')) {
  const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };
  ok(unlockDate('2026-07-10') === '2026-07-10T19:00:00.000-05:00', 'unlockDate 19:00 -05:00');
  const cp = chapterProps({ novelId: 'x', title: ' Cap 1 ', number: '3', estado: 'Programado', fecha: '2026-07-10' });
  ok(cp['Número'].number === 3, 'número numérico');
  ok(cp['Título'].title[0].text.content === 'Cap 1', 'título recortado');
  ok(cp['Fecha de publicación'].date.start.endsWith('T19:00:00.000-05:00'), 'fecha programada');
  ok(chapterProps({ novelId: 'x', title: 'y', number: '1', estado: 'Publicado' })['Fecha de publicación'].date === null, 'publicado limpia fecha');
  let threw = false;
  try { chapterProps({ novelId: 'x', title: 'y', number: '1', estado: 'Programado' }); } catch { threw = true; }
  ok(threw, 'programado sin fecha debe fallar');
  const np = novelProps({ title: 'Tarsis', categorias: ['Fantasía'], publicada: true, destacada: false, estado: 'En progreso' });
  ok(np['Categorías'].multi_select[0].name === 'Fantasía', 'categoría');
  ok(np['Publicada'].checkbox === true, 'publicada');
  ok(novelProps({ title: 'x', categorias: [] })['Categorías'].multi_select.length === 0, 'sin categorías limpia');
  const sg = novelProps({ title: 'x', saga: 'saga-1', ordenSaga: '20', relacionadas: ['n2'] });
  ok(sg['Saga'].relation[0].id === 'saga-1', 'saga');
  ok(sg['Orden en saga'].number === 20, 'orden numérico');
  ok(sg['Relacionadas'].relation[0].id === 'n2', 'relacionadas');
  const sin = novelProps({ title: 'x' });
  ok(sin['Saga'].relation.length === 0, 'sin saga limpia');
  ok(sin['Orden en saga'].number === null, 'sin orden limpia');
  ok(novelProps({ title: 'x', pageId: 'yo', relacionadas: ['yo', 'otra'] })['Relacionadas'].relation.length === 1, 'no se relaciona consigo misma');
  let badOrden = false;
  try { novelProps({ title: 'x', ordenSaga: 'ocho' }); } catch { badOrden = true; }
  ok(badOrden, 'orden no numérico debe fallar');
  console.log('selfcheck OK');
  process.exit(0);
}

// ── Cliente Notion ────────────────────────────────────────────────────────
try { process.loadEnvFile(resolve(WEB_DIR, '.env')); } catch { /* usa el entorno */ }

let notion = null;
async function getNotion() {
  if (notion) return notion;
  if (!process.env.NOTION_TOKEN) throw new Error('Falta NOTION_TOKEN en web/.env.');
  const { Client } = await import('@notionhq/client');
  notion = new Client({ auth: process.env.NOTION_TOKEN, notionVersion: '2022-06-28' });
  return notion;
}

const text = (p) => (p?.title ?? p?.rich_text ?? []).map((t) => t.plain_text).join('').trim();

async function listNovels() {
  const n = await getNotion();
  const res = await n.databases.query({ database_id: NOVELS_DB, sorts: [{ property: 'Título', direction: 'ascending' }] });
  return res.results.map((p) => ({ id: p.id, title: text(p.properties['Título']) || '(sin título)' }));
}

async function listSagas() {
  const n = await getNotion();
  const res = await n.databases.query({ database_id: SAGAS_DB, sorts: [{ property: 'Orden', direction: 'ascending' }] });
  return res.results.map((p) => ({ id: p.id, title: text(p.properties['Nombre']) || '(sin nombre)' }));
}

async function getNovel(id) {
  const n = await getNotion();
  const p = await n.pages.retrieve({ page_id: id });
  const P = p.properties;
  return {
    id: p.id,
    title: text(P['Título']),
    slug: text(P['Slug']),
    synopsis: text(P['Sinopsis']),
    estado: P['Estado']?.select?.name ?? '',
    categorias: (P['Categorías']?.multi_select ?? []).map((o) => o.name),
    publicada: !!P['Publicada']?.checkbox,
    destacada: !!P['Destacada']?.checkbox,
    saga: P['Saga']?.relation?.[0]?.id ?? '',
    ordenSaga: P['Orden en saga']?.number ?? '',
    relacionadas: (P['Relacionadas']?.relation ?? []).map((r) => r.id),
  };
}

async function listChapters(novelId) {
  const n = await getNotion();
  const res = await n.databases.query({
    database_id: CHAPTERS_DB,
    filter: { property: 'Novela', relation: { contains: novelId } },
    sorts: [{ property: 'Número', direction: 'ascending' }],
  });
  return res.results.map((p) => ({
    id: p.id,
    number: p.properties['Número']?.number ?? null,
    title: text(p.properties['Título']),
    estado: p.properties['Estado']?.select?.name ?? '',
    fecha: (p.properties['Fecha de publicación']?.date?.start ?? '').slice(0, 10),
  }));
}

async function upsertChapter(body) {
  const n = await getNotion();
  const properties = chapterProps(body);
  const page = body.pageId
    ? await n.pages.update({ page_id: body.pageId, properties })
    : await n.pages.create({ parent: { database_id: CHAPTERS_DB }, properties });
  return { url: page.url, updated: !!body.pageId };
}

async function upsertNovel(body) {
  const n = await getNotion();
  const properties = novelProps(body);
  const page = body.pageId
    ? await n.pages.update({ page_id: body.pageId, properties })
    : await n.pages.create({ parent: { database_id: NOVELS_DB }, properties });
  return { url: page.url, updated: !!body.pageId };
}

async function archivePage(pageId) {
  const n = await getNotion();
  if (!pageId) throw new Error('Falta el id de la página.');
  await n.pages.update({ page_id: pageId, archived: true });
  return { ok: true };
}

function publish() {
  const run = (bin) =>
    new Promise((res, rej) =>
      execFile(bin, ['workflow', 'run', WORKFLOW, '--repo', REPO], (err, _o, se) =>
        err ? rej(new Error(se?.trim() || err.message)) : res(true),
      ),
    );
  return run('gh').catch(() => run('C:\\Program Files\\GitHub CLI\\gh.exe'));
}

// ── HTTP ──────────────────────────────────────────────────────────────────
const readBody = (req) =>
  new Promise((res, rej) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch (e) { rej(e); } });
    req.on('error', rej);
  });

const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

const hint = (msg) => {
  const m = String(msg || '');
  if (/unauthorized|401|invalid|permission|insufficient|403|restricted/i.test(m)) {
    return `${m}\n\nSi es un problema de permisos: en notion.so/my-integrations abre la integración de Draveir y activa "Insertar contenido" y "Actualizar contenido".`;
  }
  return m;
};

let lastPing = Date.now();

function shutdown(reason) {
  console.log(`\n  ${reason} — deteniendo Draveir Studio.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000).unref();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  try {
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
      const html = await readFile(resolve(__dirname, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (path === '/api/ping') { lastPing = Date.now(); return sendJson(res, 200, { ok: true }); }
    // Pestaña cerrada: apaga tras la gracia, salvo que llegue un ping (refresco/reapertura).
    if (path === '/api/bye') {
      const byeAt = Date.now();
      setTimeout(() => { if (lastPing <= byeAt) shutdown('Pestaña cerrada'); }, BYE_GRACE_MS).unref();
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET' && path === '/api/novels') return sendJson(res, 200, { novels: await listNovels() });
    if (req.method === 'GET' && path === '/api/sagas') return sendJson(res, 200, { sagas: await listSagas() });
    if (req.method === 'GET' && path === '/api/novel') return sendJson(res, 200, await getNovel(url.searchParams.get('id')));
    if (req.method === 'GET' && path === '/api/chapters') return sendJson(res, 200, { chapters: await listChapters(url.searchParams.get('novelId')) });
    if (req.method === 'POST' && path === '/api/chapter') return sendJson(res, 200, await upsertChapter(await readBody(req)));
    if (req.method === 'POST' && path === '/api/novel') return sendJson(res, 200, await upsertNovel(await readBody(req)));
    if (req.method === 'POST' && path === '/api/delete') return sendJson(res, 200, await archivePage((await readBody(req)).pageId));
    if (req.method === 'POST' && path === '/api/publish') { await publish(); return sendJson(res, 200, { ok: true }); }
    res.writeHead(404); res.end('No encontrado');
  } catch (err) {
    sendJson(res, 400, { error: hint(err?.message) });
  }
});

// Red de seguridad: si no hay señal en mucho tiempo (pestaña abandonada/congelada), se apaga.
setInterval(() => {
  if (Date.now() - lastPing > IDLE_MS) shutdown('Inactividad');
}, 30000).unref();

server.listen(PORT, () => {
  console.log(`\n  Draveir Studio  →  http://localhost:${PORT}\n  (se cierra solo al cerrar la pestaña)\n`);
});
