"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ClubRow = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

async function post(body: unknown) {
  return fetch("/api/admin/club", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Admin CRUD for the Club catalog. Clubs feed the customer "choose your club"
// picker on the custom club mini and the club field in the in-stock SKU
// builder. "Active" = ready — customers only see active clubs; you can select
// any club in the admin builder.
export default function AdminClubs({ clubs }: { clubs: ClubRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Clubs</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add club"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Clubs power the &ldquo;choose your club&rdquo; picker on the custom club
        mini. Add a club here, then mark it <strong>Active</strong> when the
        design is ready — customers only see active clubs. Inactive clubs are
        still selectable in the in-stock SKU builder.
      </p>

      {adding && (
        <AddClub
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Club</th>
              <th className="p-3">Shown to customers</th>
              <th className="p-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {clubs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-sm text-black/50">
                  No clubs yet — add one to start.
                </td>
              </tr>
            )}
            {clubs.map((c) => (
              <Row key={c.id} row={c} onSaved={() => router.refresh()} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ row, onSaved }: { row: ClubRow; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = name !== row.name;

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await post({ id: row.id, ...patch });
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function del() {
    setError("");
    setBusy(true);
    let res = await post({ id: row.id, delete: true });
    if (res.status === 409) {
      const msg = (await res.json().catch(() => ({})))?.error ?? "Club is in use.";
      if (!confirm(`${msg}`)) {
        setBusy(false);
        return;
      }
      res = await post({ id: row.id, delete: true, force: true });
    }
    setBusy(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <tr className={`border-b border-black/5 last:border-0 ${row.active ? "" : "opacity-60"}`}>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-56 rounded-lg border border-black/20 px-2 py-1"
          />
          <button
            onClick={() => save({ name })}
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

function AddClub({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post({ name });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-5">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Club name</span>
        <input
          placeholder="e.g. Affton Americans"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64 rounded-lg border border-black/20 px-3 py-2 text-sm"
        />
      </label>
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
      >
        {busy ? "Saving..." : "Add club"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
      <p className="w-full text-xs text-black/40">
        New clubs start hidden — mark them Active when the design is ready to
        show customers.
      </p>
    </div>
  );
}
