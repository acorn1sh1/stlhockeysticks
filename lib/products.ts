import { prisma } from "./db";
import { CATALOG, type CatalogItem } from "./catalog";

// The static CATALOG owns option matrices (flex/curve/colors/upcharges),
// specs, and badges — the stuff that rarely changes. The DB Product table
// owns the editable commercial fields: name, description, price, active,
// and stock. This merges them so admin edits (price, add/remove product)
// show up on the storefront, while the configurable option sets stay
// code-defined. On any DB failure we fall back to the static catalog so
// the storefront never goes dark.
export async function getMergedCatalog(): Promise<CatalogItem[]> {
  let dbProducts;
  try {
    dbProducts = await prisma.product.findMany({ where: { active: true } });
  } catch (e) {
    console.error("getMergedCatalog DB error — falling back to static catalog", e);
    return CATALOG;
  }
  if (!dbProducts.length) return CATALOG;

  const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));
  const merged: CatalogItem[] = [];

  // Known catalog items first (preserves ordering + option config).
  for (const c of CATALOG) {
    const db = bySlug.get(c.slug);
    if (!db) continue; // deactivated in DB → hide
    merged.push({
      ...c,
      name: db.name,
      description: db.description,
      priceCents: db.priceCents,
      category: db.category as CatalogItem["category"],
    });
    bySlug.delete(c.slug);
  }

  // Remaining = products added via /admin that aren't in the static catalog.
  // These are simple (non-configurable) SKUs. If they carry real inventory
  // (preorder = false) treat them as ships-now so they read live stock.
  for (const db of bySlug.values()) {
    merged.push({
      slug: db.slug,
      name: db.name,
      description: db.description,
      category: db.category as CatalogItem["category"],
      priceCents: db.priceCents,
      inStock: db.preorder === false ? true : undefined,
      badge: db.preorder === false ? "Ships Now" : undefined,
    });
  }

  return merged;
}

export async function getMergedItem(slug: string): Promise<CatalogItem | undefined> {
  const list = await getMergedCatalog();
  return list.find((i) => i.slug === slug);
}
