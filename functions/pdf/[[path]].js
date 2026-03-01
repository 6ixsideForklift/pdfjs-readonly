export async function onRequest(context) {
  const { request, env, params } = context;

  const tail = Array.isArray(params.path) ? params.path.join("/") : "";
  if (!tail) return new Response("Missing PDF path", { status: 400 });

  const url = new URL(request.url);
  const qs = url.search || "";

  const gateBase = (env.GATEKEEPER_BASE || "https://thegatekeeper.6ixsideforklift.workers.dev")
    .replace(/\/+$/, "");

  // IMPORTANT: tail is already path segments; do not decode/encode it here.
  const target = `${gateBase}/pdf/${tail}${qs}`;

  // Only forward what PDF.js needs
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  headers.set("accept", request.headers.get("accept") || "*/*");
  headers.set("x-pages-token", env.PAGES_INTERNAL_TOKEN || "");

  // Never forward cookies
  // Never forward Authorization

  const upstream = await fetch(target, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
  });

  const respHeaders = new Headers(upstream.headers);

  // Kill browser basic auth prompt
  respHeaders.delete("www-authenticate");

  // No caching ever
  respHeaders.set("Cache-Control", "no-store, private, max-age=0");
  respHeaders.set("Pragma", "no-cache");
  respHeaders.set("Expires", "0");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  if (request.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers: respHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}
