import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Image
            src="/logo.png"
            alt="STL Hockey Sticks"
            width={161}
            height={100}
          />
          <p className="mt-3 text-sm text-paper/70">
            Wholesale sticks, monthly batches, local St. Louis pickup. No
            shipping fees. No retail markup.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-bold uppercase tracking-wide text-paper/50">
            Shop
          </div>
          <ul className="space-y-1">
            <li><Link href="/sticks" className="hover:text-volt">Full Sticks</Link></li>
            <li><Link href="/mini-sticks" className="hover:text-volt">Mini Sticks</Link></li>
            <li><Link href="/clubs" className="hover:text-volt">Club Custom Program</Link></li>
            <li><Link href="/how-it-works" className="hover:text-volt">How It Works</Link></li>
            <li><Link href="/warranty" className="hover:text-volt">Warranty Claim</Link></li>
            <li><Link href="/contact" className="hover:text-volt">Contact Us</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-bold uppercase tracking-wide text-paper/50">
            Pickup
          </div>
          <p className="text-paper/70">
            {process.env.NEXT_PUBLIC_PICKUP_ADDRESS ??
              "St. Louis, MO — address sent with pickup confirmation"}
          </p>
        </div>
      </div>
      <div className="border-t border-paper/10 py-4 text-center text-xs text-paper/50">
        © {new Date().getFullYear()} STL Hockey Sticks · stlhockeysticks.com
      </div>
    </footer>
  );
}
