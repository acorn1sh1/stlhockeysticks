"use client";

import { useMemo, useState } from "react";
import { fmtPrice } from "@/lib/catalog";

export type CustomerRow = {
  email: string;
  name: string;
  phone: string | null;
  orders: number;
  paidOrders: number;
  spentCents: number;
  firstOrderAt: string; // ISO
  lastOrderAt: string; // ISO
  batches: string[];
  marketing: boolean; // opted in and not unsubscribed
  unsubscribed: boolean;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Read-only customer list derived from orders (deduped by email). First CRM
// step: see who's ordered, what they've spent, and reach them by email.
// Marketing segments / broadcast come later.
export default function AdminCustomers({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "spend" | "orders">("recent");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            c.email.toLowerCase().includes(needle) ||
            c.batches.some((b) => b.toLowerCase().includes(needle))
        )
      : customers;
    const sorted = [...filtered];
    if (sort === "spend") sorted.sort((a, b) => b.spentCents - a.spentCents);
    else if (sort === "orders") sorted.sort((a, b) => b.orders - a.orders);
    else sorted.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
    return sorted;
  }, [customers, q, sort]);

  const totalSpent = customers.reduce((n, c) => n + c.spentCents, 0);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Orders", "Paid orders", "Total spent", "First order", "Last order", "Batches", "Marketing"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = rows.map((c) =>
      [
        c.name,
        c.email,
        c.phone ?? "",
        String(c.orders),
        String(c.paidOrders),
        (c.spentCents / 100).toFixed(2),
        fmtDate(c.firstOrderAt),
        fmtDate(c.lastOrderAt),
        c.batches.join("; "),
        c.unsubscribed ? "unsubscribed" : c.marketing ? "opted-in" : "no",
      ].map(esc).join(",")
    );
    const csv = [header.map(esc).join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stl-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allEmails = rows.map((c) => c.email).join(",");

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Customers</h2>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:?bcc=${encodeURIComponent(allEmails)}`}
            className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-bold hover:bg-black/5"
            title="Opens your mail app with everyone shown BCC'd"
          >
            Email all shown ({rows.length})
          </a>
          <button
            onClick={exportCsv}
            className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-bold hover:bg-black/5"
          >
            Export CSV
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-black/50">
        {customers.length} customer{customers.length === 1 ? "" : "s"} · {fmtPrice(totalSpent)} lifetime
        revenue. Built from orders — no extra setup. Per-batch email lives in the
        Batches section above.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, or club…"
          className="w-64 rounded-lg border border-black/20 px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
        >
          <option value="recent">Most recent</option>
          <option value="spend">Top spenders</option>
          <option value="orders">Most orders</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Total spent</th>
              <th className="p-3">Last order</th>
              <th className="p-3">Batches</th>
              <th className="p-3">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-black/50">
                  {customers.length === 0 ? "No customers yet." : "No matches."}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.email} className="border-b border-black/5 align-top last:border-0">
                <td className="p-3">
                  <div className="font-semibold">{c.name || "—"}</div>
                  <a href={`mailto:${c.email}`} className="text-xs text-volt-dark underline">
                    {c.email}
                  </a>
                  {c.phone && <div className="text-xs text-black/40">{c.phone}</div>}
                </td>
                <td className="p-3">
                  {c.orders}
                  {c.paidOrders !== c.orders && (
                    <span className="text-black/40"> ({c.paidOrders} paid)</span>
                  )}
                </td>
                <td className="p-3 font-semibold">{fmtPrice(c.spentCents)}</td>
                <td className="p-3 whitespace-nowrap text-black/60">{fmtDate(c.lastOrderAt)}</td>
                <td className="p-3 text-xs text-black/60">{c.batches.join(", ") || "—"}</td>
                <td className="p-3">
                  {c.unsubscribed ? (
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold text-black/50">Unsubscribed</span>
                  ) : c.marketing ? (
                    <span className="rounded-full bg-volt/30 px-2 py-0.5 text-[11px] font-bold text-ink">Opted in</span>
                  ) : (
                    <span className="text-[11px] text-black/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
