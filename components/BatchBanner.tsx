"use client";

import { nextBatch } from "@/lib/catalog";
import { useEffect, useState } from "react";

export default function BatchBanner() {
  // computed client-side to avoid SSR/client date mismatch
  const [batch, setBatch] = useState<ReturnType<typeof nextBatch> | null>(null);
  useEffect(() => setBatch(nextBatch()), []);
  if (!batch) return <div className="h-10 bg-volt" />;

  return (
    <div className="bg-volt py-2.5 text-center text-sm font-bold text-ink">
      Next batch order locks in {batch.daysLeft} day{batch.daysLeft === 1 ? "" : "s"} —
      pre-order now, pick up locally around{" "}
      {batch.pickupStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
      . Zero shipping fees.
    </div>
  );
}
