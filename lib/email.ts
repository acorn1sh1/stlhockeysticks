// Thin Resend wrapper. Uses the REST API directly (no SDK dependency).
// Configure with RESEND_API_KEY + ALERT_EMAIL (recipient) + optional
// EMAIL_FROM (defaults to onboarding@resend.dev for quick testing).
// If keys aren't set, sendEmail is a no-op so the app still works.
//
// Sender vs reply-to:
//   EMAIL_FROM     — the visible sender, e.g. "STL Hockey Sticks
//                    <orders@stlhockeysticks.com>". Must be on a domain
//                    verified in Resend or the send is rejected.
//   REPLY_TO_EMAIL — where a customer's reply lands. Distinct on purpose:
//                    orders@ is a send-only Resend identity, so replies need
//                    to route to a real inbox that's actually read (Andrew's
//                    Gmail for now; swap to a domain mailbox later with no
//                    code change). A caller passing its own replyTo (the
//                    contact form, which replies to the customer) overrides
//                    this default.
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.ALERT_EMAIL;
}

export async function sendEmail(opts: {
  to?: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = opts.to ?? process.env.ALERT_EMAIL;
  const from = process.env.EMAIL_FROM ?? "STL Hockey Sticks <onboarding@resend.dev>";
  const replyTo = opts.replyTo ?? process.env.REPLY_TO_EMAIL;
  if (!key || !to) {
    console.warn("sendEmail skipped — RESEND_API_KEY / ALERT_EMAIL not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        html: opts.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail failed", e);
    return false;
  }
}
