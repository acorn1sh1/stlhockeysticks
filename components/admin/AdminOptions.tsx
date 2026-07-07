"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type OptionRow = {
  id: string;
  kind: string;
  value: string;
  label: string | null;
  sizing: string;
  category: string;
  upchargeCents: number;
  isDefault: boolean;
  sortOrder: number;
  active: boolean;
};

const KINDS = ["FLEX", "CURVE", "HAND", "COLOR", "LENGTH", "PADDLE"];
const SIZINGS = ["ALL", "SENIOR", "INT", "JR", "YTH"];
const CATEGORIES = ["ALL", "FULL_STICK", "GOALIE"];

async function post(body: unknown) {
  return fetch("/api/admin/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function AdminOptions({ options }: { options: OptionRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const byKind = KINDS.map((k) => ({
    kind: k,
    rows: options.filter((o) => o.kind === k),
  })).filter((g) => g.rows.length);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Pre-Order Options</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add option"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Flex, curve, hand, color, and length choices shown in the stick
        configurator. Flex &amp; length are scoped per sizing tier; curve &amp;
        paddle per category. &quot;ALL&quot; applies everywhere.
      </p>

      {adding && (
        <AddOption
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      <div className="mt-4 space-y-6">
        {byKind.map((g) => (
          <div key={g.kind} className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <div className="border-b border-black/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-black/50">
              {g.kind}
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
                <tr>
                  <th className="p-3">Value</th>
                  <th className="p-3">Scope</th>
                  <th className="p-3">Upcharge</th>
                  <th className="p-3">Default</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <OptionRowEditor key={r.id} row={r} onSaved={() => router.refresh()} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function OptionRowEditor({ row, onSaved }: { row: OptionRow; onSaved: () => void }) {
  const [dollars, setDollars] = useState((row.upchargeCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const dirty = Math.round(Number(dollars) * 100) !== row.upchargeCents;

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    const res = await post({ id: row.id, ...patch });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <tr className={`border-b border-black/5 last:border-0 ${row.active ? "" : "opacity-50"}`}>
      <td className="p-3">
        <div className="font-semibold">{row.label ?? row.value}</div>
        {row.label && <div className="text-xs text-black/40">{row.value}</div>}
      </td>
      <td className="p-3 text-black/60">
        {row.sizing !== "ALL" && <span className="mr-1">{row.sizing}</span>}
        {row.category !== "ALL" && (
          <span className="text-black/40">{row.category.replace("_", " ")}</span>
        )}
        {row.sizing === "ALL" && row.category === "ALL" && <span className="text-black/40">All</span>}
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
            className="w-20 rounded-lg border border-black/20 px-2 py-1 text-right"
          />
          <button
            onClick={() => save({ upchargeCents: Math.round(Number(dollars) * 100) })}
            disabled={!dirty || busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {busy ? "..." : "Save"}
          </button>
        </div>
      </td>
      <td className="p-3">
        <button
          onClick={() => save({ isDefault: !row.isDefault })}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            row.isDefault ? "bg-volt/40 text-ink" : "bg-black/10 text-black/50"
          }`}
        >
          {row.isDefault ? "Default ✓" : "Set default"}
        </button>
      </td>
      <td className="p-3">
        <button
          onClick={() => save({ active: !row.active })}
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

function AddOption({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    kind: "FLEX",
    value: "",
    label: "",
    sizing: "ALL",
    category: "ALL",
    upcharge: "0",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post({
      kind: f.kind,
      value: f.value,
      label: f.label || undefined,
      sizing: f.sizing,
      category: f.category,
      upchargeCents: Math.round(Number(f.upcharge) * 100),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Kind</span>
        <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Value</span>
        <input placeholder='e.g. 90 or P28 or 58"' value={f.value} onChange={(e) => set("value", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Label (optional)</span>
        <input placeholder="display override" value={f.label} onChange={(e) => set("label", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Sizing scope</span>
        <select value={f.sizing} onChange={(e) => set("sizing", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {SIZINGS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Category scope</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Upcharge (USD)</span>
        <input type="number" step="0.01" min="0" value={f.upcharge} onChange={(e) => set("upcharge", e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !f.value} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Add option"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-xs text-black/40">
          Flex/length: set a sizing scope. Curve/paddle: set a category scope.
        </span>
      </div>
    </div>
  );
}
