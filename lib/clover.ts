// Clover Hosted Checkout integration.
// Docs: https://docs.clover.com/docs/hosted-checkout
// POST /invoicingcheckoutservice/v1/checkouts creates a hosted checkout
// session; response includes `href` (redirect URL) and `checkoutSessionId`.

const BASE = process.env.CLOVER_API_BASE ?? "https://apisandbox.dev.clover.com";

export type CheckoutLine = {
  name: string;
  priceCents: number;
  quantity: number;
};

export async function createHostedCheckout(opts: {
  customer: { email: string; firstName?: string; lastName?: string; phone?: string };
  lines: CheckoutLine[];
  redirectUrls?: { success: string; failure: string; cancel: string };
}) {
  const merchantId = process.env.CLOVER_MERCHANT_ID;
  const token = process.env.CLOVER_API_TOKEN;
  if (!merchantId || !token) {
    throw new Error("Clover not configured: set CLOVER_MERCHANT_ID and CLOVER_API_TOKEN");
  }

  const res = await fetch(`${BASE}/invoicingcheckoutservice/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Clover-Merchant-Id": merchantId,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      customer: {
        email: opts.customer.email,
        firstName: opts.customer.firstName,
        lastName: opts.customer.lastName,
        phoneNumber: opts.customer.phone,
      },
      shoppingCart: {
        lineItems: opts.lines.map((l) => ({
          name: l.name,
          price: l.priceCents, // cents
          unitQty: l.quantity,
        })),
      },
      ...(opts.redirectUrls && {
        redirectUrls: {
          success: opts.redirectUrls.success,
          failure: opts.redirectUrls.failure,
          cancel: opts.redirectUrls.cancel,
        },
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clover checkout failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    href: string;
    checkoutSessionId: string;
  };
  return data;
}
