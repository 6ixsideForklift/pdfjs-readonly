export async function onRequest(context) {
  const { request, params, env } = context;

  // The path after /pdf/
  const tail = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");
  if (!tail) {
    return new Response("Missing PDF path", { status: 400 });
  }

  // IMPORTANT: this should be your Caddy domain (behind your tunnel)
  // Example: https://manuals.6ixsideforklift.ca/Service%20Manuals/.../file.pdf
  const upstreamUrl = new URL("https://manuals.6ixsideforklift.ca/" + tail);

  // Forward Range so PDF.js can stream/seek
  const headers = new Headers();
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  // Add Basic Auth to upstream (browser never sees this)
  // Set these as Pages environment variables
  const user = env.CADDY_USER;
  const pass = env.CADDY_PASS;
  if (!user || !pass) {
    return new Response("Missing CADDY_USER/CADDY_PASS env vars", { status: 500 });
  }
  const token = btoa(`${user}:${pass}`);
  headers.set("Authorization", `Basic ${token}`);

  // Fetch upstream PDF
  const resp = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers,
  });

  // Pass through status + key headers PDF.js cares about
  const outHeaders = new Headers(resp.headers);
  outHeaders.set("Access-Control-Allow-Origin", "*"); // same-origin anyway, harmless
  outHeaders.set("Cache-Control", "no-store");

  return new Response(resp.body, {
    status: resp.status,
    headers: outHeaders,
  });
}
