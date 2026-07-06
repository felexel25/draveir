/// <reference types="@cloudflare/workers-types" />

interface Env {
  LOCKED_CHAPTERS: KVNamespace;
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

  // Marca de agua invisible por sesión (trazabilidad de filtraciones):
  // payload codificado (base64) con autor + id único + timestamp.
  const payload = JSON.stringify({
    a: 'Félix Llerena (Draveir)',
    id: crypto.randomUUID(),
    t: Date.now(),
  });
  const mark = btoa(unescape(encodeURIComponent(payload)));
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
