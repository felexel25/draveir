/// <reference types="@cloudflare/workers-types" />

// Redirige el subdominio de Pages al dominio propio: sin esto, draveir.pages.dev
// y draveir.com compiten por el mismo contenido en Google. 301 para consolidar.
// Solo el apex exacto — los previews (<hash>.draveir.pages.dev) se dejan pasar
// para poder revisar cada PR.
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname === 'draveir.pages.dev') {
    url.hostname = 'draveir.com';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};
