# Admin catalog config — system design

Goal: admin add/remove/hide any enum value, attribute, category, sizing tier, or product (preorder or in-stock) — zero code deploys.

## 1. Current state (why more work needed)

Already DB-driven: `OptionValue` table (flex/curve/hand/color/length/paddle values) — admin can add/hide/set-default/upcharge today via `/admin` → Pre-Order Options.

Still code-locked:

| Thing | Where hardcoded | Problem |
|---|---|---|
| Category (FULL_STICK/GOALIE/MINI_CLUB/MINI_FUN) | Prisma `enum Category` | new category = schema migration |
| Attribute kind (FLEX/CURVE/HAND/COLOR/LENGTH/PADDLE) | Prisma `enum OptionKind` | new attribute type = schema migration |
| Sizing tier (SENIOR/INT/JR/YTH) | `lib/sizeTiers.ts` array + slug-substring matching (`slug.includes("senior")`) | new tier = code edit in 3 files |
| **Pre-order product list itself** | `lib/catalog.ts` static `CATALOG` array (name/desc/specs/badge/options) | `lib/products.ts` `getMergedCatalog()` only lets DB override name/price/desc for slugs **already in CATALOG**. A product added purely via `/admin/product` gets no `options` object → configurator never appears. This is the actual blocker for "add a stick, no code change." |
| Product specs/badge/image | not in `AdminProducts.tsx` edit form at all | can't edit after creation |
| In-stock fixed build (fixedFlex/fixedCurve/...) | columns exist, zero UI | can't set via admin |
| Hard delete | only `active` toggle everywhere | fine for hide, no cleanup path |

## 2. Requirements

Functional: admin can (a) CRUD Category, AttributeKind, SizingTier — label, hide, reorder, add-new, delete-if-unused; (b) CRUD OptionValue as today but scoped against the new tables instead of literals; (c) create a brand-new pre-order (configurable) stick from `/admin` alone — name, slug, description, category, sizing tier, price, specs, badge, image — and have the flex/curve/hand/color/length picker populate automatically from OptionValue rows; (d) full CRUD on in-stock SKUs including fixed build + image + description; (e) hide (soft) always available, hard-delete only when zero `OrderItem`s reference the row.

Non-functional: storefront must never go dark on a DB hiccup (existing convention — static fallback); no downtime migration; existing `Order.items[].options` JSON (already plain strings, not enum refs) must not need backfill.

Constraint: sandbox here can't run `prisma db push`/`next build` (registry-blocked) — same as every prior session on this project. Verify via `tsc --noEmit`; real `db push`/build happens on Andrew's machine or CI.

## 3. Data model changes

New tables (mirror the existing `OptionValue` shape — key/label/sortOrder/active):

