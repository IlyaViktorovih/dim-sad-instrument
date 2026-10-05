// Supabase Edge Function: server-side proxy for DROPS XML.
// It exists because browsers block direct cross-origin XML requests when
// the supplier feed does not provide the required CORS headers.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!url) return json({ error: "XML URL is required" }, 400);

    const parsed = new URL(url);

    // Only allow DROPS supplier feeds. This prevents the proxy from becoming
    // an unrestricted server-side URL fetcher (SSRF proxy).
    const allowedHost =
      parsed.hostname === "drops.in.ua" ||
      parsed.hostname.endsWith(".drops.in.ua");

    if (parsed.protocol !== "https:" || !allowedHost) {
      return json({ error: "Дозволені лише HTTPS-посилання DROPS." }, 400);
    }

    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/xml,text/xml,*/*"
      },
      redirect: "follow"
    });

    if (!upstream.ok) {
      return json({
        error: "DROPS повернув HTTP " + upstream.status
      }, 502);
    }

    const xml = await upstream.text();

    if (!xml.trim()) {
      return json({ error: "DROPS повернув порожній XML." }, 502);
    }

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Невідома помилка проксі."
    }, 500);
  }
});
