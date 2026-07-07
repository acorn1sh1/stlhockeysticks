"use client";

import { fmtPrice } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type CouponRow = {
  id: string;
  code: string;
  kind: string;
  value: number;
  active: boolean;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  timesRedeemed: number;
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
  const amount = c.kind === "PERCENT" ? `${c.value}% off` : `${fmtPrice(c.value)} off`;
  const min = c.minSubtotalCents ? ` · min ${fmtPrice(c.minSubtotalCents)}` : "";
  const cap = c.maxRedemptions != null ? ` · ${c.timesRedeemed}/${c.maxRedemptions} used` : ` · ${c.timesRedeemed} used`;
  const exp = c.expiresAt ? ` · exp ${new Date(c.expiresAt).toLocaleDateString("en-US")}` : "";
  return amount + min + cap + exp;
}

export default function AdminCoupons({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [f, setF] = useState({ code: "", kind: "PERCENT", value: "", min: "", max: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function create() {
    setBusy(true);
    setError("");
    const res = await post({
      action: "create",
      code: f.code,
      kind: f.kind,
      value: f.kind === "PERCENT" ? Number(f.value) : Math.round(Number(f.value) * 100),
      minSubtotalCents: f.min ? Math.round(Number(f.min) * 100) : 0,
      maxRedemptions: f.max || null,
      expiresAt: f.expiresAt || null,
    });
    setBusy(false);
    if (res.ok) {
      setF({ code: "", kind: "PERCENT", value: "", min: "", max: "", expiresAt: "" });
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
        Percent or fixed-amount discounts, applied at checkout. Redemptions count when an order is paid.
      </p>

      {/* Create */}
      <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
        <input placeholder="CODE" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold uppercase" />
        <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
          <option value="PERCENT">% off</option>
          <option value="FIXED">$ off</option>
        </select>
        <input type="number" step="0.01" placeholder={f.kind === "PERCENT" ? "Percent (e.g. 15)" : "Dollars off (e.g. 10)"} value={f.value} onChange={(e) => set("value", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        <input type="number" step="0.01" placeholder="Min spend $ (optional)" value={f.min} onChange={(e) => set("min", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        <input type="number" placeholder="Max redemptions (optional)" value={f.max} onChange={(e) => set("max", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
        <input type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className="rounded-lg border border-black/20 px-3 py-2 text-sm text-black/60" />
        <div className="sm:col-span-3 flex items-center gap-3">
          <button onClick={create} disabled={busy || !f.code || !f.value} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
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