```prisma
model Category {
  id        String  @id @default(cuid())
  key       String  @unique   // "FULL_STICK" — old enum value, becomes seed data
  label     String
  sortOrder Int     @default(0)
  active    Boolean @default(true)
}

model SizingTier {
  id        String  @id @default(cuid())
  key       String  @unique   // "SENIOR" | "INT" | "JR" | "YTH"
  label     String
  tag       String  @default("") // marketing blurb, currently in sizeTiers.ts
  sortOrder Int     @default(0)
  active    Boolean @default(true)
}

model AttributeKind {
  id        String  @id @default(cuid())
  key       String  @unique   // "FLEX", "CURVE", ... admin can add "GRIP" etc.
  label     String
  unit      String  @default("") // e.g. `"` for length
  sortOrder Int     @default(0)
  active    Boolean @default(true)
}
```

`Product` gains:

```prisma
categoryKey   String   // was enum Category — validated against Category.key in API layer
sizingTier    String?  // "SENIOR"|"INT"|"JR"|"YTH"|null — explicit, replaces slug matching
specs         String[] @default([])
badge         String?
configurable  Boolean  @default(false) // true = build options from OptionValue at render time
```

`OptionValue.kind` changes `OptionKind` (enum) → `String`, validated against `AttributeKind.key`. `sizing`/`category` stay strings (unchanged shape), just validated against the new tables + `"ALL"` sentinel instead of a literal array.

`ProductType` (PREORDER/IN_STOCK) **stays a real enum** — it's a structural fork that checkout/cart branch on, not a catalog value that grows. Revisit only if a third fulfillment model appears.

## 4. Migration plan (staged, not one big-bang)

1. **Schema-only**: add the 3 new tables + new `Product` columns (nullable/defaulted, additive). Backfill script seeds Category/SizingTier/AttributeKind from the current enum members, sets `Product.categoryKey` from old `category`, derives `sizingTier` once via the existing slug-substring heuristic. Old enum columns left in place, unused. Ship, verify nothing broke (pure additive).
2. **Catalog merge rewrite** (`lib/products.ts`, `lib/options.ts`, `lib/sizeTiers.ts`): `getMergedCatalog()`/`getMergedItem()` stop treating `lib/catalog.ts` as the list of "real" products — it becomes seed-fixture + offline-fallback only. Any `Product` row with `configurable=true` gets its `options` shell built from `OptionValue` scoped by `categoryKey`+`sizingTier` (the scoping logic already exists in `lib/options.ts`, it just needs to run unconditionally instead of only when the static item already carries `options`). `sizeTiers.ts` reads `SizingTier` table (same 15s-TTL cache pattern already used for options) instead of the hardcoded array. **This step has the widest blast radius — touches every storefront page and checkout pricing. Do it alone, verify with the existing vitest suite (65/65 today) before touching admin UI.**
3. **Admin UI**: new `AdminCategories.tsx` / `AdminAttributeKinds.tsx` / `AdminSizingTiers.tsx` (same CRUD pattern/shape as `AdminOptions.tsx`); `AdminOptions.tsx`'s literal `KINDS`/`SIZINGS`/`CATEGORIES` arrays become props from the DB; `AdminProducts.tsx` edit form expands to description/image/specs/badge/sizingTier/configurable + the `fixed*` fields for in-stock SKUs; add delete button (shown only when a `hasOrders` flag from the page query is false).
4. **Cleanup** (later, after a burn-in period in production): drop the now-unused `Category`/`OptionKind` Prisma enums and old `Product.category` column.

## 5. API changes

New routes, same auth/shape as existing `/api/admin/options`:
- `POST /api/admin/category`, `/api/admin/attribute-kind`, `/api/admin/sizing-tier` — upsert-by-key (create/patch active/label/sortOrder), reject delete if referenced.
- `/api/admin/product` — extend accepted fields (specs, badge, imageUrl, sizingTier, configurable, fixed*); add hard-delete (blocked 409 if `OrderItem` count > 0, message tells admin to hide instead).
- `/api/admin/options` — swap hardcoded `KINDS`/`SIZINGS`/`CATEGORIES` validation arrays for DB lookups against the new tables.

## 6. Trade-offs

1. **String "soft FK" instead of Prisma relations** for category/sizingTier/kind. Simpler, keeps `OrderItem.options` JSON untouched, matches the pattern `OptionValue.sizing/category` already uses — but loses DB-level referential integrity (a bad key could only get in via direct DB edit, not via the API, which validates). Chose this over real relations because converting every relation is much higher-risk than the enum→string swap for a project that already leans on this pattern.
2. **Static `catalog.ts` demoted to seed/fallback, not runtime authority** — biggest behavior change in this doc. Necessary to satisfy "add a stick with zero code changes," but it's the one step that can take the whole storefront down if done wrong, hence its own isolated phase + full test-suite gate before UI work starts.
3. **Hide-first, hard-delete later** — shipping delete for every entity (Category/AttributeKind/SizingTier/Product/OptionValue) in one pass multiplies the "is this referenced anywhere" checks. Recommend hide-only in phase 3, add delete as a fast follow once the reference-checking helper is written once and reused.

## 7. Rollout order
Phase 1 (schema+backfill) → verify → Phase 2 (catalog merge rewrite) → run vitest suite → Phase 3 (admin UI, new CRUD screens + expanded product form) → verify on Andrew's machine (`npm run db:push`, `next build`, `npm test`) since sandbox can't reach the registry → Phase 4 (drop old enums, add hard-delete).
