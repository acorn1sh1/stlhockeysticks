import { cookies } from "next/headers";

export const ADMIN_COOKIE = "stl_admin";

// Lightweight ops-page gate: a single shared password in ADMIN_PASSWORD.
// Not a full user-auth system — it protects the internal /admin dashboard
// (stock counts, batch status) for the shop owner. Set a strong value in env.
export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === pw;
}
