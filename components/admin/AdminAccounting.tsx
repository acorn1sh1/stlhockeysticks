"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtPrice } from "@/lib/catalog";

// The books. Revenue = paid orders. COGS = units × batch/product unit cost.
// Batch costs = freight + tariffs + other on each batch (attributed to the
// batch's cutoff month). Expenses = the general ledger below. Net = the rest.

export type MonthlyRow = {
  month: string; // "2026-07"
  revenueCents: number;
  cogsCents: number;
  batchCostsCents: number;
  expensesCents: number;
};

export type ExpenseRow = {
  id: string;
  date: string; // ISO
  category: string;
  description: string;
  amountCents: number;
  batchId: string | null;
  batchName: string | null;
};

export type BatchOption = { id: string; name: string };

const CATEGORIES = ["SHIPPING", "TARIFFS", "SUPPLIES", "FEES", "MARKETING", "EQUIPMENT", "OTHER"];

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function AdminAccounting({
  monthly,
  expenses,
  batches,
}: {
  monthly: MonthlyRow[];
  expenses: ExpenseRow[];
  batches: BatchOption[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const year = new Date().getFullYear();
  const ytd = monthly.filter((m) => m.month.startsWith(String(year)));
  const sum = (rows: MonthlyRow[], k: keyof Omit<MonthlyRow, "month">) =>
    rows.reduce((a, r) => a + (r[k] as number), 0);
  const ytdRevenue = sum(ytd, "revenueCents");
  const ytdCosts = sum(ytd, "cogsCents") + sum(ytd, "batchCostsCents") + sum(ytd, "expensesCents");
  const ytdNet = ytdRevenue - ytdCosts;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Accounting</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add expense"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Revenue is every paid order. COGS uses each batch&apos;s unit costs
        (falling back to the product&apos;s default cost). Batch costs are
        freight/tariffs/other entered on each batch. Everything else —
        packaging, card fees, marketing — goes in the expense ledger here.
      </p>

      {/* YTD cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs font-bold uppercase text-black/40">{year} Revenue</div>
          <div className="mt-1 text-2xl font-black">{fmtPrice(ytdRevenue)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs font-bold uppercase text-black/40">{year} Costs</div>
          <div className="mt-1 text-2xl font-black">{fmtPrice(ytdCosts)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs font-bold uppercase text-black/40">{year} Net</div>
          <div className={`mt-1 text-2xl font-black ${ytdNet >= 0 ? "text-green-700" : "text-red-600"}`}>
            {ytdNet < 0 && "−"}{fmtPrice(Math.abs(ytdNet))}
          </div>
        </div>
      </div>

      {/* Monthly P&L */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Month</th>
              <th className="p-3 text-right">Revenue</th>
              <th className="p-3 text-right">COGS</th>
              <th className="p-3 text-right">Batch costs</th>
              <th className="p-3 text-right">Expenses</th>
              <th className="p-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {monthly.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-black/50">Nothing on the books yet.</td></tr>
            )}
            {monthly.map((m) => {
              const net = m.revenueCents - m.cogsCents - m.batchCostsCents - m.expensesCents;
              return (
                <tr key={m.month} className="border-b border-black/5 last:border-0">
                  <td className="p-3 font-semibold">{monthLabel(m.month)}</td>
                  <td className="p-3 text-right">{fmtPrice(m.revenueCents)}</td>
                  <td className="p-3 text-right text-black/60">{fmtPrice(m.cogsCents)}</td>
                  <td className="p-3 text-right text-black/60">{fmtPrice(m.batchCostsCents)}</td>
                  <td className="p-3 text-right text-black/60">{fmtPrice(m.expensesCents)}</td>
                  <td className={`p-3 text-right font-bold ${net >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {net < 0 && "−"}{fmtPrice(Math.abs(net))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddExpense batches={batches} onDone={() => { setAdding(false); router.refresh(); }} />
      )}

      {/* Expense ledger */}
      <h3 className="mt-6 text-sm font-bold uppercase text-black/40">Expense ledger</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Batch</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-black/50">No expenses recorded yet.</td></tr>
            )}
            {expenses.map((e) => (
              <ExpenseRowView key={e.id} row={e} onChanged={() => router.refresh()} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExpenseRowView({ row, onChanged }: { row: ExpenseRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete expense “${row.description}” (${fmtPrice(row.amountCents)})?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/expense?expenseId=${row.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onChanged();
  }
  return (
    <tr className="border-b border-black/5 last:border-0">
      <td className="p-3 text-black/60">{fmtDate(row.date)}</td>
      <td className="p-3">
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold">{row.category}</span>
      </td>
      <td className="p-3">{row.description}</td>
      <td className="p-3 text-black/60">{row.batchName ?? "—"}</td>
      <td className="p-3 text-right font-bold">{fmtPrice(row.amountCents)}</td>
      <td className="p-3 text-right">
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          {busy ? "..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

function AddExpense({ batches, onDone }: { batches: BatchOption[]; onDone: () => void }) {
  const [f, setF] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "SUPPLIES",
    description: "",
    amount: "",
    batchId: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post("/api/admin/expense", {
      date: f.date,
      category: f.category,
      description: f.description,
      amountCents: Math.round(Number(f.amount) * 100),
      batchId: f.batchId || null,
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-5">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Date</span>
        <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Category</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Description</span>
        <input placeholder="e.g. Shrink wrap + boxes" value={f.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Amount $</span>
        <input type="number" step="0.01" min="0" value={f.amount} onChange={(e) => set("amount", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm text-right" />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Tie to batch (optional)</span>
        <select value={f.batchId} onChange={(e) => set("batchId", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          <option value="">— none —</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      <div className="sm:col-span-3 flex items-end gap-3 pb-0.5">
        <button
          onClick={submit}
          disabled={busy || !f.description || !f.amount}
          className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
        >
          {busy ? "Saving..." : "Add expense"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
