"use client";

import { fmtPrice } from "@/lib/catalog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Sizing-tier key → storefront page + short label, for the Size column link.
const TIER_META: Record<string, { label: string; route: string }> = {
  SENIOR: { label: "Senior", route: "/sticks/senior" },
  INT: { label: "Intermediate", route: "/sticks/intermediate" },
  JR: { label: "Junior", route: "/sticks/junior" },
  YTH: { label: "Youth", route: "/sticks/youth" },
};
const TIER_ORDER = ["SENIOR", "INT", "JR", "YTH"];
const tierRank = (t: string | null) => {
  const i = t ? TIER_ORDER.indexOf(t) : -1;
  return i === -1 ? 99 : i; // unknown / tier-less sorts last
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  sizingTier: string | null;
  specs: string[];
  badge: string | null;
  imageUrl: string | null;
  configurable: boolean;
  priceCents: number;
  costCents: number;
  inStock: number;
  preorder: boolean;
  active: boolean;
  comingSoon: boolean;
  fixedFlex: number | null;
  fixedCurve: string | null;
  fixedHand: string | null;
  fixedColor: string | null;
  fixedLength: string | null;
  hasOrders: boolean;
};

// Option catalog value (subset) used by the per-product override editor.
export type OptionValueLite = {
  id: string;
  kind: string;
  value: string;
  label: string | null;
  sizing: string;
  category: string;
};

