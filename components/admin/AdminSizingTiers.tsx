"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type SizingTierRow = {
  id: string;
  key: string;
  label: string;
  tag: string;
  sortOrder: number;
  active: boolean;
};

async function post(body: unknown) {
  return fetch("/api/admin/sizing-tier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Admin CRUD for the SizingTier catalog (Senior/Int/Jr/Youth). Scopes FLEX
// and LENGTH option values, and Product.sizingTier. A brand-new tier's own
// /sticks/{tier} landing page is still a small code change (see
// docs/admin-catalog-config-design.md) — this table covers everything else.
export default function AdminSizingTiers({ tiers }: { tiers: SizingTierRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Sizing Tiers</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add tier"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Scopes flex &amp; length choices and product assignment. A new
        tier&apos;s dedicated landing page still needs a code change; everything
        else here works immediately.
      </p>

      {adding && <AddTier onDone={() => { setAdding(false); router.refresh(); }} />}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Key</th>
              <th className="p-3">Label</th>
              <th className="p-3">Tag</th>
              <th className="p-3">Active</th>
              <th className="p-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <Row key={t.id} row={t} onSaved={() => router.refresh()} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ row, onSaved }: { row: SizingTierRow; onSaved: () => void }) {
  const [label, setLabel] = useState(row.label);
  const [tag, setTag] = useState(row.tag);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = label !== row.label || tag !== row.tag;

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    const res = await post({ key: row.key, ...patch });
    setBusy(false);
    if (res.ok) onSaved();
  }

  async function del() {
    setError("");
    setBusy(true);
    const res = await post({ key: row.key, delete: true });
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <tr className={`border-b border-black/5 last:border-0 ${row.active ? "" : "opacity-50"}`}>
      <td className="p-3 font-mono text-xs text-black/50">{row.key}</td>
      <td className="p-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-28 rounded-lg border border-black/20 px-2 py-1" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <input value={tag} onChange={(e) => setTag(e.target.value)} className="w-48 rounded-lg border border-black/20 px-2 py-1" />
          <button
            onClick={() => save({ label, tag })}
            disabled={!dirty || busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {busy ? "..." : "Save"}
          </button>
        </div>
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
      <td className="p-3">
        <button
          onClick={del}
          disabled={busy}
          className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40"
        >
          Delete
        </button>
        {error && <div className="mt-1 max-w-[200px] text-xs text-red-600">{error}</div>}
      </td>
    </tr>
  );
}

function AddTier({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post({ key, label, tag });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Key</span>
        <input placeholder="e.g. ADULT_REC" value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Label</span>
        <input placeholder="Adult Rec" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Tag</span>
        <input placeholder="Short blurb" value={tag} onChange={(e) => setTag(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !key || !label} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Add tier"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
