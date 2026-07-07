# Dev-loop learnings — stlhockeysticks

## Environment
- `node_modules` is installed for macOS (darwin-arm64); the dev sandbox is linux-arm64.
  `vitest`/`vite` fail with `Cannot find module @rollup/rollup-linux-arm64-gnu`. Do NOT
  reinstall (would clobber the user's mac install). Instead validate pure-logic modules
  with Node's native TS stripping: `node --experimental-strip-types file.ts`. Keep such
  helpers import-light (type-only imports erase cleanly). The committed vitest specs still
  run on the user's real (mac) toolchain.
- Deleting files inside the mounted folder fails with "Operation not permitted" until you
  call `allow_cowork_file_delete`. Prefer writing scratch/check files under `/tmp`, and if
  the entry file must live in-repo (for relative imports), delete it via that tool after.
- `tsc --noEmit` runs fine and is the reliable gate here. There are PRE-EXISTING errors in
  `lib/coupons.ts` (references `startsAt`/`tiers`/`TIERED_PERCENT`) from in-flight schema
  work where the Prisma client isn't regenerated — filter those out; they're not yours.

## Conventions that worked
- DB `Product` is source of truth; static `lib/catalog.ts CATALOG` is seed + offline
  fallback. New display data should be plumbed Product → `getMergedCatalog` → `CatalogItem`.
- Keep filter/sort logic as pure functions in `lib/*` (testable), with a thin `"use client"`
  component on top. Derive filter facets from the items present (admin-extensible ethos).
- Static route segments (`/sticks/in-stock`) correctly win over `[slug]`; no guard needed.

## Follow-ups noted, not done
- `components/SizeTierPage.tsx` still shows an in-stock teaser per size tier. Left in place
  (scoped, useful) but it's a slight inconsistency with the pre-order/in-stock page split —
  confirm with owner whether to remove or link to `/sticks/in-stock?size=…`.
- Optional URL-query sync for in-stock filters (shareable/back-button) deferred.
