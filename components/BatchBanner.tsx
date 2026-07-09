"use client";

import { batchDiscountActive, nextBatch } from "@/lib/catalog";
import { useEffect, useState } from "react";

export default function BatchBanner() {
  // computed client-side to avoid SSR/client date mismatch
  const [batch, setBatch] = useState<ReturnType<typeof nextBatch> | null>(null);
  const [launchOn, setLaunchOn] = useState(false);
  useEffect(() => {
    setBatch(nextBatch());
    setLaunchOn(batchDiscountActive());
  }, []);
  if (!batch) return <div className="h-10 bg-volt" />;

  // While the first-batch launch promo runs, headline the tiered discount.
  if (launchOn) {
    return (
      <div className="bg-volt py-2.5 text-center text-sm font-bold text-ink">
        First-Batch Launch: order by Aug 1 &amp; save up to 25% — 10% off 2+ sticks,
        20% off 5+, 25% off 10+. Auto-applied at checkout. Zero shipping.
      </div>
    );
  }

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
