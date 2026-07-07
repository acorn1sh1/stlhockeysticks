"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  inStock: number;
  preorder: boolean;
  active: boolean;
  fixedFlex: number | null;
  fixedCurve: string | null;
  fixedHand: string | null;
  fixedColor: string | null;
  fixedLength: string | null;
  hasOrders: boolean;
};

async function post(body: unknown) {
  return fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function AdminProducts({
  products,
  categories,
  sizingTiers,
}: {
  products: ProductRow[];
  categories: string[];
  sizingTiers: string[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

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
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRowEditor
                key={p.id}
                row={p}
                categories={categories}
                sizingTiers={sizingTiers}
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
  onSaved,
}: {
  row: ProductRow;
  categories: string[];
  sizingTiers: string[];
  onSaved: () => void;
}) {
  const [dollars, setDollars] = useState((row.priceCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dirty = Math.round(Number(dollars) * 100) !== row.priceCents;

  async function savePrice() {
    setBusy(true);
    const res = await post({ slug: row.slug, priceCents: Math.round(Number(dollars) * 100) });
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
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-black/40">{row.slug}</div>
        </td>
        <td className="p-3 text-black/60">{row.category.replace("_", " ")}</td>
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
          <td colSpan={5} className="bg-black/[0.02] p-4">
            <ProductDetailEditor
              row={row}
              categories={categories}
              sizingTiers={sizingTiers}
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
  onSaved,
}: {
  row: ProductRow;
  categories: string[];
  sizingTiers: string[];
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
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase text-black/40">Sizing tier (scopes flex &amp; length)</span>
            <select value={f.sizingTier} onChange={(e) => set("sizingTier", e.target.value)} className="w-full max-w-xs rounded-lg border border-black/20 px-3 py-2 text-sm">
              <option value="">None</option>
              {sizingTiers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.preorder} onChange={(e) => set("preorder", e.target.checked)} />
        Pre-order (built to order, no live stock)
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
        <input type="checkbox" checked={f.preorder} onChange={(e) => set("preorder", e.target.checked)} />
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
        <select value={f.sizingTier} onChange={(e) => set("sizingTier", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
          <option value="">Sizing tier (scopes flex &amp; length)</option>
          {sizingTiers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
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
