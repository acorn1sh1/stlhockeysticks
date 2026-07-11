"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockRow = { slug: string; name: string; inStock: number; priceCents: number };
type BatchProduct = {
  productId: string;
  name: string;
  qty: number;
  defaultCostCents: number;
  overrideCents: number | null;
};
type BatchRow = {
  id: string;
  name: string;
  status: string;
  cutoffDate: string;
  pickupStart: string;
  pickupEnd: string;
  orderCount: number;
  revenueCents: number;
  freightCents: number;
  tariffCents: number;
  otherCostCents: number;
  costNotes: string | null;
  products: BatchProduct[]; // confirmed units in this batch, aggregated by product
};
type OrderRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  subtotalCents: number;
  createdAt: string;
  batchName: string | null;
};

const BATCH_NEXT: Record<string, { label: string; status: string }[]> = {
  OPEN: [{ label: "Mark Ordered", status: "ORDERED" }],
  ORDERED: [{ label: "Mark Arrived", status: "ARRIVED" }],
  ARRIVED: [{ label: "Close", status: "CLOSED" }],
  CLOSED: [],
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// yyyy-mm-dd for <input type="date">
function toDateInput(s: string) {
  return new Date(s).toISOString().slice(0, 10);
}

async function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function AdminDashboard({
  stock,
  batches,
  orders,
  categories,
}: {
  stock: StockRow[];
  batches: BatchRow[];
  orders: OrderRow[];
  categories: string[];
}) {
  const router = useRouter();
  const [addingStock, setAddingStock] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);

  async function signOut() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Shop Admin</h1>
        <button
          onClick={signOut}
          className="rounded-full border border-black/20 px-4 py-2 text-sm font-bold hover:bg-black/5"
        >
          Sign out
        </button>
      </div>

      {/* INVENTORY */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-black">In-Stock Inventory</h2>
        <button
          onClick={() => setAddingStock((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {addingStock ? "Cancel" : "+ Add SKU"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        On-hand counts for ships-now SKUs. At 0 the storefront shows the item as
        pre-order into the next batch. Counts drop automatically when an order is paid.
      </p>

      {addingStock && (
        <AddStockSku
          categories={categories}
          onDone={() => { setAddingStock(false); router.refresh(); }}
        />
      )}

      <div className="mt-4 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {stock.length === 0 && (
          <p className="p-5 text-sm text-black/50">No stocked SKUs found.</p>
        )}
        {stock.map((s) => (
          <StockEditor key={s.slug} row={s} onSaved={() => router.refresh()} />
        ))}
      </div>

      {/* BATCHES */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-black">Batches</h2>
        <button
          onClick={() => setAddingBatch((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {addingBatch ? "Cancel" : "+ Add batch"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        A new batch auto-creates each month on the cutoff — add/edit/delete
        here to override that. Marking a batch “Arrived” flips its paid
        orders to Ready for Pickup. “Build Sheet” is the internal .xlsx
        (grouped counts + custom names); “Supplier Order” is the Junda
        quotation-format .xlsx ready to send to the factory. Open a batch to
        set dates and track its landed cost — unit costs, freight, and
        tariffs feed the Accounting section below.
      </p>

      {addingBatch && (
        <AddBatch onDone={() => { setAddingBatch(false); router.refresh(); }} />
      )}

      <div className="mt-4 space-y-3">
        {batches.length === 0 && (
          <p className="text-sm text-black/50">No batches yet.</p>
        )}
        {batches.map((b) => (
          <BatchRowEditor key={b.id} row={b} onSaved={() => router.refresh()} />
        ))}
      </div>

      {/* RECENT ORDERS */}
      <h2 className="mt-10 text-xl font-black">Recent Orders</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Batch</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-black/50">No orders yet.</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5 last:border-0">
                <td className="p-3 text-black/60">{fmtDate(o.createdAt)}</td>
                <td className="p-3">
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-xs text-black/40">{o.email}</div>
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold">
                    {o.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="p-3 text-black/60">{o.batchName ?? "From stock"}</td>
                <td className="p-3 text-right font-bold">{fmtPrice(o.subtotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockEditor({ row, onSaved }: { row: StockRow; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [dollars, setDollars] = useState((row.priceCents / 100).toFixed(2));
  const [count, setCount] = useState(row.inStock);
  const [busy, setBusy] = useState(false);
  const dirty =
    count !== row.inStock || name !== row.name || Math.round(Number(dollars) * 100) !== row.priceCents;

  async function save() {
    setBusy(true);
    const res = await post("/api/admin/product", {
      slug: row.slug,
      name,
      priceCents: Math.round(Number(dollars) * 100),
      inStock: count,
    });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-black/20 px-2 py-1 font-bold"
        />
        <div className="mt-1 text-xs text-black/40">{row.slug}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-black/40">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={dollars}
          onChange={(e) => setDollars(e.target.value)}
          className="w-20 rounded-lg border border-black/20 px-2 py-1.5 text-right"
        />
        <span className="text-xs text-black/40">stock</span>
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => setCount(Math.max(0, Math.floor(Number(e.target.value))))}
          className="w-20 rounded-lg border border-black/20 px-3 py-1.5 text-right"
        />
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
        >
          {busy ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function AddStockSku({ categories, onDone }: { categories: string[]; onDone: () => void }) {
  const [f, setF] = useState({
    name: "",
    slug: "",
    category: categories[0] ?? "FULL_STICK",
    price: "",
    inStock: "0",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post("/api/admin/product", {
      slug: f.slug,
      name: f.name,
      description: f.name,
      category: f.category,
      priceCents: Math.round(Number(f.price) * 100),
      inStock: Number(f.inStock),
      preorder: false,
      configurable: false,
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-2">
      <input placeholder="Name" value={f.name} onChange={(e) => set("name", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <input placeholder="slug (e.g. instock-senior-90-p28)" value={f.slug} onChange={(e) => set("slug", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <select value={f.category} onChange={(e) => set("category", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
        {categories.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
      </select>
      <input type="number" step="0.01" placeholder="Price (USD)" value={f.price} onChange={(e) => set("price", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <input type="number" placeholder="Starting stock" value={f.inStock} onChange={(e) => set("inStock", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
      <div className="sm:col-span-2 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !f.slug || !f.name || !f.price} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Add SKU"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-black/40 sm:col-span-2">
        Description, image, specs, badge, and locked flex/curve/hand/color
        build can be set afterward from Products &amp; Prices below.
      </p>
    </div>
  );
}

// COGS for a batch = Σ qty × (per-batch override ?? product default cost).
function batchCogsCents(row: BatchRow) {
  return row.products.reduce(
    (sum, p) => sum + p.qty * (p.overrideCents ?? p.defaultCostCents),
    0
  );
}

function BatchRowEditor({ row, onSaved }: { row: BatchRow; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const landed = batchCogsCents(row) + row.freightCents + row.tariffCents + row.otherCostCents;
  const margin = row.revenueCents - landed;

  async function remove() {
    if (!confirm(`Delete “${row.name}”?`)) return;
    setBusy(true);
    let res = await fetch(`/api/admin/batch?batchId=${row.id}`, { method: "DELETE" });
    if (res.status === 409) {
      const msg = (await res.json().catch(() => ({})))?.error ?? "Batch has orders.";
      if (confirm(`${msg}\n\nDelete anyway?`)) {
        res = await fetch(`/api/admin/batch?batchId=${row.id}&force=1`, { method: "DELETE" });
      } else {
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    if (res.ok) onSaved();
    else alert((await res.json().catch(() => ({})))?.error ?? "Delete failed");
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">{row.name}</div>
          <div className="text-xs text-black/50">
            Cutoff {fmtDate(row.cutoffDate)} · Pickup {fmtDate(row.pickupStart)}–
            {fmtDate(row.pickupEnd)} · {row.orderCount} order{row.orderCount === 1 ? "" : "s"}
          </div>
          <div className="mt-0.5 text-xs text-black/50">
            Revenue {fmtPrice(row.revenueCents)} · Landed cost {fmtPrice(landed)} ·{" "}
            <span className={margin >= 0 ? "font-bold text-green-700" : "font-bold text-red-600"}>
              {margin >= 0 ? "+" : "−"}{fmtPrice(Math.abs(margin))}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold">{row.status}</span>
          <a
            href={`/api/admin/batch/export?batchId=${row.id}`}
            className="rounded-full border border-black/20 px-3 py-1 text-xs font-bold hover:bg-black/5"
          >
            Build Sheet ↓
          </a>
          <a
            href={`/api/admin/batch/supplier-export?batchId=${row.id}`}
            className="rounded-full border border-black/20 px-3 py-1 text-xs font-bold hover:bg-black/5"
          >
            Supplier Order ↓
          </a>
          {(BATCH_NEXT[row.status] ?? []).map((a) => (
            <BatchButton key={a.status} batchId={row.id} action={a} onDone={onSaved} />
          ))}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60 hover:bg-black/10"
          >
            {expanded ? "Close" : "Edit"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            {busy ? "..." : "Delete"}
          </button>
        </div>
      </div>
      {expanded && <BatchDetailEditor row={row} onSaved={() => { setExpanded(false); onSaved(); }} />}
    </div>
  );
}

function BatchDetailEditor({ row, onSaved }: { row: BatchRow; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [cutoffDate, setCutoffDate] = useState(toDateInput(row.cutoffDate));
  const [pickupStart, setPickupStart] = useState(toDateInput(row.pickupStart));
  const [pickupEnd, setPickupEnd] = useState(toDateInput(row.pickupEnd));
  const [freight, setFreight] = useState((row.freightCents / 100).toFixed(2));
  const [tariff, setTariff] = useState((row.tariffCents / 100).toFixed(2));
  const [other, setOther] = useState((row.otherCostCents / 100).toFixed(2));
  const [costNotes, setCostNotes] = useState(row.costNotes ?? "");
  // Unit-cost overrides, keyed by productId, in dollars for editing.
  const [unitCosts, setUnitCosts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      row.products.map((p) => [p.productId, (((p.overrideCents ?? p.defaultCostCents)) / 100).toFixed(2)])
    )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await post("/api/admin/batch", {
      batchId: row.id,
      name,
      cutoffDate,
      pickupStart,
      pickupEnd,
      freightCents: Math.round(Number(freight || 0) * 100),
      tariffCents: Math.round(Number(tariff || 0) * 100),
      otherCostCents: Math.round(Number(other || 0) * 100),
      costNotes,
      unitCosts: row.products.map((p) => ({
        productId: p.productId,
        unitCostCents: Math.round(Number(unitCosts[p.productId] || 0) * 100),
      })),
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Save failed");
  }

  const money = "w-full rounded-lg border border-black/20 px-3 py-2 text-sm text-right";

  return (
    <div className="mt-4 grid gap-3 border-t border-black/10 pt-4 sm:grid-cols-4">
      <label className="text-sm sm:col-span-4">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-sm rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Cutoff</span>
        <input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Pickup start</span>
        <input type="date" value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Pickup end</span>
        <input type="date" value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>

      {/* Landed cost */}
      <div className="sm:col-span-4 mt-2 border-t border-black/10 pt-3">
        <span className="text-xs font-bold uppercase text-black/40">Batch costs (landed)</span>
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Freight / shipping $</span>
        <input type="number" step="0.01" min="0" value={freight} onChange={(e) => setFreight(e.target.value)} className={money} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Tariffs / duties $</span>
        <input type="number" step="0.01" min="0" value={tariff} onChange={(e) => setTariff(e.target.value)} className={money} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Other (fees, tooling) $</span>
        <input type="number" step="0.01" min="0" value={other} onChange={(e) => setOther(e.target.value)} className={money} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Notes</span>
        <input value={costNotes} onChange={(e) => setCostNotes(e.target.value)} placeholder="e.g. wire fee, DHL invoice #" className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>

      {/* Per-product unit costs */}
      {row.products.length > 0 && (
        <div className="sm:col-span-4">
          <span className="text-xs font-bold uppercase text-black/40">
            Unit costs for this order (defaults from Products; edits apply to this batch only)
          </span>
          <div className="mt-2 divide-y divide-black/5 rounded-xl border border-black/10">
            {row.products.map((p) => (
              <div key={p.productId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold">{p.name}</span>{" "}
                  <span className="text-black/40">× {p.qty}</span>
                  {p.overrideCents != null && p.overrideCents !== p.defaultCostCents && (
                    <span className="ml-2 rounded bg-volt/30 px-1.5 py-0.5 text-[10px] font-bold">override</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-black/40">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitCosts[p.productId] ?? ""}
                    onChange={(e) => setUnitCosts((prev) => ({ ...prev, [p.productId]: e.target.value }))}
                    className="w-24 rounded-lg border border-black/20 px-2 py-1 text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {row.products.length === 0 && (
        <p className="sm:col-span-4 text-xs text-black/40">
          No confirmed orders in this batch yet — unit costs appear here once orders come in.
        </p>
      )}

      <div className="sm:col-span-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Save changes"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function AddBatch({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post("/api/admin/batch", { name, cutoffDate, pickupStart, pickupEnd });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-4">
      <label className="text-sm sm:col-span-4">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Name</span>
        <input placeholder="e.g. September 2026 Batch" value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-sm rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Cutoff</span>
        <input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Pickup start</span>
        <input type="date" value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Pickup end</span>
        <input type="date" value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <div className="sm:col-span-4 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !name || !cutoffDate || !pickupStart || !pickupEnd} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Add batch"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function BatchButton({
  batchId,
  action,
  onDone,
}: {
  batchId: string;
  action: { label: string; status: string };
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await post("/api/admin/batch", { batchId, status: action.status });
    setBusy(false);
    if (res.ok) onDone();
  }
  return (
    <button
      onClick={go}
      disabled={busy}
      className="rounded-full bg-volt px-3 py-1 text-xs font-bold text-ink hover:bg-volt-dark disabled:opacity-40"
    >
      {busy ? "..." : action.label}
    </button>
  );
}
