import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stlhockeysticks.com";

// Static marketing/catalog routes + every active product page. Product URLs
// route by category: mini sticks under /mini-sticks, everything else /sticks.
// If the DB is unreachable at build, the static portion still ships.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "",
    "/sticks",
    "/sticks/senior",
    "/sticks/intermediate",
    "/sticks/junior",
    "/sticks/youth",
    "/sticks/goalie",
    "/sticks/in-stock",
    "/mini-sticks",
    "/clubs",
    "/how-it-works",
    "/warranty",
    "/contact",
  ];
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { slug: true, category: true, createdAt: true },
    });
    productEntries = products.map((p) => {
      const isMini = p.category === "MINI_CLUB" || p.category === "MINI_FUN";
      return {
        url: `${BASE}/${isMini ? "mini-sticks" : "sticks"}/${p.slug}`,
        lastModified: p.createdAt ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
  } catch {
    // DB down at build time — static sitemap is still valid.
  }

  return [...staticEntries, ...productEntries];
}
