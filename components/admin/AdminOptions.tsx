"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

async function post(body: unknown) {
  return fetch("/api/admin/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const catLabel = (c: string) => (c === "ALL" ? "All" : c.replace(/_/g, " "));
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Tier-first options matrix. One panel per sizing tier; attributes are the
// columns; each cell holds the values (chips) valid for that tier. A value
// scoped "ALL" shows as an inherited (greyed) chip in every tier panel — edit
// it once, it changes everywhere. Category (Full stick / Goalie) is a filter
// at the top, since curve/paddle sets differ by category.
export default function AdminOptions({
  options,
  kinds,
  sizings,
  categories,
}: {
  options: OptionRow[];
  kinds: string[]; // AttributeKind keys, e.g. FLEX/CURVE/HAND/COLOR/LENGTH/PADDLE
  sizings: string[]; // "ALL" + SizingTier keys
  categories: string[]; // "ALL" + Category keys
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const tiers = sizings.filter((s) => s !== "ALL");
  const realCats = categories.filter((c) => c !== "ALL");
  const [cat, setCat] = useState<string>(realCats[0] ?? "ALL");
  const [adding, setAdding] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);

  // Does a value apply under the selected category filter?
  const inCat = (o: OptionRow) => cat === "ALL" || o.category === "ALL" || o.category === cat;

  const selected = useMemo(() => options.find((o) => o.id === selId) ?? null, [options, selId]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Pre-Order Options</h2>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setSelId(null);
          }}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper hover:bg-ink/80"
        >
          {adding ? "Cancel" : "+ Add value"}
        </button>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Each sizing tier is a table; attributes are the columns. A{" "}
        <span className="rounded bg-black/10 px-1 text-[10px] font-bold">ALL</span>{" "}
        chip is shared across every tier — edit it once. Click any chip to set
        its upcharge, default, or hide it.
      </p>

      {/* Category filter */}
      {realCats.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-black/40">Category</span>
          {["ALL", ...realCats].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                cat === c ? "bg-ink text-paper" : "bg-black/10 text-black/60 hover:bg-black/20"
              }`}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      )}

      {adding && (
        <AddOption
          kinds={kinds}
          tiers={tiers}
          categories={categories}
          defaultCategory={cat}
          onDone={() => {
            setAdding(false);
            refresh();
          }}
        />
      )}

      {/* Inline chip editor */}
      {selected && (
        <ChipEditor
          key={selected.id}
          row={selected}
          onClose={() => setSelId(null)}
          onSaved={() => {
            setSelId(null);
            refresh();
          }}
        />
      )}

      <div className="mt-5 space-y-5">
        {tiers.map((tier) => {
          const cols = kinds
            .map((kind) => ({
              kind,
              rows: options
                .filter(
                  (o) => o.kind === kind && (o.sizing === tier || o.sizing === "ALL") && inCat(o)
                )
                .sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value)),
            }))
            .filter((c) => c.rows.length);

          return (
            <div key={tier} className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
              <div className="border-b border-black/10 bg-black/[0.02] px-4 py-2 text-sm font-black uppercase tracking-wide">
                {tier}
              </div>
              {cols.length === 0 ? (
                <div className="px-4 py-6 text-sm text-black/40">
                  No options for this tier{cat !== "ALL" ? ` in ${catLabel(cat)}` : ""}.
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto p-4">
                  {cols.map((col) => (
                    <div key={col.kind} className="min-w-[9rem] flex-1">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-black/40">
                        {col.kind}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {col.rows.map((o) => (
                          <Chip
                            key={o.id}
                            row={o}
                            tier={tier}
                            active={o.id === selId}
                            onClick={() => {
                              setSelId((cur) => (cur === o.id ? null : o.id));
                              setAdding(false);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chip({
  row,
  tier,
  active,
  onClick,
}: {
  row: OptionRow;
  tier: string;
  active: boolean;
  onClick: () => void;
}) {
  const inherited = row.sizing === "ALL";
  return (
    <button
      onClick={onClick}
      title={inherited ? "Shared across all tiers" : `${tier} only`}
      className={[
        "group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        active ? "border-ink ring-2 ring-ink/30" : "border-black/15 hover:border-black/40",
        !row.active ? "opacity-40 line-through" : "",
        inherited ? "bg-black/[0.04] text-black/60" : "bg-white text-ink",
      ].join(" ")}
    >
      {row.isDefault && <span aria-label="default">★</span>}
      <span>{row.label ?? row.value}</span>
      {row.upchargeCents > 0 && <span className="text-black/40">+{money(row.upchargeCents)}</span>}
      {inherited && (
        <span className="rounded bg-black/10 px-1 text-[9px] font-bold tracking-wide">ALL</span>
      )}
    </button>
  );
}

function ChipEditor({
  row,
  onClose,
  onSaved,
}: {
  row: OptionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border-2 border-ink/20 bg-white p-4">
      <div>
        <div className="text-xs font-bold uppercase text-black/40">{row.kind}</div>
        <div className="text-lg font-black">{row.label ?? row.value}</div>
        <div className="text-xs text-black/40">
          {row.sizing === "ALL" ? "All tiers" : row.sizing} · {catLabel(row.category)}
        </div>
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Upcharge</span>
        <div className="flex items-center gap-2">
          <span className="text-black/40">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            className="w-24 rounded-lg border border-black/20 px-2 py-1 text-right"
          />
          <button
            onClick={() => save({ upchargeCents: Math.round(Number(dollars) * 100) })}
            disabled={!dirty || busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {busy ? "…" : "Save"}
          </button>
        </div>
      </label>
      <button
        onClick={() => save({ isDefault: !row.isDefault })}
        className={`rounded-full px-3 py-2 text-xs font-bold ${
          row.isDefault ? "bg-volt/40 text-ink" : "bg-black/10 text-black/50 hover:bg-black/20"
        }`}
      >
        {row.isDefault ? "★ Default" : "Set default"}
      </button>
      <button
        onClick={() => save({ active: !row.active })}
        className={`rounded-full px-3 py-2 text-xs font-bold ${
          row.active ? "bg-volt/30 text-ink" : "bg-black/10 text-black/50 hover:bg-black/20"
        }`}
      >
        {row.active ? "Active" : "Hidden"}
      </button>
      <button
        onClick={onClose}
        className="ml-auto rounded-full px-3 py-2 text-xs font-bold text-black/40 hover:text-black"
      >
        Close
      </button>
    </div>
  );
}

function AddOption({
  kinds,
  tiers,
  categories,
  defaultCategory,
  onDone,
}: {
  kinds: string[];
  tiers: string[]; // real sizing tiers (no ALL)
  categories: string[]; // "ALL" + cats
  defaultCategory: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState(kinds[0] ?? "");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [upcharge, setUpcharge] = useState("0");
  const [category, setCategory] = useState(defaultCategory);
  const [allTiers, setAllTiers] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (t: string) =>
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  async function submit() {
    setError("");
    const sizings = allTiers ? ["ALL"] : picked;
    if (!value.trim()) return setError("Value required");
    if (sizings.length === 0) return setError("Pick at least one tier (or All tiers)");
    setBusy(true);
    const res = await post({
      kind,
      value: value.trim(),
      label: label || undefined,
      sizings,
      category,
      upchargeCents: Math.round(Number(upcharge) * 100),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border-2 border-ink/20 bg-white p-5 sm:grid-cols-4">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Attribute</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Value</span>
        <input placeholder='90 · P28 · 58"' value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Label (optional)</span>
        <input placeholder="display override" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Upcharge (USD)</span>
        <input type="number" step="0.01" min="0" value={upcharge} onChange={(e) => setUpcharge(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm" />
      </label>

      {/* Multi-select tiers */}
      <div className="text-sm sm:col-span-3">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Applies to</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllTiers(true)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${allTiers ? "bg-ink text-paper" : "bg-black/10 text-black/60 hover:bg-black/20"}`}
          >
            All tiers
          </button>
          <span className="text-xs text-black/30">or</span>
          {tiers.map((t) => {
            const on = !allTiers && picked.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setAllTiers(false);
                  toggle(t);
                }}
                className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-ink text-paper" : "bg-black/10 text-black/60 hover:bg-black/20"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase text-black/40">Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm">
          {categories.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button onClick={submit} disabled={busy || !value.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40">
          {busy ? "Saving…" : allTiers ? "Add to all tiers" : `Add to ${picked.length || 0} tier${picked.length === 1 ? "" : "s"}`}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-xs text-black/40">
          Pick multiple tiers to reuse one value (e.g. a curve for Senior + Int).
        </span>
      </div>
    </div>
  );
}
