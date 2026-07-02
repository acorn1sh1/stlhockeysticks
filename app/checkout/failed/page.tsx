import Link from "next/link";

export default function FailedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">Payment didn&apos;t go through</h1>
      <p className="mt-3 text-black/60">
        No charge was made. Your cart is still saved — give it another shot.
      </p>
      <Link
        href="/cart"
        className="mt-8 inline-block rounded-full bg-ink px-7 py-3 font-bold text-paper hover:bg-ink/80"
      >
        Back to Cart
      </Link>
    </div>
  );
}
