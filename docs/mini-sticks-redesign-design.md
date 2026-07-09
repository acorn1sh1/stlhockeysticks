# Mini Sticks Redesign — System Design

Status: design 2026-07-07. Implemented same session via dev-loop.

## Problem

Current `/mini-sticks` shows two generic ProductCards (`club-custom-mini-stick`,
`fun-series-mini-stick`) with **inline add-to-cart** and low-contrast art (name/price
render faded over the gradient — hard to read). Andrew wants:

1. A **browsable catalog** — you go in and see what minis exist, you do NOT add to
   cart from the grid. Add-to-cart happens on a detail page.
2. **One mini per big STL club** — Affton, Kirkwood, Rockets, St. Peters, Meramec,
   Chesterfield (6). Each available **in stock or pre-order**.
3. **Three custom brand minis** — Fun Series designs under the STL brand, some in
   stock, some pre-order.
4. **Pre-order is load-bearing**: keeps upfront cost down while inventory is built.
5. **Everything DB-driven** — add/hide a club, flip stock, edit price all from `/admin`,
   zero code changes.

## Non-functional / constraints

Same stack: Next.js 15 (App Router, server components), Prisma + Railway Postgres,
Vercel, Clover checkout. No new infra. Reuse the existing inventory/stock + merged-catalog
machinery so minis behave exactly like full sticks for stock, pricing, and admin.

## Data model — no migration

The existing `Product` model already carries everything needed:

- `category` — `MINI_CLUB` / `MINI_FUN` (already seeded `Category` rows).
- `type` — `PREORDER` | `IN_STOCK` (the structural fork checkout already branches on).
- `inStock` — live on-hand count; auto-decrements on paid via the Clover webhook.
- `clubName` — already present for club-tied minis.
- `fixedColor` — **reused as the mini's accent color** (hex/name) for card + detail art.
  Admin already edits this field. Reusing it avoids a schema migration.

So the DB change is **seed data only**. One `Product` row per mini (9 total). Old two
generic minis are set `active: false` (not deleted — preserves any OrderItem FK).

### One code change in the merge layer

`getMergedCatalog()` only surfaces `fixed.color` for `IN_STOCK` items. Pre-order minis
need an accent too. Add an optional top-level `CatalogItem.accent`, populated from
`db.fixedColor` unconditionally, so both pre-order and in-stock minis get their color.
Purely additive; existing consumers ignore it.

## Availability logic (per mini, reused from ProductCard rules)

| Product state                     | Shown as                       | Buy action        |
|-----------------------------------|--------------------------------|-------------------|
| `IN_STOCK`, live stock > 0        | "In stock — pick up now"       | qty picker + cart |
| `IN_STOCK`, live stock == 0       | "Pre-order — next batch"       | pre-order (qty 1) |
| `PREORDER`                        | "Pre-order — next batch"       | pre-order (qty 1) |

Live stock comes from `getStockMap()` keyed by slug, same as the full-stick pages.

## Routes / components

```
/mini-sticks              (rewrite)  browse grid, NO inline cart
  ├─ Club Sticks section  → MiniCard[]  (MINI_CLUB)
  └─ Fun Series section   → MiniCard[]  (MINI_FUN)
  └─ "Run a club?" CTA → /clubs         (bulk custom order flow, unchanged)

/mini-sticks/[slug]       (new)      detail page WITH add-to-cart
  big art · name · desc · price · availability state · qty + Add to Cart · pickup note

components/MiniCard.tsx   (new)      art + name + price + availability pill + "View →"
                                     links to detail; deliberately no add-to-cart
app/page.tsx              (edit)     home mini teaser → readable, links to /mini-sticks
```

`MiniCard` is a client component only for the link/hover; no cart state. The detail page
add-to-cart reuses the existing `useCart().add(item, undefined, qty)` path — minis are
non-configurable so `add` takes no options, identical to how ProductCard adds a stocked
SKU today.

### Why a separate `/mini-sticks/[slug]` instead of reusing `/sticks/[slug]`

`/sticks/[slug]` hard-guards `if (!item?.options) notFound()` — it exists to render the
configurator. Minis have no configurator; routing them there means either weakening that
guard or faking an options object. A dedicated, simpler mini detail route keeps the stick
configurator page clean. Cost: a little markup duplication (art + price + cart button).
Accepted.

## Data flow

```
Postgres Product rows ──findMany(active)──▶ getMergedCatalog() ──▶ CatalogItem[]
                                              (adds .accent from fixedColor)
getStockMap() ──live inStock by slug──▶ availability state in MiniCard/detail
      │
/mini-sticks (server comp) filters category MINI_* → sections → MiniCard
/mini-sticks/[slug] (server comp) getMergedItem(slug) + stock → detail + cart
```

## Admin

No admin code change required. `AdminProducts` already supports add/edit/delete,
category dropdown (DB `Category`, includes MINI_CLUB/MINI_FUN), `type`, price, `inStock`,
`fixedColor`. Adding a 7th club = "Add product" in `/admin`, category MINI_CLUB, set
accent (`fixedColor`) and stock. Nice-to-have (not in this pass): surface `clubName` in
the admin form; today it's seed-only.

## Trade-offs / revisit later

- **Reuse `fixedColor` as accent** vs. new `accentColor` column: reuse avoids a migration
  and the field is already admin-editable; mild semantic overload. Revisit if minis ever
  need both a locked build color *and* a distinct wrap accent.
- **Deactivate vs. delete** old generic minis: deactivate is safe against order-history
  FKs. If they were never ordered, admin can hard-delete later.
- **Per-mini art** is a CSS gradient from the accent color + shared `StickPhoto`. Real
  club wrap SVGs (see `project-hockey-sticks`) can drop in later behind the same
  `MiniCard`/detail with no structural change.

## Verification plan

- `npx tsc --noEmit` in sandbox (Prisma client stale-model errors expected/ignored, per
  every prior session here).
- Existing 65-test vitest suite is the regression baseline — rerun on Andrew's Mac.
- Manual on Andrew's machine (sandbox is registry/engine-blocked): `npm run db:push`
  (no schema change here, but keeps client in sync) → `npm run db:seed` (adds the 9
  minis, deactivates old 2) → `npm run typecheck` → `npm test` → `next build` → click
  through `/mini-sticks` → a club detail → add to cart → checkout.
