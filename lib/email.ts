// Thin Resend wrapper. Uses the REST API directly (no SDK dependency).
// Configure with RESEND_API_KEY + ALERT_EMAIL (recipient) + optional
// EMAIL_FROM (defaults to onboarding@resend.dev for quick testing).
// If keys aren't set, sendEmail is a no-op so the app still works.
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
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
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
