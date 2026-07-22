"use client";

import { useState } from "react";

type Photo = { name: string; mimeType: string; dataBase64: string };

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.replace(/^data:[^,]+,/, "")); // strip data: prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WarrantyForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [photos, setPhotos] = useState<Photo[]>([]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = Array.from(e.target.files ?? []);
    const next: Photo[] = [];
    for (const f of files) {
      if (f.size > MAX_PHOTO_BYTES) {
        setError(`"${f.name}" is over 8MB. Please pick a smaller image.`);
        continue;
      }
      next.push({
        name: f.name,
        mimeType: f.type || "image/jpeg",
        dataBase64: await fileToBase64(f),
      });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    e.target.value = ""; // allow re-picking same file
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (photos.length === 0) {
      setError("Please attach at least one photo of the broken stick.");
      return;
    }
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const payload = {
      orderId: fd.get("orderId"),
      email: fd.get("email"),
      name: fd.get("name"),
      phone: fd.get("phone"),
      productName: fd.get("productName"),
      description: fd.get("description"),
      photos: photos.map((p) => ({ mimeType: p.mimeType, dataBase64: p.dataBase64 })),
    };
    const res = await fetch("/api/warranty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setState("done");
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "done")
    return (
      <div className="mt-4 rounded-xl bg-volt/20 p-4 text-sm font-semibold">
        Claim received. We&apos;ll review your photos and email you within a couple
        business days about your replacement stick.
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-bold" htmlFor="orderId">Order number</label>
          <input id="orderId" name="orderId" required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="From your confirmation email" />
        </div>
        <div>
          <label className="mb-1 block font-bold" htmlFor="email">Email on the order</label>
          <input id="email" name="email" type="email" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-bold" htmlFor="name">Your name</label>
          <input id="name" name="name" required className="w-full rounded-lg border border-black/20 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block font-bold" htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" className="w-full rounded-lg border border-black/20 px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="mb-1 block font-bold" htmlFor="productName">Which stick broke?</label>
        <input id="productName" name="productName" required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="e.g. Pro T1100 Senior, 85 flex" />
      </div>

      <div>
        <label className="mb-1 block font-bold" htmlFor="description">What happened?</label>
        <textarea id="description" name="description" rows={4} required className="w-full rounded-lg border border-black/20 px-3 py-2" placeholder="Where it broke, how it was being used, when you noticed..." />
      </div>

      <div>
        <label className="mb-1 block font-bold" htmlFor="photos">
          Photos of the broken stick{" "}
          <span className="font-normal text-black/50">
            (required, up to {MAX_PHOTOS} — include the break and the manufacturing
            info printed on the shaft)
          </span>
        </label>
        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
          className="w-full rounded-lg border border-black/20 px-3 py-2 file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:font-bold file:text-paper"
        />
        {photos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {photos.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-1.5">
                <span className="truncate">{p.name}</span>
                <button type="button" onClick={() => removePhoto(i)} className="ml-3 shrink-0 font-bold text-red-600">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-ink py-3 font-bold text-paper hover:bg-ink/80 disabled:opacity-50"
      >
        {state === "sending" ? "Submitting..." : "Submit Warranty Claim"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
