# Design: Split In-Stock and Pre-Order into Separate Pages (+ In-Stock Sort/Filter)

## 1. Requirements

**Functional**
- Two distinct catalog pages:
  - `/sticks` — **pre-order only** (built-to-order tiers: Senior/Int/Jr/Youth/Goalie).
  - `/sticks/in-stock` — **in-stock only** (ships-now fixed SKUs).
- Home page keeps showing **both** ("Shop by Size" pre-order + "On the Shelf" in-stock), but each CTA routes to its own dedicated page. "See all in-stock" lands on a page with **only** in-stock sticks.
- In-stock page lists each stick by its build (flex / curve / hand / color / size), same feel as the pre-order tiers.
- In-stock page must **sort and filter** so it stays usable when the catalog grows to ~100 heterogeneous SKUs (~2yr horizon). Every SKU could be a different build.

**Non-functional / constraints**
- No new backend infra. Reuse Prisma `Product` + `getMergedCatalog` / `getStockMap`.
- Admin can add an in-stock SKU with **no code change** (existing philosophy).
- ~100 SKUs is small — client-side filter/sort is adequate; no pagination or search index needed yet.
- Reuse existing `ProductCard`; keep blast radius small.

## 2. Current state

- `/sticks` is a **combined** page: an `#in-stock` anchor section at top, then the five pre-order tiers.
- Home links "See all in-stock" and "Pick Up Now" both point at `/sticks#in-stock` (a mixed page).
- `Product` already stores per-SKU build attributes for in-stock items: `fixedFlex, fixedCurve, fixedHand, fixedColor, fixedLength, sizingTier, category, priceCents, inStock` (on-hand count).
- **Gap:** `getMergedCatalog` collapses a Product to `CatalogItem` and drops the `fixed*` fields — so the listing currently has nothing to sort/filter on.

## 3. High-level design

```
Home (/)                     unchanged sections, CTAs re-pointed
 ├─ "Shop by Size"  ── link ─▶ /sticks            (pre-order only)
 └─ "On the Shelf"  ── link ─▶ /sticks/in-stock   (in-stock only)   ◀── NEW

/sticks            (server)  pre-order tiers only  (in-stock block removed)
/sticks/in-stock   (server)  fetch → filter type=IN_STOCK → <InStockBrowser>   ◀── NEW
        └─ InStockBrowser (client)  facet + sort state → ProductCard grid       ◀── NEW
```

Data flow: server component fetches `getStockMap()` + `getMergedCatalog()` (as today), keeps only in-stock items, passes plain array to a client `InStockBrowser`. The browser derives its filter facets **from the items present** (only shows curves/colors/flexes that actually exist), holds sort+filter state, and renders the existing `ProductCard`.

## 4. Data model changes

No schema/migration. Only plumb existing columns through the read path.

Extend `CatalogItem` (lib/catalog.ts) with an optional build block used by in-stock SKUs:

```ts
fixed?: {
  flex?: number; curve?: string; hand?: string;
  color?: string; length?: string;
};
stockCount?: number; // on-hand units, for sort + "only X left"
```

`getMergedCatalog` (lib/products.ts) populates `fixed` and `stockCount` from the `Product.fixed*` / `Product.inStock` columns when `type === "IN_STOCK"`. Pre-order items leave them undefined — no behavior change on `/sticks`.

## 5. Filter / sort model (in-stock page)

**Facets** — derived dynamically from the loaded SKUs (scales with admin-added values, nothing hardcoded):
- Size / tier (`sizingTier`, plus Goalie via `category`)
- Flex (values present)
- Curve
- Hand
- Color
- Availability: ships-now vs pre-order-fallback (stock 0)
- Price range (min/max of present SKUs)

**Sort options:** Price ↑ / Price ↓ / Flex ↑ / Flex ↓ / Newest / Name (A–Z). Default: ships-now first, then Price ↑.

State lives in the client component. **Optional** URL-query sync (`?sort=&size=&curve=…`) so filtered views are shareable/back-button friendly; `localStorage` remembers last sort. v1 can ship with plain React state and add query sync as a fast follow.

## 6. Components / files touched

| File | Change |
|---|---|
| `lib/catalog.ts` | Add `fixed?` + `stockCount?` to `CatalogItem`. |
| `lib/products.ts` | Map `Product.fixed*` + `inStock` into `CatalogItem`. |
| `app/sticks/in-stock/page.tsx` | **New** server page: in-stock only. |
| `components/InStockBrowser.tsx` | **New** client: facets, sort/filter, grid. |
| `app/sticks/page.tsx` | Remove in-stock section; pre-order only; update intro copy. |
| `app/page.tsx` | Re-point "See all in-stock" + "Pick Up Now" CTAs to `/sticks/in-stock`. |
| `components/Nav*` | Add "In Stock" nav link (if a nav exists). |
| `ProductCard.tsx` | Unchanged (reused as-is). |

## 7. Scale & reliability

- 100 SKUs × client-side filter = trivial; renders instantly, no API round-trips.
- Server page stays `force-dynamic`; stock is always live. On DB error `getStockMap` returns `{}` → items fall back to pre-order (safe direction, existing behavior).
- Facet derivation is O(n) per render — negligible at this n.

## 8. Trade-offs & what to revisit

- **Client-side vs server-side filtering:** client-side chosen for simplicity/latency at n ≤ ~100. Keep the facet keys shaped like query params so they map cleanly to DB `WHERE/ORDER BY` later. **Revisit** past ~300 SKUs, or when image payload makes a full-list fetch heavy → move to server query params + paginated Prisma query.
- **Dynamic vs hardcoded facets:** dynamic keeps the admin-add-with-no-code promise (a new curve just appears). Minor extra compute, worth it.
- **URL-query sync:** deferred to keep v1 small; low risk to add later.
- **Reuse ProductCard:** minimizes risk; if in-stock needs a denser card later, fork then.

## 9. Rollout

1. Plumb `fixed*` / `stockCount` through the read path.
2. Add `/sticks/in-stock` + `InStockBrowser`.
3. Strip in-stock from `/sticks`, re-point home CTAs, add nav link.
4. Verify: home CTAs land on in-stock-only page; `/sticks` shows no in-stock; filters/sorts behave with a seeded set of varied SKUs.
