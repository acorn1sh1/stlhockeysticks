"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type WarrantyRow = {
  id: string;
  orderId: string;
  name: string;
  email: string;
  productName: string;
  description: string;
  status: string;
  createdAt: string;
  photos: { mimeType: string; dataBase64: string }[];
};

const STATUSES = ["SUBMITTED", "APPROVED", "DENIED", "REPLACED", "REFUNDED"];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminWarranty({ claims }: { claims: WarrantyRow[] }) {
  const router = useRouter();

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/admin/warranty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <section>
      <h2 className="text-xl font-black">Warranty Claims</h2>
      <p className="mt-1 text-sm text-black/50">
        Submitted within 30 days of purchase, with photos. Approve, deny, or mark resolved.
      </p>

      <div className="mt-4 space-y-4">
        {claims.length === 0 && (
          <p className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/50">
            No claims yet.
          </p>
        )}
        {claims.map((c) => (
          <div key={c.id} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold">{c.productName}</div>
                <div className="text-xs text-black/50">
                  {c.name} · {c.email} · order {c.orderId.slice(0, 8)}… · {fmtDate(c.createdAt)}
                </div>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold">
                {c.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-black/70">{c.description}</p>

            {c.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={`data:${p.mimeType};base64,${p.dataBase64}`}
                    alt={`claim photo ${i + 1}`}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== c.status).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(c.id, s)}
                  className="rounded-full border border-black/20 px-3 py-1 text-xs font-bold hover:bg-black/5"
                >
                  Mark {s.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
