import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are allowed" }, { status: 400 });
    }

    // Fetch HTML server-side (no CORS issues)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEODashboardBot/1.0; +https://seo-dashboard.vercel.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Also check robots.txt and sitemap.xml
    const origin = parsedUrl.origin;
    let hasRobotsTxt = false;
    let hasSitemapXml = false;
    let robotsContent = "";

    const [robotsRes, sitemapRes] = await Promise.allSettled([
      fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": "SEODashboardBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${origin}/sitemap.xml`, {
        headers: { "User-Agent": "SEODashboardBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
      robotsContent = await robotsRes.value.text();
      hasRobotsTxt = robotsContent.toLowerCase().includes("user-agent");
    }

    if (sitemapRes.status === "fulfilled" && sitemapRes.value.ok) {
      const sitemapText = await sitemapRes.value.text();
      hasSitemapXml =
        sitemapText.toLowerCase().includes("<url") ||
        sitemapText.toLowerCase().includes("<sitemap");
    }

    // Check response headers for additional SEO signals
    const headers: Record<string, string> = {};
    const seoHeaders = [
      "x-robots-tag",
      "content-type",
      "content-encoding",
      "cache-control",
      "x-frame-options",
      "strict-transport-security",
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
    ];
    for (const h of seoHeaders) {
      const val = response.headers.get(h);
      if (val) headers[h] = val;
    }

    return NextResponse.json({
      html,
      finalUrl: response.url,
      statusCode: response.status,
      headers,
      hasRobotsTxt,
      hasSitemapXml,
      robotsContent: robotsContent.substring(0, 2000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Request timed out (15s)" }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
