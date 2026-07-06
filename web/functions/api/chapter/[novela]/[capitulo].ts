/// <reference types="@cloudflare/workers-types" />

interface Env {
  LOCKED_CHAPTERS: KVNamespace;
  WATERMARK_KEY?: string; // clave AES-GCM en base64 (32 bytes). Si falta, se usa base64.
}

// Marca de agua: cifra el payload con AES-GCM si hay clave; si no, base64 (ofuscación).
async function makeMark(payload: string, keyB64?: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  if (!keyB64) {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return 'b64:' + btoa(bin);
  }
  const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  let bin = '';
  for (const b of out) bin += String.fromCharCode(b);
  return 'enc:' + btoa(bin);
}

// Copia local: las Functions no comparten el bundle de src/. Igual a src/lib/unlock.ts.
function isUnlocked(unlocksAt: string, now: number): boolean {
  const t = Date.parse(unlocksAt);
  return Number.isNaN(t) ? true : now >= t;
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = `${params.novela}/${params.capitulo}`;
  const raw = await env.LOCKED_CHAPTERS.get(key);
  if (!raw) return json({ error: 'No encontrado' }, 404);

  let data: { unlocksAt: string; body: string };
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: 'Contenido inválido' }, 500);
  }

  if (!isUnlocked(data.unlocksAt, Date.now())) {
    return json({ unlocksAt: data.unlocksAt }, 423);
  }

  // Marca de agua invisible por sesión (trazabilidad de filtraciones).
  const payload = JSON.stringify({
    a: 'Félix Llerena (Draveir)',
    id: crypto.randomUUID(),
    t: Date.now(),
  });
  const mark = await makeMark(payload, env.WATERMARK_KEY);
  const stamp = `<!-- df:${mark} -->`;
  return new Response(JSON.stringify({ body: stamp + data.body }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Nunca cachear el texto desbloqueado en intermediarios/navegador.
      'cache-control': 'private, no-store',
    },
  });
};
