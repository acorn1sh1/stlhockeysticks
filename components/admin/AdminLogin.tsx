"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => null);
      setError(b?.error ?? "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="text-3xl font-black">Admin</h1>
      <p className="mt-2 text-sm text-black/60">Enter the shop password.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-black/20 px-3 py-2"
          autoFocus
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-ink py-3 font-bold text-paper hover:bg-ink/80 disabled:opacity-50"
        >
          {busy ? "Checking..." : "Sign In"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
