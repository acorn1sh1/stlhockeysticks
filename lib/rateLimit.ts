// Best-effort login throttle. Serverless functions are stateless across
// cold starts / instances, so this in-memory map only protects a single
// warm instance — it's a speed bump against casual brute force, not a
// distributed rate limiter. If this ever needs to be airtight, move the
// counters to Redis/Upstash or Postgres.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 8;

// Vitest sets NODE_ENV=test by default. Route tests call POST many times in
// a row from the same unkeyed request (no x-forwarded-for), which would
// otherwise all land in one bucket and start 429ing partway through a test
// file. Limiting is a production/runtime concern, not something route tests
// are exercising, so it's disabled under test rather than threading a fake
// distinct IP through every test file.
const disabled = process.env.NODE_ENV === "test";

type Bucket = { count: number; resetAt: number };

const attempts = new Map<string, Bucket>();

function prune(now: number) {
  if (attempts.size < 500) return; // avoid scanning on every call
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }
}

export function isRateLimited(key: string): boolean {
  if (disabled) return false;
  const now = Date.now();
  const bucket = attempts.get(key);
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const bucket = attempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

// General-purpose fixed-window limiter for public write endpoints (warranty
// claims, coupon lookups, contact forms, checkout session creation) — as
// opposed to isRateLimited/recordFailure above, which are specifically for
// the login-attempt counter. Separate map so the two never collide on key.
const windows = new Map<string, Bucket>();

function pruneWindows(now: number) {
  if (windows.size < 500) return;
  for (const [key, bucket] of windows) {
    if (bucket.resetAt <= now) windows.delete(key);
  }
}

export function consumeRateLimit(
  key: string,
  opts: { windowMs: number; max: number }
): boolean {
  if (disabled) return true;
  const now = Date.now();
  pruneWindows(now);
  const bucket = windows.get(key);
  if (!bucket || bucket.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (bucket.count >= opts.max) return false;
  bucket.count += 1;
  return true;
}
