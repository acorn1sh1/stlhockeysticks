"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type Tier = { minQty: number; percent: number };
export type CouponRow = {
  id: string;
  code: string;
  kind: string;
  value: number;
  tiers: Tier[] | null;
  active: boolean;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  timesRedeemed: number;
  startsAt: string | null;
  expiresAt: string | null;
};

async function post(body: unknown) {
  return fetch("/api/admin/coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function describe(c: CouponRow) {
  const amount =
    c.kind === "PERCENT"
      ? `${c.value}% off`
      : c.kind === "FIXED"
        ? `${fmtPrice(c.value)} off`
        : (c.tiers ?? []).map((t) => `${t.minQty}+: ${t.percent}%`).join(", ") || "tiered %";
  const min = c.minSubtotalCents ? ` · min ${fmtPrice(c.minSubtotalCents)}` : "";
  const cap = c.maxRedemptions != null ? ` · ${c.timesRedeemed}/${c.maxRedemptions} used` : ` · ${c.timesRedeemed} used`;
  const starts =
    c.startsAt && new Date(c.startsAt).getTime() > Date.now()
      ? ` · starts ${new Date(c.startsAt).toLocaleDateString("en-US")}`
      : "";
  const exp = c.expiresAt ? ` · exp ${new Date(c.expiresAt).toLocaleDateString("en-US")}` : "";
  return amount + min + cap + starts + exp;
}

const DEFAULT_TIERS: Tier[] = [
  { minQty: 2, percent: 10 },
  { minQty: 5, percent: 20 },
  { minQty: 10, percent: 25 },
];

export default function AdminCoupons({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    code: "",
    kind: "PERCENT",
    value: "",
    min: "",
    max: "",
    startsAt: "",
    expiresAt: "",
  });
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  function setTier(i: number, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTier() {
    setTiers((prev) => [...prev, { minQty: (prev[prev.length - 1]?.minQty ?? 1) + 1, percent: 10 }]);
  }
  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function create() {
    setBusy(true);
    setError("");
    const res = await post({
      action: "create",
      code: f.code,
      kind: f.kind,
      value: f.kind === "PERCENT" ? Number(f.value) : Math.round(Number(f.value) * 100),
      tiers: f.kind === "TIERED_PERCENT" ? tiers : undefined,
      minSubtotalCents: f.min ? Math.round(Number(f.min) * 100) : 0,
      maxRedemptions: f.max || null,
      startsAt: f.startsAt || null,
      expiresAt: f.expiresAt || null,
    });
    setBusy(false);
    if (res.ok) {
      setF({ code: "", kind: "PERCENT", value: "", min: "", max: "", startsAt: "", expiresAt: "" });
      setTiers(DEFAULT_TIERS);
      router.refresh();
    } else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function toggle(c: CouponRow) {
    const res = await post({ action: "toggle", id: c.id, active: !c.active });
    if (res.ok) router.refresh();
  }
  async function del(c: CouponRow) {
    const res = await post({ action: "delete", id: c.id });
    if (res.ok) router.refresh();
  }

  return (
    <section>
      <h2 className="text-xl font-black">Promo Codes</h2>
      <p className="mt-1 text-sm text-black/50">
        Percent, fixed-amount, or quantity-tiered discounts, applied at
        checkout. Redemptions count when an order is paid. Leave &quot;Starts&quot;
        blank to activate immediately.
      </p>

      {/* Create */}
      <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
        <input placeholder="CODE" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold uppercase" />
        <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
          <option value="PERCENT">% off</option>
          <option value="FIXED">$ off</option>
          <option value="TIERED_PERCENT">Buy more, save more (qty tiers)</option>
        </select>
        {f.kind !== "TIERED_PERCENT" && (
          <input type="number" step="0.01" placeholder={f.kind === "PERCENT" ? "Percent (e.g. 15)" : "Dollars off (e.g. 10)"} value={f.value} onChange={(e) => set("value", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        )}

        {f.kind === "TIERED_PERCENT" && (
          <div className="sm:col-span-3 rounded-xl bg-black/5 p-3">
            <p className="mb-2 text-xs font-bold uppercase text-black/40">
              Quantity tiers — total sticks in cart
            </p>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-black/50">Buy</span>
                  <input
                    type="number"
                    min={1}
                    value={t.minQty}
                    onChange={(e) => setTier(i, { minQty: Math.max(1, Math.floor(Number(e.target.value))) })}
                    className="w-16 rounded-lg border border-black/20 px-2 py-1 text-right"
                  />
                  <span className="text-black/50">or more, get</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={t.percent}
                    onChange={(e) => setTier(i, { percent: Math.max(1, Math.min(100, Math.floor(Number(e.target.value)))) })}
                    className="w-16 rounded-lg border border-black/20 px-2 py-1 text-right"
                  />
                  <span className="text-black/50">% off</span>
                  <button onClick={() => removeTier(i)} className="ml-1 text-xs font-bold text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addTier} className="mt-2 rounded-full border border-black/20 px-3 py-1 text-xs font-bold hover:bg-black/5">
              + Add tier
            </button>
          </div>
        )}

        <input type="number" step="0.01" placeholder="Min spend $ (optional)" value={f.min} onChange={(e) => set("min", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        <input type="number" placeholder="Max redemptions (optional)" value={f.max} onChange={(e) => set("max", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase text-black/40">Starts (optional)</span>
          <input type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm text-black/60" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase text-black/40">Expires (optional)</span>
          <input type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm text-black/60" />
        </label>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button
            onClick={create}
            disabled={busy || !f.code || (f.kind === "TIERED_PERCENT" ? tiers.length === 0 : !f.value)}
            className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {busy ? "Creating..." : "Create code"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      {/* List */}
      <div className="mt-4 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {coupons.length === 0 && <p className="p-5 text-sm text-black/50">No codes yet.</p>}
        {coupons.map((c) => (
          <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${c.active ? "" : "opacity-50"}`}>
            <div>
              <div className="font-black tracking-wide">{c.code}</div>
              <div className="text-xs text-black/50">{describe(c)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(c)} className={`rounded-full px-3 py-1 text-xs font-bold ${c.active ? "bg-volt/30 text-ink" : "bg-black/10 text-black/50"}`}>
                {c.active ? "Active" : "Off"}
              </button>
              <button onClick={() => del(c)} className="rounded-full px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
