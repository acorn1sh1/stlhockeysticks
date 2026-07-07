import crypto from "crypto";

// Verifies Clover's `Clover-Signature` header on Hosted Checkout webhooks.
// Docs: https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook
//
// Header shape: "t=<unix seconds>,v1=<hex hmac-sha256>"
// Signed message: `${t}.${rawBody}`, keyed with the merchant dashboard's
// Signing Secret (Ecommerce > Hosted Checkout > Webhook section).
//
// Without this, anyone who can guess/observe a cloverCheckoutId can POST a
// forged "payment approved" event straight to our webhook and get an order
// marked PAID (free product, stock decremented, coupon redeemed) with no
// money ever changing hands.

const MAX_CLOCK_SKEW_SECONDS = 5 * 60; // reject replays older than 5 minutes

export function verifyCloverSignature(
  rawBody: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const tsNum = Number(t);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > MAX_CLOCK_SKEW_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}