async function post(body: unknown) {
  return fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

type SortKey = "name" | "category" | "size" | "price" | "cost" | "active";

// Clickable column header — click to sort, click again to flip direction.
function SortTh({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th className="p-3">
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        <span className="text-[9px]">{active ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

export default function AdminProducts({
  products,
  categories,
  sizingTiers,
  optionValues,
  productOptions,
  attributeKinds,
}: {
  products: ProductRow[];
  categories: string[];
  sizingTiers: string[];
  optionValues: OptionValueLite[];
  productOptions: Record<string, string[]>; // productId → pinned optionValueId[]
  attributeKinds: string[]; // ordered AttributeKind keys
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  // Client-side sort. Default matches the server order (active first, name A–Z).
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "active", dir: 1 });
  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 } : { key, dir: 1 }));

  const sorted = [...products].sort((a, b) => {
    const d = sort.dir;
    switch (sort.key) {
      case "category":
        return d * (a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      case "size":
        // Order by tier (Senior→Youth), tier-less products (goalie/minis) last.
        return d * (tierRank(a.sizingTier) - tierRank(b.sizingTier)) || a.name.localeCompare(b.name);
      case "price":
        return d * (a.priceCents - b.priceCents);
      case "cost":
        return d * (a.costCents - b.costCents);
      case "active":
        // active first when ascending, then name A–Z
        return d * (Number(b.active) - Number(a.active)) || a.name.localeCompare(b.name);
      default:
        return d * a.name.localeCompare(b.name);
    }
  });

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Products &amp; Prices</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add product"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Prices here are what the storefront shows and what checkout charges.
        Mark a pre-order product &quot;Configurable&quot; to build its
        flex/curve/hand/color/length picker from the Pre-Order Options table
        below — works for any product, not just the original lineup.
      </p>

      {adding && (
        <AddProduct
          categories={categories}
          sizingTiers={sizingTiers}
          onDone={() => { setAdding(false); router.refresh(); }}
        />
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <SortTh label="Product" k="name" sort={sort} onSort={toggle} />
              <SortTh label="Category" k="category" sort={sort} onSort={toggle} />
              <SortTh label="Size" k="size" sort={sort} onSort={toggle} />
              <SortTh label="Price" k="price" sort={sort} onSort={toggle} />
              <SortTh label="Cost" k="cost" sort={sort} onSort={toggle} />
              <SortTh label="Active" k="active" sort={sort} onSort={toggle} />
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <ProductRowEditor
                key={p.id}
                row={p}
                categories={categories}
                sizingTiers={sizingTiers}
                optionValues={optionValues}
                overrideIds={productOptions[p.id] ?? []}
                attributeKinds={attributeKinds}
                onSaved={() => router.refresh()}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductRowEditor({
  row,
  categories,
  sizingTiers,
  optionValues,
  overrideIds,
  attributeKinds,
  onSaved,
}: {
  row: ProductRow;
  categories: string[];
  sizingTiers: string[];
  optionValues: OptionValueLite[];
  overrideIds: string[];
  attributeKinds: string[];
  onSaved: () => void;
}) {
  const [dollars, setDollars] = useState((row.priceCents / 100).toFixed(2));
  const [costDollars, setCostDollars] = useState((row.costCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dirty =
    Math.round(Number(dollars) * 100) !== row.priceCents ||
    Math.round(Number(costDollars) * 100) !== row.costCents;

  async function savePrice() {
    setBusy(true);
    const res = await post({
      slug: row.slug,
      priceCents: Math.round(Number(dollars) * 100),
      costCents: Math.round(Number(costDollars) * 100),
    });
    setBusy(false);
    if (res.ok) onSaved();
  }
  async function toggleActive() {
    const res = await post({ slug: row.slug, active: !row.active });
    if (res.ok) onSaved();
  }

  return (
    <>
      <tr className={`border-b border-black/5 ${expanded ? "" : "last:border-0"} ${row.active ? "" : "opacity-50"}`}>
        <td className="p-3">
          <div className="font-semibold">
            {row.name}
            {row.comingSoon && (
              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase text-black/50">
                Coming Soon
              </span>
            )}
          </div>
          <div className="text-xs text-black/40">{row.slug}</div>
        </td>
        <td className="p-3 text-black/60">{row.category.replace("_", " ")}</td>
        <td className="p-3">
          {row.sizingTier && TIER_META[row.sizingTier] ? (
            <Link
              href={TIER_META[row.sizingTier].route}
              target="_blank"
              className="font-semibold text-volt-dark underline decoration-dotted underline-offset-2 hover:text-ink"
              title={`View the ${TIER_META[row.sizingTier].label} page`}
            >
              {TIER_META[row.sizingTier].label}
            </Link>
          ) : (
            <span className="text-black/30">—</span>
          )}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-black/40">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={dollars}
              onChange={(e) => setDollars(e.target.value)}
              className="w-24 rounded-lg border border-black/20 px-2 py-1 text-right"
            />
            <button
              onClick={savePrice}
              disabled={!dirty || busy}
              className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              {busy ? "..." : "Save"}
            </button>
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1" title="Default supplier unit cost — used for batch margin & the supplier order sheet. Override per batch from the Batches panel.">
            <span className="text-black/40">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costDollars}
              onChange={(e) => setCostDollars(e.target.value)}
              className="w-20 rounded-lg border border-black/20 px-2 py-1 text-right"
            />
          </div>
        </td>
        <td className="p-3">
          <button
            onClick={toggleActive}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              row.active ? "bg-volt/30 text-ink" : "bg-black/10 text-black/50"
            }`}
          >
            {row.active ? "Active" : "Hidden"}
          </button>
        </td>
        <td className="p-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60 hover:bg-black/10"
          >
            {expanded ? "Close" : "Edit"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-black/5 last:border-0">
          <td colSpan={7} className="bg-black/[0.02] p-4">
            <ProductDetailEditor
              row={row}
              categories={categories}
              sizingTiers={sizingTiers}
              optionValues={optionValues}
              overrideIds={overrideIds}
              attributeKinds={attributeKinds}
              onSaved={onSaved}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ProductDetailEditor({
  row,
  categories,
  sizingTiers,
  optionValues,
  overrideIds,
  attributeKinds,
  onSaved,
}: {
  row: ProductRow;
  categories: string[];
  sizingTiers: string[];
  optionValues: OptionValueLite[];
  overrideIds: string[];
  attributeKinds: string[];
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: row.name,
    description: row.description,
    category: row.category,
    sizingTier: row.sizingTier ?? "",
    badge: row.badge ?? "",
    imageUrl: row.imageUrl ?? "",
    specs: row.specs.join(", "),
    configurable: row.configurable,
    preorder: row.preorder,
    comingSoon: row.comingSoon,
    inStock: String(row.inStock),
    fixedFlex: row.fixedFlex != null ? String(row.fixedFlex) : "",
    fixedCurve: row.fixedCurve ?? "",
    fixedHand: row.fixedHand ?? "",
    fixedColor: row.fixedColor ?? "",
    fixedLength: row.fixedLength ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setError("");
    const res = await post({
      slug: row.slug,
      name: f.name,
      description: f.description,
      category: f.category,
      sizingTier: f.sizingTier || null,
      badge: f.badge || null,
      imageUrl: f.imageUrl || null,
      specs: f.specs.split(",").map((s) => s.trim()).filter(Boolean),
      configurable: f.configurable,
      preorder: f.preorder,
      comingSoon: f.comingSoon,
      inStock: Number(f.inStock),
      fixedFlex: f.fixedFlex === "" ? "" : Math.floor(Number(f.fixedFlex)),
      fixedCurve: f.fixedCurve,
      fixedHand: f.fixedHand,
      fixedColor: f.fixedColor,
      fixedLength: f.fixedLength,
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Save failed");
  }

  async function del() {
    setBusy(true);
    setError("");
    const res = await post({ slug: row.slug, delete: true });
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Delete failed");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Name</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Category</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {categories.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Description</span>
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Image URL</span>
        <input value={f.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Badge</span>
        <input value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. Best Seller" className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Specs (comma-separated)</span>
        <input value={f.specs} onChange={(e) => set("specs", e.target.value)} placeholder="350g, 18K weave, Mid kick" className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>

      <div className="sm:col-span-2 my-1 border-t border-black/10 pt-3">
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={f.configurable} onChange={(e) => set("configurable", e.target.checked)} />
          Configurable (builds flex/curve/hand/color/length picker from Pre-Order Options)
        </label>
        {f.configurable && (
          <>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase text-black/40">Sizing tier (scopes flex &amp; length)</span>
              <select value={f.sizingTier} onChange={(e) => set("sizingTier", e.target.value)} className="w-full max-w-xs rounded-lg border border-black/20 px-3 py-2 text-sm">
                <option value="">None</option>
                {sizingTiers.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <ProductOptionOverrides
              productId={row.id}
              tier={f.sizingTier}
              category={f.category}
              optionValues={optionValues}
              attributeKinds={attributeKinds}
              initialOverrideIds={overrideIds}
              onSaved={onSaved}
            />
          </>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.preorder} onChange={(e) => set("preorder", e.target.checked)} />
        Pre-order (built to order, no live stock)
      </label>
      <label className="flex items-center gap-2 text-sm" title="Card shows on the site with a Coming Soon badge but can't be opened or bought. Uncheck when it's ready to sell.">
        <input type="checkbox" checked={f.comingSoon} onChange={(e) => set("comingSoon", e.target.checked)} />
        Coming Soon (visible, not buyable)
      </label>
      {!f.preorder && (
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase text-black/40">On-hand stock</span>
          <input type="number" value={f.inStock} onChange={(e) => set("inStock", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
        </label>
      )}

      {!f.preorder && !f.configurable && (
        <div className="sm:col-span-2 grid gap-3 rounded-xl bg-black/5 p-3 sm:grid-cols-4">
          <p className="text-xs font-bold uppercase text-black/40 sm:col-span-4">Locked build (in-stock SKU, no customization)</p>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-black/40">Flex</span>
            <input type="number" value={f.fixedFlex} onChange={(e) => set("fixedFlex", e.target.value)} className="w-full rounded-lg border border-black/20 px-2 py-1 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-black/40">Curve</span>
            <input value={f.fixedCurve} onChange={(e) => set("fixedCurve", e.target.value)} className="w-full rounded-lg border border-black/20 px-2 py-1 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-black/40">Hand</span>
            <input value={f.fixedHand} onChange={(e) => set("fixedHand", e.target.value)} className="w-full rounded-lg border border-black/20 px-2 py-1 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-black/40">Color</span>
            <input value={f.fixedColor} onChange={(e) => set("fixedColor", e.target.value)} className="w-full rounded-lg border border-black/20 px-2 py-1 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-black/40">Length</span>
            <input value={f.fixedLength} onChange={(e) => set("fixedLength", e.target.value)} className="w-full rounded-lg border border-black/20 px-2 py-1 text-sm" />
          </label>
        </div>
      )}

      <div className="sm:col-span-2 flex items-center gap-3 border-t border-black/10 pt-3">
        <button onClick={save} disabled={busy} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={del}
          disabled={busy || row.hasOrders}
          title={row.hasOrders ? "Has order history — hide it instead" : "Permanently delete"}
          className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-30"
        >
          Delete
        </button>
        {row.hasOrders && <span className="text-xs text-black/40">Has orders — hide instead of delete.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// Phase 2 — per-stick option override editor. By default a configurable stick
// inherits its options from the tier/category-scoped Pre-Order Options. Flip an
// attribute to "Custom" to pin an exact subset for THIS stick only; attributes
// left on "Inherit" keep following the shared matrix. Saves the full pinned set
// to /api/admin/product-options.
function ProductOptionOverrides({
  productId,
  tier,
  category,
  optionValues,
  attributeKinds,
  initialOverrideIds,
  onSaved,
}: {
  productId: string;
  tier: string; // selected sizing tier ("" = none)
  category: string;
  optionValues: OptionValueLite[];
  attributeKinds: string[];
  initialOverrideIds: string[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(initialOverrideIds.length > 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Candidate values for a kind = same scoping rule as the storefront resolver.
  const candidatesFor = (kind: string) =>
    optionValues
      .filter(
        (o) =>
          o.kind === kind &&
          (o.sizing === "ALL" || o.sizing === tier) &&
          (o.category === "ALL" || o.category === category)
      )
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));

  // Kinds that actually have candidates under this scope.
  const kinds = attributeKinds.filter((k) => candidatesFor(k).length > 0);

  const initSet = new Set(initialOverrideIds);
  // Per-kind state: custom flag + the checked id set. A kind starts "custom"
  // only if it already has pinned ids; otherwise it inherits and its checkbox
  // set is pre-filled with the full candidate list (ready if you flip it on).
  const [state, setState] = useState<Record<string, { custom: boolean; checked: Set<string> }>>(
    () => {
      const s: Record<string, { custom: boolean; checked: Set<string> }> = {};
      for (const k of attributeKinds) {
        const cand = optionValues.filter(
          (o) =>
            o.kind === k &&
            (o.sizing === "ALL" || o.sizing === tier) &&
            (o.category === "ALL" || o.category === category)
        );
        const pinned = cand.filter((c) => initSet.has(c.id)).map((c) => c.id);
        s[k] = pinned.length
          ? { custom: true, checked: new Set(pinned) }
          : { custom: false, checked: new Set(cand.map((c) => c.id)) };
      }
      return s;
    }
  );

  const setKind = (k: string, patch: Partial<{ custom: boolean; checked: Set<string> }>) =>
    setState((p) => ({ ...p, [k]: { ...p[k], ...patch } }));

  const toggleVal = (k: string, id: string) =>
    setState((p) => {
      const next = new Set(p[k].checked);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...p, [k]: { ...p[k], checked: next } };
    });

  const customCount = kinds.filter((k) => state[k]?.custom).length;

  async function save() {
    setBusy(true);
    setMsg("");
    // Only pinned kinds contribute ids; inherited kinds send nothing.
    const ids: string[] = [];
    for (const k of kinds) {
      if (state[k]?.custom) ids.push(...state[k].checked);
    }
    const res = await fetch("/api/admin/product-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, optionValueIds: ids }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved");
      onSaved();
    } else {
      setMsg((await res.json().catch(() => ({})))?.error ?? "Save failed");
    }
  }

  return (
    <div className="sm:col-span-2 rounded-xl border border-black/10 bg-black/[0.02] p-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        Customize options for this stick
        {customCount > 0 && (
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
            {customCount} custom
          </span>
        )}
      </label>
      {!open ? (
        <p className="mt-1 text-xs text-black/40">
          Off = inherits every attribute from the{" "}
          {tier || "selected"} tier in Pre-Order Options.
        </p>
      ) : kinds.length === 0 ? (
        <p className="mt-2 text-xs text-black/40">
          No option values scoped to this tier/category yet — add them in
          Pre-Order Options first.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {kinds.map((k) => {
            const st = state[k];
            const cand = candidatesFor(k);
            return (
              <div key={k} className="rounded-lg border border-black/10 bg-white p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-black/50">{k}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setKind(k, { custom: false })}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${!st?.custom ? "bg-ink text-paper" : "bg-black/10 text-black/50"}`}
                    >
                      Inherit
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind(k, { custom: true })}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st?.custom ? "bg-ink text-paper" : "bg-black/10 text-black/50"}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cand.map((c) => {
                    const on = st?.custom ? st.checked.has(c.id) : true;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!st?.custom}
                        onClick={() => toggleVal(k, c.id)}
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          !st?.custom
                            ? "border-black/10 bg-black/[0.03] text-black/40"
                            : on
                              ? "border-ink bg-ink text-paper"
                              : "border-black/20 bg-white text-black/50 line-through",
                        ].join(" ")}
                      >
                        {c.label ?? c.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save option overrides"}
            </button>
            {msg && <span className="text-xs text-black/50">{msg}</span>}
            <span className="text-xs text-black/40">
              Inherited attributes follow the shared matrix; only Custom ones are pinned.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function AddProduct({
  categories,
  sizingTiers,
  onDone,
}: {
  categories: string[];
  sizingTiers: string[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    slug: "",
    name: "",
    description: "",
    category: categories[0] ?? "FULL_STICK",
    price: "",
    inStock: "0",
    preorder: false,
    configurable: false,
    sizingTier: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post({
      slug: f.slug,
      name: f.name,
      description: f.description,
      category: f.category,
      priceCents: Math.round(Number(f.price) * 100),
      inStock: Number(f.inStock),
      preorder: f.preorder,
      configurable: f.configurable,
      sizingTier: f.configurable && f.sizingTier ? f.sizingTier : null,
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-2">
      <input placeholder="Name" value={f.name} onChange={(e) => set("name", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <input placeholder="slug (e.g. instock-senior-90-p28)" value={f.slug} onChange={(e) => set("slug", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <input placeholder="Short description" value={f.description} onChange={(e) => set("description", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm sm:col-span-2" />
      <select value={f.category} onChange={(e) => set("category", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
        {categories.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
      </select>
      <input type="number" step="0.01" placeholder="Price (USD)" value={f.price} onChange={(e) => set("price", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.preorder}
          onChange={(e) =>
            setF((p) => ({
              ...p,
              preorder: e.target.checked,
              // A pre-order stick is built-to-order → configure it from the
              // Pre-Order Options matrix by default (admin can still opt out).
              configurable: e.target.checked ? true : p.configurable,
            }))
          }
        />
        Pre-order (built to order, no live stock)
      </label>
      {!f.preorder && (
        <input type="number" placeholder="Starting stock" value={f.inStock} onChange={(e) => set("inStock", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={f.configurable} onChange={(e) => set("configurable", e.target.checked)} />
        Configurable — build flex/curve/hand/color/length picker from Pre-Order Options
      </label>
      {f.configurable && (
        <div className="sm:col-span-2">
          <select value={f.sizingTier} onChange={(e) => set("sizingTier", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
            <option value="">Sizing tier (scopes flex &amp; length)</option>
            {sizingTiers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="mt-1 text-xs text-black/40">
            Options are inherited from the {f.sizingTier || "selected"} tier in
            Pre-Order Options — no per-stick picking needed.
          </p>
        </div>
      )}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !f.slug || !f.name || !f.price} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Create product"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-black/40 sm:col-span-2">
        Edit description, image, specs, badge, and locked build details after
        creation via the row&apos;s Edit button.
      </p>
    </div>
  );
}
