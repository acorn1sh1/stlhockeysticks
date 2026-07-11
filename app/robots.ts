import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stlhockeysticks.com";

// Tell crawlers what to index. Admin + API are kept out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
