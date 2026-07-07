"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockRow = { slug: string; name: string; inStock: number; priceCents: number };
type BatchRow = {
  id: string;
  name: string;
  status: string;
  cutoffDate: string;
  pickupStart: string;
  pickupEnd: string;
  orderCount: number;
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

export default function AdminDashboard({
  stock,
  batches,
  orders,
}: {
  stock: StockRow[];
  batches: BatchRow[];
  orders: OrderRow[];
}) {
  const router = useRouter();

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
      <h2 className="mt-10 text-xl font-black">In-Stock Inventory</h2>
      <p className="mt-1 text-sm text-black/50">
        On-hand counts for ships-now SKUs. At 0 the storefront shows the item as
        pre-order into the next batch. Counts drop automatically when an order is paid.
      </p>
      <div className="mt-4 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {stock.length === 0 && (
          <p className="p-5 text-sm text-black/50">No stocked SKUs found.</p>
        )}
        {stock.map((s) => (
          <StockEditor key={s.slug} row={s} onSaved={() => router.refresh()} />
        ))}
      </div>

      {/* BATCHES */}
      <h2 className="mt-10 text-xl font-black">Batches</h2>
      <p className="mt-1 text-sm text-black/50">
        Marking a batch “Arrived” flips its paid orders to Ready for Pickup.
      </p>
      <div className="mt-4 space-y-3">
        {batches.length === 0 && (
          <p className="text-sm text-black/50">No batches yet.</p>
        )}
        {batches.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4"
          >
            <div>
              <div className="font-bold">{b.name}</div>
              <div className="text-xs text-black/50">
                Cutoff {fmtDate(b.cutoffDate)} · Pickup {fmtDate(b.pickupStart)}–
                {fmtDate(b.pickupEnd)} · {b.orderCount} order{b.orderCount === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold">
                {b.status}
              </span>
              {(BATCH_NEXT[b.status] ?? []).map((a) => (
                <BatchButton key={a.status} batchId={b.id} action={a} onDone={() => router.refresh()} />
              ))}
            </div>
          </div>
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
  const [count, setCount] = useState(row.inStock);
  const [busy, setBusy] = useState(false);
  const dirty = count !== row.inStock;

  async function save() {
    setBusy(true);
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: row.slug, inStock: count }),
    });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <div className="font-bold">{row.name}</div>
        <div className="text-xs text-black/40">{row.slug} · {fmtPrice(row.priceCents)}</div>
      </div>
      <div className="flex items-center gap-2">
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
    const res = await fetch("/api/admin/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, status: action.status }),
    });
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
