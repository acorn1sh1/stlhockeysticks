"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  inStock: number;
  preorder: boolean;
  active: boolean;
};

const CATEGORIES = ["FULL_STICK", "GOALIE", "MINI_CLUB", "MINI_FUN"];

async function post(body: unknown) {
  return fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function AdminProducts({ products }: { products: ProductRow[] }) {
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
        Configurable sticks keep their flex/curve options from code; added
        products are simple SKUs.
      </p>

      {adding && <AddProduct onDone={() => { setAdding(false); router.refresh(); }} />}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRowEditor key={p.id} row={p} onSaved={() => router.refresh()} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductRowEditor({ row, onSaved }: { row: ProductRow; onSaved: () => void }) {
  const [dollars, setDollars] = useState((row.priceCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
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
    <tr className={`border-b border-black/5 last:border-0 ${row.active ? "" : "opacity-50"}`}>
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
    </tr>
  );
}

function AddProduct({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    slug: "",
    name: "",
    description: "",
    category: "FULL_STICK",
    price: "",
    inStock: "0",
    preorder: false,
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
        {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
      </select>
      <input type="number" step="0.01" placeholder="Price (USD)" value={f.price} onChange={(e) => set("price", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <input type="number" placeholder="Starting stock" value={f.inStock} onChange={(e) => set("inStock", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.preorder} onChange={(e) => set("preorder", e.target.checked)} />
        Pre-order (built to order, no live stock)
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button onClick={submit} disabled={busy} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Create product"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
