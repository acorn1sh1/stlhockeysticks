"use client";

import { useState } from "react";

export default function ClubInquiryForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/club-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done")
    return (
      <div className="mt-4 rounded-xl bg-volt/20 p-4 text-sm font-semibold">
        Got it! We&apos;ll reach out about your custom stick soon.
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 text-sm">
      <div>
        <label className="mb-1 block font-bold" htmlFor="orgType">Who are you ordering for?</label>
        <select id="orgType" name="orgType" required defaultValue="CLUB" className="w-full rounded-lg border border-black/20 bg-white px-3 py-2">
          <option value="CLUB">Hockey club</option>
          <option value="SCHOOL">School</option>
          <option value="TEAM">Team</option>
          <option value="OTHER">Something else</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="clubName">Club / school / team name</label>
        <input id="clubName" name="clubName" required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="Your organization's name" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="contact">Your name</label>
        <input id="contact" name="contact" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="message">Tell us about the order</label>
        <textarea id="message" name="message" rows={4} required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="Colors, rough quantity, timeline..." />
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-ink py-3 font-bold text-paper hover:bg-ink/80 disabled:opacity-50"
      >
        {state === "sending" ? "Sending..." : "Request a Free Mockup"}
      </button>
      {state === "error" && (
        <p className="text-red-600">Something broke — try again or email us.</p>
      )}
    </form>
  );
}
