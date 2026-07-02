"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useState } from "react";

const nav = [
  { href: "/sticks", label: "Full Sticks" },
  { href: "/mini-sticks", label: "Mini Sticks" },
  { href: "/clubs", label: "For Clubs" },
  { href: "/how-it-works", label: "How It Works" },
];

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="inline-block rounded bg-ink px-2 py-1 text-sm text-volt">
            STL
          </span>
          <span className="text-lg">HOCKEY STICKS</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-volt-dark">
              {n.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="rounded-full bg-ink px-4 py-2 text-paper hover:bg-ink/80"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <div className="space-y-1.5">
            <div className="h-0.5 w-6 bg-ink" />
            <div className="h-0.5 w-6 bg-ink" />
            <div className="h-0.5 w-6 bg-ink" />
          </div>
        </button>
      </div>

      {open && (
        <nav className="border-t border-black/10 px-4 py-3 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block py-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="mt-2 block rounded-full bg-ink px-4 py-2 text-center font-semibold text-paper"
            onClick={() => setOpen(false)}
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      )}
    </header>
  );
}
