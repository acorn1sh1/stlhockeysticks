import { prisma } from "./db";
import { CATALOG, EMPTY_OPTIONS, type CatalogItem } from "./catalog";
import { withDbOptions } from "./options";

// DB `Product` rows are the runtime source of truth for the full product
// list — admin can add/hide/edit any product (preorder or in-stock) with no
// code change. The static CATALOG in ./catalog.ts is now only a seed
// fixture + offline fallback (used verbatim only if the DB is completely
// unreachable, so the storefront never goes dark).
//
// A product with `configurable: true` gets an `options` shell here (real
// values are filled in per-request by `withDbOptions`, scoped against
// OptionValue by category + sizingTier) — this works identically whether
// the product's slug exists in the static CATALOG or was created purely
// through /admin, which is what makes "add a new pre-order stick with zero
// code changes" actually work end to end.
export async function getMergedCatalog(): Promise<CatalogItem[]> {
  let dbProducts;
  try {
    dbProducts = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (e) {
    console.error("getMergedCatalog DB error — falling back to static catalog", e);
    return CATALOG;
  }
  if (!dbProducts.length) return CATALOG;

  const staticBySlug = new Map(CATALOG.map((c) => [c.slug, c]));

  return dbProducts.map((db): CatalogItem => {
    const staticItem = staticBySlug.get(db.slug);
    return {
      slug: db.slug,
      name: db.name,
      description: db.description,
      category: db.category,
      sizingTier: db.sizingTier ?? undefined,
      priceCents: db.priceCents,
      specs: db.specs?.length ? db.specs : staticItem?.specs,
      badge: db.badge ?? staticItem?.badge ?? (db.type === "IN_STOCK" ? "Pick Up Now" : undefined),
      options: db.configurable ? staticItem?.options ?? EMPTY_OPTIONS : undefined,
      inStock: db.type === "IN_STOCK" ? true : undefined,
      // Surface the locked build + live count for in-stock SKUs so the
      // in-stock listing can sort/filter on them. Only meaningful for
      // IN_STOCK; left undefined for pre-order items.
      fixed:
        db.type === "IN_STOCK"
          ? {
              flex: db.fixedFlex ?? undefined,
              curve: db.fixedCurve ?? undefined,
              hand: db.fixedHand ?? undefined,
              color: db.fixedColor ?? undefined,
              length: db.fixedLength ?? undefined,
            }
          : undefined,
      stockCount: db.type === "IN_STOCK" ? db.inStock : undefined,
    };
  });
}

export async function getMergedItem(slug: string): Promise<CatalogItem | undefined> {
  const list = await getMergedCatalog();
  const item = list.find((i) => i.slug === slug);
  if (!item) return undefined;
  // Pre-order items get their option matrix from the admin-editable DB
  // option catalog (falls back to the static options on any DB issue).
  return withDbOptions(item);
}
