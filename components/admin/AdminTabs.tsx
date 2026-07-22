"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type AdminTab = { id: string; label: string; content: ReactNode };

const STORE_KEY = "stl-admin-tab";

// Tabbed shell for /admin — keeps the page from being one endless scroll.
// Persists the active tab (localStorage + ?tab= in the URL) so a refresh or
// router.refresh() after saving keeps you where you were.
export default function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const router = useRouter();
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  // Restore from ?tab= first, then localStorage.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    const stored = (() => {
      try {
        return localStorage.getItem(STORE_KEY);
      } catch {
        return null;
      }
    })();
    const wanted = fromUrl || stored;
    if (wanted && tabs.some((t) => t.id === wanted)) setActive(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(id: string) {
    setActive(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url);
  }

  async function signOut() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-black/10 bg-paper/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between pt-6">
            <h1 className="text-3xl font-black">Shop Admin</h1>
            <button
              onClick={signOut}
              className="rounded-full border border-black/20 px-4 py-2 text-sm font-bold hover:bg-black/5"
            >
              Sign out
            </button>
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto pb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                className={`whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  t.id === current?.id
                    ? "border-ink text-ink"
                    : "border-transparent text-black/40 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">{current?.content}</div>
    </div>
  );
}
