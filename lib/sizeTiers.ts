// Shared definitions for the per-size landing pages (/sticks/senior, etc).
// Keeps the tier list, matching logic, and copy in one place so the
// homepage grid and the dedicated tier pages can't drift out of sync.

import type { CatalogItem } from "./catalog";

export type TierKey = "senior" | "intermediate" | "junior" | "youth" | "goalie";

export type TierDef = {
  key: TierKey;
  label: string;
  tag: string;
  match: (c: CatalogItem) => boolean;
};

// Matches by the explicit `Product.sizingTier` field (set by admin/seed)
// when present; falls back to slug-substring guessing only for
// static-fallback items that never got a DB row (offline mode). The
// FULL_STICK guard keeps minis out and keeps goalie sticks (which also
// carry sizingTier "SENIOR", for flex-pool scoping) out of the Senior page.
//
// Note: these 4 tiers + goalie are still literal Next.js routes
// (app/sticks/{senior,intermediate,junior,youth,goalie}/page.tsx) — the
// admin-editable `SizingTier` DB table drives option scoping and labels
// used elsewhere, but adding a *brand-new* tier's own landing page is still
// a small code change (one new route folder). See docs/admin-catalog-config-design.md.
const fullStickTier = (tierKey: string, slugHint: string) => (c: CatalogItem) =>
  c.category === "FULL_STICK" && (c.sizingTier ? c.sizingTier === tierKey : c.slug.includes(slugHint));

export const SIZE_TIERS: TierDef[] = [
  { key: "senior", label: "Senior", tag: "Adult & beer league", match: fullStickTier("SENIOR", "senior") },
  { key: "intermediate", label: "Intermediate", tag: "Stepping up to full ice", match: fullStickTier("INT", "intermediate") },
  { key: "junior", label: "Junior", tag: "Growing players", match: fullStickTier("JR", "junior") },
  { key: "youth", label: "Youth", tag: "Little rippers", match: fullStickTier("YTH", "youth") },
  { key: "goalie", label: "Goalie", tag: "Between the pipes", match: (c) => c.category === "GOALIE" },
];

export function getTier(key: string): TierDef | undefined {
  return SIZE_TIERS.find((t) => t.key === key);
}
