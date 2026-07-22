"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";

export default function SuccessPage() {
  const { clear } = useCart();
  useEffect(() => clear(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-volt text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-black">Order locked in!</h1>
      <p className="mt-3 text-black/60">
        Payment received. You&apos;ll get an email confirmation now, and another
        when your sticks are ready for pickup in St. Louis.
      </p>
      <p className="mt-3 text-sm text-black/50">
        That confirmation has a private link to your order status — hang onto it
        and you can check on your sticks any time, no account needed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-ink px-7 py-3 font-bold text-paper hover:bg-ink/80"
      >
        Back to Home
      </Link>
    </div>
  );
}
