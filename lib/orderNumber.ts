// Customer-facing order numbers.
//
// Internally an order is a cuid (`clx3k9f2a0001abcd8xyz9012`). That's fine for
// URLs and foreign keys and useless for a human — nobody reads it over the
// phone or retypes it into the warranty form. `Order.orderNumber` is a plain
// Postgres sequence rendered as "STL-1042".
//
// The parser is deliberately forgiving. Every value it accepts is something a
// real customer might paste: with or without the prefix, wrong case, extra
// whitespace, a stray "#", or a full-width dash copied out of an email client.

/** Sequence starts here, so the first order reads STL-1000 rather than STL-1. */
export const ORDER_NUMBER_START = 1000;

const PREFIX = "STL";

/** Render a stored order number for display: 1042 -> "STL-1042". */
export function formatOrderNumber(n: number): string {
  return `${PREFIX}-${n}`;
}

/**
 * Parse whatever the customer typed into a bare order number.
 * Returns null when the input isn't plausibly an order number at all.
 *
 * Accepts: "STL-1042", "stl 1042", "#STL–1042", " 1042 ", "STL1042"
 * Rejects: "", "STL-", "abc", "-5", "1042abc", cuids
 */
export function parseOrderNumber(input: string): number | null {
  if (typeof input !== "string") return null;

  const cleaned = input
    .trim()
    // en/em dashes and non-breaking spaces survive copy-paste out of email
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/^#/, "")
    .replace(new RegExp(`^${PREFIX}[\\s-]*`, "i"), "")
    .trim();

  // Bare digits only — "1042abc" is a typo, not an order number, and quietly
  // parsing it to 1042 would show someone else's order.
  if (!/^\d+$/.test(cleaned)) return null;

  const n = Number(cleaned);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Does this look like an internal cuid rather than an order number?
 * Used by the warranty lookup, which still accepts the raw id so links and
 * claims from before order numbers existed keep working.
 */
export function looksLikeOrderId(input: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(input.trim());
}
