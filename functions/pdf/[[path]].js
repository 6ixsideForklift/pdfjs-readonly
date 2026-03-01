export async function onRequest(context) {
  const { request, env, params } = context;

  const tail = Array.isArray(params.path) ? params.path.join("/") : "";
  if (!tail) return new Response("Missing PDF path", { status: 400 });

  const url = new URL(request.url);
  const qs = url.search || "";

  const gateBase = (env.GATEKEEPER_BASE || "https://thegatekeeper.6ixsideforklift.workers.dev").replace(/\/+$/, "");
  const target = `${gateBase}/pdf/${tail}${qs}`;

  // ✅ Only forward what Gatekeeper/PDF.js actually needs
  const headers = new Headers();

  // Range seeking (PDF.js)
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  // Optional: forward If-None-Match / If-Modified-Since (not required if you no-cache)
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (ifModifiedSince) headers.set("if-modified-since", ifModifiedSince);

  // ✅ Your internal bypass token
  headers.set("x-pages-token", env.PAGES_INTERNAL_TOKEN || "");

  // ✅ Make sure Gatekeeper sees a clean request
  headers.set("accept", request.headers.get("accept") || "*/*");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
  });

  // ✅ Copy upstream headers BUT fix the ones PDF.js cares about
  const respHeaders = new Headers(upstream.headers);

  // No caching ever
  respHeaders.set("Cache-Control", "no-store, private, max-age=0");
  respHeaders.set("Pragma", "no-cache");
  respHeaders.set("Expires", "0");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  // ✅ Critical for PDF.js range support (some proxies strip these)
  respHeaders.set("Accept-Ranges", respHeaders.get("Accept-Ranges") || "bytes");

  // ✅ Ensure browser can read range headers
  const expose = respHeaders.get("Access-Control-Expose-Headers");
  const needed = ["Accept-Ranges", "Content-Range", "Content-Length", "ETag"];
  respHeaders.set(
    "Access-Control-Expose-Headers",
    mergeExposeHeaders(expose, needed)
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

function mergeExposeHeaders(existing, addList) {
  const set = new Set(
    String(existing || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  );
  for (const h of addList) set.add(h);
  return Array.from(set).join(", ");
}
