"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CatalogItem, SelectedOptions } from "./catalog";
import { unitPriceCents, optionsSummary } from "./catalog";

export type CartLine = {
  key: string; // slug + options fingerprint
  slug: string;
  name: string;
  priceCents: number; // unit price incl. option upcharges
  quantity: number;
  options?: SelectedOptions;
};

type CartCtx = {
  lines: CartLine[];
  add: (item: CatalogItem, options?: SelectedOptions, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalCents: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "stl-cart-v2";

const lineKey = (slug: string, options?: SelectedOptions) =>
  slug + "::" + (options ? optionsSummary(options) : "");

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  const add = (item: CatalogItem, options?: SelectedOptions, qty = 1) =>
    setLines((prev) => {
      const key = lineKey(item.slug, options);
      const found = prev.find((l) => l.key === key);
      if (found)
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + qty } : l
        );
      return [
        ...prev,
        {
          key,
          slug: item.slug,
          name: item.name,
          priceCents: unitPriceCents(item, options),
          quantity: qty,
          options,
        },
      ];
    });

  const remove = (key: string) =>
    setLines((prev) => prev.filter((l) => l.key !== key));

  const setQty = (key: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l))
    );

  const clear = () => setLines([]);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  return (
    <Ctx.Provider value={{ lines, add, remove, setQty, clear, count, subtotalCents }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}
