export async function onRequest(context) {
  const { request, env, params } = context;

  // params.path is an array of path segments after /pdf/
  const tail = (params.path || []).join("/");
  const url = new URL(request.url);

  // Preserve token querystring (?t=...)
  const qs = url.search ? url.search : "";

  // Forward to Gatekeeper (same token, same path)
  const gateBase = (env.GATEKEEPER_BASE || "https://thegatekeeper.6ixsideforklift.workers.dev").replace(/\/+$/, "");
  const target = `${gateBase}/pdf/${tail}${qs}`;

  // Forward Range requests for PDF.js
  const headers = new Headers(request.headers);
  // Optional: strip cookies (keeps it cleaner)
  headers.delete("cookie");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
  });

  // Copy headers back, but keep it uncached
  const respHeaders = new Headers(upstream.headers);
  respHeaders.set("Cache-Control", "no-store, private, max-age=0");
  respHeaders.set("Pragma", "no-cache");
  respHeaders.set("Expires", "0");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
