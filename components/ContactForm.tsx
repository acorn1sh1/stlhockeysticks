"use client";

import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done")
    return (
      <div className="mt-4 rounded-xl bg-volt/20 p-4 text-sm font-semibold">
        Thanks — message received. We&apos;ll get back to you by email soon.
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 text-sm">
      <div>
        <label className="mb-1 block font-bold" htmlFor="name">Your name</label>
        <input id="name" name="name" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="subject">Subject</label>
        <input id="subject" name="subject" required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="Order question, pickup, sizing..." />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={5} required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="How can we help?" />
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-ink py-3 font-bold text-paper hover:bg-ink/80 disabled:opacity-50"
      >
        {state === "sending" ? "Sending..." : "Send Message"}
      </button>
      {state === "error" && (
        <p className="text-red-600">Something broke — try again or email us directly.</p>
      )}
    </form>
  );
}
