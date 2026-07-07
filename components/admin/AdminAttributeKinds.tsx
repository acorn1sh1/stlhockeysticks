"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AttributeKindRow = {
  id: string;
  key: string;
  label: string;
  unit: string;
  sortOrder: number;
  active: boolean;
};

async function post(body: unknown) {
  return fetch("/api/admin/attribute-kind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Admin CRUD for the AttributeKind catalog — replaces the old
// `enum OptionKind`. A new row here (e.g. "GRIP") is immediately selectable
// as a Kind in the Pre-Order Options editor below.
export default function AdminAttributeKinds({ kinds }: { kinds: AttributeKindRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Attribute Types</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add attribute type"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Flex, Curve, Hand, Color, Length, Paddle Size — and anything new you
        add here shows up as a Kind option below immediately.
      </p>

      {adding && <AddKind onDone={() => { setAdding(false); router.refresh(); }} />}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Key</th>
              <th className="p-3">Label</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Active</th>
              <th className="p-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <Row key={k.id} row={k} onSaved={() => router.refresh()} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ row, onSaved }: { row: AttributeKindRow; onSaved: () => void }) {
  const [label, setLabel] = useState(row.label);
  const [unit, setUnit] = useState(row.unit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = label !== row.label || unit !== row.unit;

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
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-32 rounded-lg border border-black/20 px-2 py-1" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={'e.g. "'} className="w-16 rounded-lg border border-black/20 px-2 py-1" />
          <button
            onClick={() => save({ label, unit })}
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

function AddKind({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post({ key, label, unit });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Key</span>
        <input placeholder="e.g. GRIP" value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Label</span>
        <input placeholder="Grip" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Unit (optional)</span>
        <input placeholder={'e.g. "'} value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !key || !label} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving..." : "Add attribute type"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
