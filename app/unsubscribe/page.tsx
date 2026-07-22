import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Unsubscribe — STL Hockey Sticks" };

// One-click marketing unsubscribe. The link in every marketing email carries a
// per-contact token; visiting it flips the contact to unsubscribed. Order and
// pickup (transactional) emails are unaffected.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let state: "ok" | "already" | "invalid" | "error" = "invalid";

  if (token) {
    try {
      const contact = await prisma.emailContact.findUnique({ where: { unsubToken: token } });
      if (!contact) state = "invalid";
      else if (contact.unsubscribed) state = "already";
      else {
        await prisma.emailContact.update({
          where: { id: contact.id },
          data: { unsubscribed: true },
        });
        state = "ok";
      }
    } catch {
      state = "error";
    }
  }

  const heading =
    state === "ok" || state === "already"
      ? "You're unsubscribed"
      : state === "error"
        ? "Something went wrong"
        : "Link not recognized";
  const body =
    state === "ok"
      ? "You won't receive any more marketing emails from us. You'll still get order and pickup updates for anything you buy."
      : state === "already"
        ? "This email was already unsubscribed from marketing. You'll still get order and pickup updates."
        : state === "error"
          ? "We couldn't process that just now. Please try the link again in a minute."
          : "This unsubscribe link is missing or invalid. If you keep getting emails, reply to one and we'll remove you.";

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-3xl font-black">{heading}</h1>
      <p className="mt-4 text-black/60">{body}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-ink px-6 py-3 font-bold text-paper hover:bg-ink/80"
      >
        Back to STL Hockey Sticks
      </Link>
    </div>
  );
}
