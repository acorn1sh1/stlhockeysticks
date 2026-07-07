"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { CatalogItem } from "@/lib/catalog";
import {
  applyFilterSort,
  deriveFacets,
  hasActiveFilters,
  sizeLabel,
  SORT_OPTIONS,
  type InStockFilters,
  type SortKey,
} from "@/lib/instock";

// Client-side filter/sort over the in-stock SKUs. Adequate up to a few
// hundred items (see docs/in-stock-page-design.md); revisit for server-side
// paging past that. Facets come from the items present, so new admin-added
// curves/colors surface automatically.
export default function InStockBrowser({
  items,
  stockBySlug,
}: {
  items: CatalogItem[];
  stockBySlug: Record<string, number>;
}) {
  const [sort, setSort] = useState<SortKey>("ships");
  const [filters, setFilters] = useState<InStockFilters>({});

  const facets = useMemo(() => deriveFacets(items), [items]);
  const shown = useMemo(
    () => applyFilterSort(items, filters, sort),
    [items, filters, sort]
  );

  const set = (patch: Partial<InStockFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters({});

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-8 text-center">
        <p className="font-bold">Nothing on the shelf right now.</p>
        <p className="mt-1 text-sm text-black/60">
          Every build is available to pre-order into the next monthly batch.
        </p>
        <Link
          href="/sticks"
          className="mt-4 inline-block rounded-full bg-ink px-6 py-2.5 font-bold text-paper transition hover:bg-ink/80"
        >
          Shop pre-order builds →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORT_OPTIONS.map((o) => [o.key, o.label])}
        />
        {facets.sizes.length > 1 && (
          <Select
            label="Size"
            value={filters.size ?? ""}
            onChange={(v) => set({ size: v || undefined })}
            options={[
              ["", "All sizes"],
              ...facets.sizes.map((s) => [s, sizeLabel(s)] as [string, string]),
            ]}
          />
        )}
        {facets.flexes.length > 1 && (
          <Select
            label="Flex"
            value={filters.flex ?? ""}
            onChange={(v) => set({ flex: v || undefined })}
            options={[
              ["", "All flex"],
              ...facets.flexes.map((n) => [String(n), String(n)] as [string, string]),
            ]}
          />
        )}
        {facets.curves.length > 1 && (
          <Select
            label="Curve"
            value={filters.curve ?? ""}
            onChange={(v) => set({ curve: v || undefined })}
            options={[
              ["", "All curves"],
              ...facets.curves.map((c) => [c, c] as [string, string]),
            ]}
          />
        )}
        {facets.hands.length > 1 && (
          <Select
            label="Hand"
            value={filters.hand ?? ""}
            onChange={(v) => set({ hand: v || undefined })}
            options={[
              ["", "Both hands"],
              ...facets.hands.map((h) => [h, h] as [string, string]),
            ]}
          />
        )}
        {facets.colors.length > 1 && (
          <Select
            label="Color"
            value={filters.color ?? ""}
            onChange={(v) => set({ color: v || undefined })}
            options={[
              ["", "All colors"],
              ...facets.colors.map((c) => [c, c] as [string, string]),
            ]}
          />
        )}
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={!!filters.shipsNowOnly}
            onChange={(e) => set({ shipsNowOnly: e.target.checked || undefined })}
          />
          Ships now only
        </label>
        {hasActiveFilters(filters) && (
          <button
            onClick={clear}
            className="text-sm font-bold text-volt-dark hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm font-semibold text-black/50">
          {shown.length} {shown.length === 1 ? "stick" : "sticks"}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="font-bold">No in-stock sticks match those filters.</p>
          <button
            onClick={clear}
            className="mt-3 rounded-full bg-ink px-6 py-2.5 font-bold text-paper transition hover:bg-ink/80"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {shown.map((item) => (
            <ProductCard
              key={item.slug}
              item={item}
              stock={stockBySlug[item.slug] ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold">
      <span className="text-black/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-black/20 px-2.5 py-1.5 text-sm font-semibold"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
