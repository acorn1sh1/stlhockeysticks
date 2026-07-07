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

export const SIZE_TIERS: TierDef[] = [
  { key: "senior", label: "Senior", tag: "Adult & beer league", match: (c) => c.slug.includes("senior") },
  { key: "intermediate", label: "Intermediate", tag: "Stepping up to full ice", match: (c) => c.slug.includes("intermediate") },
  { key: "junior", label: "Junior", tag: "Growing players", match: (c) => c.slug.includes("junior") },
  { key: "youth", label: "Youth", tag: "Little rippers", match: (c) => c.slug.includes("youth") },
  { key: "goalie", label: "Goalie", tag: "Between the pipes", match: (c) => c.category === "GOALIE" },
];

export function getTier(key: string): TierDef | undefined {
  return SIZE_TIERS.find((t) => t.key === key);
}
