"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtUsd } from "@/lib/accounting";

export type FeeMonth = {
  month: string; // YYYY-MM
  accruedCents: number; // per-order estimates
  adjustmentCents: number; // statement reconciliation (can be negative)
};

async function post(body: unknown) {
  return fetch("/api/admin/fees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Clover processing fees. Clover's API doesn't expose the merchant fee it
// deducts (that's on the monthly statement), so we accrue an estimate per paid
// order and reconcile monthly against the real total.
export default function AdminFees({
  percent,
  fixedCents,
  months,
}: {
  percent: number;
  fixedCents: number;
  months: FeeMonth[];
}) {
  const router = useRouter();
  const [pct, setPct] = useState(String(percent));
  const [fixed, setFixed] = useState(String(fixedCents));
  const [month, setMonth] = useState(months[0]?.month ?? new Date().toISOString().slice(0, 7));
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const selected = months.find((m) => m.month === month);

  async function run(body: Record<string, unknown>, describe: (d: Record<string, number>) => string) {
    setBusy(true);
    setMsg("");
    const res = await post(body);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? describe(data) : (data?.error ?? "Failed"));
    if (res.ok) router.refresh();
  }

  return (
    <section>
      <h2 className="text-xl font-black">Clover processing fees</h2>
      <p className="mt-1 text-sm text-black/50">
        Clover doesn&apos;t expose the merchant fee per transaction (it&apos;s on
        your monthly statement), so each paid order accrues an estimate into the
        ledger as a <strong>FEES</strong> expense. Once your statement arrives,
        reconcile the month and we post the difference.
      </p>

      <div className="mt-4 space-y-5 rounded-2xl border border-black/10 bg-white p-5">
        {/* Rate */}
        <div>
          <span className="text-xs font-bold uppercase text-black/40">Estimated rate</span>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-black/40">Percent</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="w-24 rounded-lg border border-black/20 px-3 py-2 text-right text-sm"
              />
            </label>
            <span className="pb-2 text-black/40">% +</span>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-black/40">Fixed (cents)</span>
              <input
                type="number"
                min="0"
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
                className="w-24 rounded-lg border border-black/20 px-3 py-2 text-right text-sm"
              />
            </label>
            <button
              onClick={() =>
                run(
                  { action: "settings", percent: Number(pct), fixedCents: Number(fixed) },
                  () => "Rate saved."
                )
              }
              disabled={busy}
              className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              Save rate
            </button>
            <button
              onClick={() =>
                run({ action: "backfill" }, (d) => `Accrued ${d.created} missing order fee(s).`)
              }
              disabled={busy}
              className="rounded-full border border-black/20 px-4 py-2 text-xs font-bold hover:bg-black/5 disabled:opacity-40"
              title="Create fee expenses for paid orders that don't have one yet"
            >
              Backfill past orders
            </button>
          </div>
        </div>

        {/* Reconcile */}
        <div className="border-t border-black/10 pt-4">
          <span className="text-xs font-bold uppercase text-black/40">Reconcile to statement</span>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-black/40">Month</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-black/20 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-black/40">Statement total ($)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="w-32 rounded-lg border border-black/20 px-3 py-2 text-right text-sm"
              />
            </label>
            <button
              onClick={() =>
                run(
                  {
                    action: "reconcile",
                    month,
                    actualCents: Math.round(Number(actual || 0) * 100),
                  },
                  (d) =>
                    `Accrued ${fmtUsd(d.accruedCents)} · statement ${fmtUsd(d.actualCents)} · adjustment ${fmtUsd(d.diffCents)}.`
                )
              }
              disabled={busy || !actual}
              className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              Reconcile
            </button>
          </div>
          {selected && (
            <p className="mt-2 text-xs text-black/50">
              {month}: accrued {fmtUsd(selected.accruedCents)}
              {selected.adjustmentCents !== 0 && ` · adjustment ${fmtUsd(selected.adjustmentCents)}`}
              {" · booked "}
              {fmtUsd(selected.accruedCents + selected.adjustmentCents)}
            </p>
          )}
        </div>

        {msg && <p className="text-sm text-black/60">{msg}</p>}
      </div>

      {months.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
              <tr>
                <th className="p-3">Month</th>
                <th className="p-3">Accrued (est.)</th>
                <th className="p-3">Statement adj.</th>
                <th className="p-3">Total booked</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-black/5 last:border-0">
                  <td className="p-3 font-semibold">{m.month}</td>
                  <td className="p-3">{fmtUsd(m.accruedCents)}</td>
                  <td className={`p-3 ${m.adjustmentCents < 0 ? "text-green-700" : ""}`}>
                    {m.adjustmentCents === 0 ? "—" : fmtUsd(m.adjustmentCents)}
                  </td>
                  <td className="p-3 font-bold">{fmtUsd(m.accruedCents + m.adjustmentCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
