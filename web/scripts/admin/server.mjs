// Draveir Studio — panel local para crear filas de metadatos en las tablas de
// Notion (Capítulos / Novelas). No lee ni toca el contenido: crea la página
// vacía y te da el enlace para que pegues el texto en Notion.
//
// Uso:  node scripts/admin/server.mjs         (arranca en http://localhost:4477)
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
const PORT = 4477;
const REPO = 'felexel25/draveir';
const WORKFLOW = 'Sincronización programada';

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
  const props = {
    'Título': { title: [{ text: { content: title.trim() } }] },
    'Novela': { relation: [{ id: novelId }] },
    'Número': { number: Number(number) },
    'Estado': { select: { name: estado } },
  };
  if (estado === 'Programado') {
    if (!fecha) throw new Error('Un capítulo programado necesita fecha.');
    props['Fecha de publicación'] = { date: { start: unlockDate(fecha) } };
  }
  return props;
}

export function novelProps({ title, slug, synopsis, estado, categorias, publicada, destacada }) {
  if (!title || !title.trim()) throw new Error('Falta el título de la novela.');
  const props = {
    'Título': { title: [{ text: { content: title.trim() } }] },
    'Publicada': { checkbox: !!publicada },
    'Destacada': { checkbox: !!destacada },
  };
  if (synopsis && synopsis.trim()) props['Sinopsis'] = { rich_text: [{ text: { content: synopsis.trim() } }] };
  if (slug && slug.trim()) props['Slug'] = { rich_text: [{ text: { content: slug.trim() } }] };
  if (estado && NOVEL_ESTADOS.includes(estado)) props['Estado'] = { select: { name: estado } };
  if (Array.isArray(categorias) && categorias.length) {
    props['Categorías'] = { multi_select: categorias.map((name) => ({ name })) };
  }
  return props;
}

// ── Self-check (sin red) ──────────────────────────────────────────────────
if (process.argv.includes('--selfcheck')) {
  const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };
  ok(unlockDate('2026-07-10') === '2026-07-10T19:00:00.000-05:00', 'unlockDate 19:00 -05:00');
  const cp = chapterProps({ novelId: 'x', title: ' Cap 1 ', number: '3', estado: 'Programado', fecha: '2026-07-10' });
  ok(cp['Número'].number === 3, 'número numérico');
  ok(cp['Título'].title[0].text.content === 'Cap 1', 'título recortado');
  ok(cp['Fecha de publicación'].date.start.endsWith('T19:00:00.000-05:00'), 'fecha programada');
  let threw = false;
  try { chapterProps({ novelId: 'x', title: 'y', number: '1', estado: 'Programado' }); } catch { threw = true; }
  ok(threw, 'programado sin fecha debe fallar');
  ok(!chapterProps({ novelId: 'x', title: 'y', number: '1', estado: 'Publicado' })['Fecha de publicación'], 'publicado sin fecha');
  const np = novelProps({ title: 'Tarsis', categorias: ['Fantasía'], publicada: true, destacada: false });
  ok(np['Categorías'].multi_select[0].name === 'Fantasía', 'categoría');
  ok(np['Publicada'].checkbox === true, 'publicada');
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

const plainTitle = (page) =>
  (page.properties?.['Título']?.title ?? []).map((t) => t.plain_text).join('').trim();

async function listNovels() {
  const n = await getNotion();
  const res = await n.databases.query({
    database_id: NOVELS_DB,
    sorts: [{ property: 'Título', direction: 'ascending' }],
  });
  return res.results.map((p) => ({ id: p.id, title: plainTitle(p) || '(sin título)' }));
}

async function createChapter(body) {
  const n = await getNotion();
  const page = await n.pages.create({ parent: { database_id: CHAPTERS_DB }, properties: chapterProps(body) });
  return { url: page.url };
}

async function createNovel(body) {
  const n = await getNotion();
  const page = await n.pages.create({ parent: { database_id: NOVELS_DB }, properties: novelProps(body) });
  return { url: page.url };
}

// Dispara el workflow de sync. Intenta gh en PATH y en la ruta típica de Windows.
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
    return `${m}\n\nSi es un problema de permisos: en notion.so/my-integrations abre la integración de Draveir y activa la capacidad "Insertar contenido".`;
  }
  return m;
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = await readFile(resolve(__dirname, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (req.method === 'GET' && req.url === '/api/novels') {
      return sendJson(res, 200, { novels: await listNovels() });
    }
    if (req.method === 'POST' && req.url === '/api/chapter') {
      return sendJson(res, 200, await createChapter(await readBody(req)));
    }
    if (req.method === 'POST' && req.url === '/api/novel') {
      return sendJson(res, 200, await createNovel(await readBody(req)));
    }
    if (req.method === 'POST' && req.url === '/api/publish') {
      await publish();
      return sendJson(res, 200, { ok: true });
    }
    res.writeHead(404); res.end('No encontrado');
  } catch (err) {
    sendJson(res, 400, { error: hint(err?.message) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Draveir Studio  →  http://localhost:${PORT}\n  (Ctrl+C para detener)\n`);
});
