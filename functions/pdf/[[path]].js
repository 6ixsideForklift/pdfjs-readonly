export async function onRequest(context) {
  const { request, env, params } = context;

  // params.path is an array of path segments after /pdf/
  const tail = Array.isArray(params.path) ? params.path.join("/") : "";
  if (!tail) return new Response("Missing PDF path", { status: 400 });

  // Preserve querystring (?t=...)
  const url = new URL(request.url);
  const qs = url.search || "";

  const gateBase = (env.GATEKEEPER_BASE || "https://thegatekeeper.6ixsideforklift.workers.dev").replace(/\/+$/, "");
  const target = `${gateBase}/pdf/${tail}${qs}`;

  // Forward Range requests for PDF.js seeking
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.set("x-pages-token", env.PAGES_INTERNAL_TOKEN || "");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
  });

  const respHeaders = new Headers(upstream.headers);

  // No caching ever
  respHeaders.set("Cache-Control", "no-store, private, max-age=0");
  respHeaders.set("Pragma", "no-cache");
  respHeaders.set("Expires", "0");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
