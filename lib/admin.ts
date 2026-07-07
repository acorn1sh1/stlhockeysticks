import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "stl_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours, matches cookie maxAge

// Lightweight ops-page gate: a single shared password in ADMIN_PASSWORD.
// Not a full user-auth system — it protects the internal /admin dashboard
// (inventory, orders, products, coupons, options, warranty) for the shop
// owner. Set a strong value in env.
//
// The cookie holds a signed session token, never the raw password: if the
// cookie leaks (logs, browser extension, XSS on another origin, etc.) it
// does not hand over the admin password itself, and it expires server-side
// even if someone tampers with the cookie's maxAge.
export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

function sessionSecret(): string {
  // Derive a signing key from the password rather than reusing it directly,
  // so the HMAC secret and the login credential aren't the same bytes.
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const salt = process.env.ADMIN_SESSION_SECRET ?? "stl-admin-session";
  return crypto.createHash("sha256").update(`${salt}:${pw}`).digest("hex");
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  const sig = crypto
    .createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = crypto
    .createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  return true;
}

// Constant-time password check so response timing doesn't leak how many
// leading characters of a guess were correct.
export function checkPassword(candidate: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(pw);
  if (a.length !== b.length) {
    // Still run a comparison of equal-length buffers so bail-out on length
    // mismatch doesn't itself become a timing oracle for length.
    crypto.timingSafeEqual(Buffer.alloc(b.length), Buffer.alloc(b.length));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
