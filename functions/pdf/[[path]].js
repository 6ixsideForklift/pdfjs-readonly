export async function onRequest(context) {
  const { request, params } = context;

  // Everything after /pdf/ becomes the "tail"
  const tail = Array.isArray(params.path) ? params.path.join("/") : (params.path || "");
  if (!tail) return new Response("Missing PDF path", { status: 400 });

  // Fetch the PDF from your manuals domain
  const upstream = `https://manuals.6ixsideforklift.ca/${tail}`;
  const upstreamResp = await fetch(upstream, {
    headers: {
      // Forward Range for faster PDF streaming if the browser sends it
      "Range": request.headers.get("Range") || ""
    },
  });

  // Pass response through
  const headers = new Headers(upstreamResp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length");

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers,
  });
}
