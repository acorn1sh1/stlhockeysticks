"use client";

import { fmtPrice, optionsSummary, type SelectedOptions } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type PickupLineRow = {
  orderItemId: string;
  productId: string;
  name: string;
  options: unknown;
  quantity: number;
  qtyPickedUp: number;
  outstanding: number;
};

export type PickupOrderRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  batchName: string | null;
  subtotalCents: number;
  createdAt: string;
  readySince: string;
  daysWaiting: number;
  bucket: "0-7" | "8-30" | "31-60" | "60+";
  outstanding: number;
  valueCents: number;
  lines: PickupLineRow[];
};

export type RecentPickupRow = {
  id: string;
  orderId: string;
  customer: string;
  pickedUpBy: string;
  note: string | null;
  createdAt: string;
  units: number;
};

export type ReservedRow = {
  productId: string;
  name: string;
  free: number; // Product.inStock — sellable right now
  reserved: number; // paid for, still on our shelf
  preorder: boolean;
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const BUCKET_STYLE: Record<PickupOrderRow["bucket"], string> = {
  "0-7": "bg-black/5 text-black/60",
  "8-30": "bg-amber-100 text-amber-800",
  "31-60": "bg-orange-100 text-orange-800",
  "60+": "bg-red-100 text-red-700",
};

export default function AdminPickups({
  orders,
  recent,
  reserved,
}: {
  orders: PickupOrderRow[];
  recent: RecentPickupRow[];
  reserved: ReservedRow[];
}) {
  const [q, setQ] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (onlyReady && o.status !== "READY_FOR_PICKUP") return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        o.email.toLowerCase().includes(needle) ||
        (o.phone ?? "").includes(needle) ||
        o.id.toLowerCase().startsWith(needle)
      );
    });
  }, [orders, q, onlyReady]);

  const totals = useMemo(
    () => ({
      units: orders.reduce((s, o) => s + o.outstanding, 0),
      value: orders.reduce((s, o) => s + o.valueCents, 0),
      overdue: orders.filter((o) => o.daysWaiting > 30).length,
    }),
    [orders]
  );

  return (
    <section>
      <h2 className="text-xl font-black">Pickups</h2>
      <p className="mt-1 text-sm text-black/50">
        Who still has sticks waiting here. Pre-orders stay in “Paid” until their
        batch is marked Arrived — the clock only starts once they can actually
        come get them.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Units awaiting pickup" value={String(totals.units)} />
        <Stat label="Value on the shelf" value={fmtPrice(totals.value)} />
        <Stat
          label="Waiting over 30 days"
          value={String(totals.overdue)}
          alert={totals.overdue > 0}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, order id…"
          className="w-full max-w-xs rounded-lg border border-black/20 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-black/60">
          <input
            type="checkbox"
            checked={onlyReady}
            onChange={(e) => setOnlyReady(e.target.checked)}
          />
          Ready for pickup only
        </label>
        <span className="text-xs text-black/40">
          {filtered.length} of {orders.length}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/50">
            {orders.length === 0
              ? "Nothing outstanding — everybody has their sticks."
              : "No orders match that search."}
          </p>
        )}
        {filtered.map((o) => (
          // Key includes the outstanding count so a card remounts after a
          // partial pickup — otherwise its quantity inputs would keep the
          // pre-refresh state and let you "collect" units already handed over.
          <PickupCard key={`${o.id}:${o.outstanding}`} order={o} />
        ))}
      </div>

      <h3 className="mt-10 text-lg font-black">On-hand: free vs reserved</h3>
      <p className="mt-1 text-sm text-black/50">
        “Free” is what the site can still sell. “Reserved” is paid for and
        physically here until someone collects it. Add them together to check
        against a shelf count.
      </p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3 text-right">Free</th>
              <th className="p-3 text-right">Reserved</th>
              <th className="p-3 text-right">Should be on hand</th>
            </tr>
          </thead>
          <tbody>
            {reserved.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-black/50">
                  Nothing on hand or reserved.
                </td>
              </tr>
            )}
            {reserved.map((r) => (
              <tr key={r.productId} className="border-b border-black/5 last:border-0">
                <td className="p-3">
                  {r.name}
                  {r.preorder && (
                    <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase text-black/50">
                      built to order
                    </span>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">{r.preorder ? "—" : r.free}</td>
                <td className="p-3 text-right tabular-nums font-bold">{r.reserved}</td>
                <td className="p-3 text-right tabular-nums">
                  {(r.preorder ? 0 : r.free) + r.reserved}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-10 text-lg font-black">Recent handoffs</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Order</th>
              <th className="p-3">Picked up by</th>
              <th className="p-3 text-right">Units</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-black/50">
                  No pickups recorded yet.
                </td>
              </tr>
            )}
            {recent.map((r) => (
              <tr key={r.id} className="border-b border-black/5 last:border-0">
                <td className="p-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="p-3">
                  {r.customer}
                  <span className="ml-2 text-xs text-black/40">{r.orderId.slice(0, 8)}…</span>
                </td>
                <td className="p-3">{r.pickedUpBy}</td>
                <td className="p-3 text-right tabular-nums">{r.units}</td>
                <td className="p-3 text-black/60">{r.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        alert ? "border-red-200 bg-red-50" : "border-black/10 bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-black/40">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

// One outstanding order: per-line quantity inputs default to "give them
// everything", which is the common case; edit down for a partial handoff.
function PickupCard({ order }: { order: PickupOrderRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState(order.name);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.orderItemId, l.outstanding]))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = Object.values(qty).reduce((s, n) => s + (Number(n) || 0), 0);

  async function submit() {
    setErr(null);
    const lines = Object.entries(qty)
      .map(([orderItemId, n]) => ({ orderItemId, qty: Number(n) || 0 }))
      .filter((l) => l.qty !== 0);
    if (lines.length === 0) {
      setErr("Set a quantity on at least one line.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, pickedUpBy: by, note, lines }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({})))?.error ?? "Save failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold">{order.name}</div>
          <div className="text-xs text-black/50">
            {order.email}
            {order.phone ? ` · ${order.phone}` : ""} · ordered {fmtDate(order.createdAt)}
            {order.batchName ? ` · ${order.batchName}` : " · from stock"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${BUCKET_STYLE[order.bucket]}`}>
            {order.status === "READY_FOR_PICKUP"
              ? `waiting ${order.daysWaiting}d`
              : "awaiting batch"}
          </span>
          <span className="rounded-full bg-volt/30 px-3 py-1 text-xs font-bold">
            {order.outstanding} left · {fmtPrice(order.valueCents)}
          </span>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-black/70">
        {order.lines.map((l) => (
          <li key={l.orderItemId}>
            {l.outstanding} of {l.quantity}× {l.name}
            {l.options ? ` (${optionsSummary(l.options as SelectedOptions)})` : ""}
            {l.qtyPickedUp > 0 && (
              <span className="ml-2 text-xs text-black/40">{l.qtyPickedUp} already collected</span>
            )}
          </li>
        ))}
      </ul>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80"
        >
          Record pickup
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
          <div className="space-y-2">
            {order.lines.map((l) => (
              <div key={l.orderItemId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-black/70">
                  {l.name}
                  {l.options ? ` (${optionsSummary(l.options as SelectedOptions)})` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={l.outstanding}
                    value={qty[l.orderItemId] ?? 0}
                    onChange={(e) =>
                      setQty((s) => ({ ...s, [l.orderItemId]: Number(e.target.value) }))
                    }
                    className="w-20 rounded-lg border border-black/20 px-2 py-1.5 text-right"
                  />
                  <span className="text-xs text-black/40">of {l.outstanding}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-bold uppercase text-black/40">Picked up by</span>
              <input
                value={by}
                onChange={(e) => setBy(e.target.value)}
                placeholder="Parent, coach, whoever showed up"
                className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-bold uppercase text-black/40">Note (optional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. rest of order next week"
                className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
              />
            </label>
          </div>

          {err && <p className="mt-2 text-sm font-bold text-red-600">{err}</p>}

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              {busy ? "Saving…" : `Confirm ${total} unit${total === 1 ? "" : "s"}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-black/50 hover:text-black"
            >
              Cancel
            </button>
            {total < order.outstanding && (
              <span className="text-xs text-black/40">
                Partial — {order.outstanding - total} stays on the shelf
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
