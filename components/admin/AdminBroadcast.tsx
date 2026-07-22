"use client";

import { useState } from "react";

async function post(body: unknown) {
  return fetch("/api/admin/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Marketing broadcast composer. Sends only to opted-in, non-unsubscribed
// customers, each with an unsubscribe link. Optional batch scope.
export default function AdminBroadcast({ batches }: { batches: { id: string; name: string }[] }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [batchId, setBatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function preview() {
    setBusy(true);
    setResult("");
    const res = await post({ preview: true, batchId: batchId || undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setResult(`${data.eligible} eligible recipient${data.eligible === 1 ? "" : "s"}${data.skipped ? ` · ${data.skipped} unsubscribed (skipped)` : ""}.`);
    else setResult(data?.error ?? "Preview failed");
  }

  async function send() {
    if (!confirm("Send this marketing email to all opted-in customers?")) return;
    setBusy(true);
    setResult("");
    const res = await post({ subject, message, batchId: batchId || undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setResult(`Sent to ${data.sent}/${data.total}.${data.skipped ? ` ${data.skipped} unsubscribed skipped.` : ""}${data.failed?.length ? ` Failed: ${data.failed.join(", ")}` : ""}`);
      setSubject("");
      setMessage("");
    } else {
      setResult(data?.error ?? "Send failed");
    }
  }

  return (
    <section>
      <h2 className="text-xl font-black">Marketing broadcast</h2>
      <p className="mt-1 text-sm text-black/50">
        Goes only to customers who opted in at checkout and haven&apos;t
        unsubscribed. Every email includes an unsubscribe link. For order/pickup
        updates use &ldquo;Email everyone in this batch&rdquo; under Batches instead.
      </p>

      <div className="mt-4 space-y-3 rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase text-black/40">Audience</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
            >
              <option value="">All opted-in customers</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>Just batch: {b.name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={preview}
            disabled={busy}
            className="mt-5 rounded-full border border-black/20 px-4 py-2 text-xs font-bold hover:bg-black/5 disabled:opacity-40"
          >
            {busy ? "…" : "Preview count"}
          </button>
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject — e.g. New club designs just dropped 🏒"
          className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Message… (plain text; we add a greeting and an unsubscribe footer)"
          className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={send}
            disabled={busy || !subject.trim() || !message.trim()}
            className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
          >
            {busy ? "Sending..." : "Send broadcast"}
          </button>
          {result && <span className="text-sm text-black/60">{result}</span>}
        </div>
      </div>
    </section>
  );
}
