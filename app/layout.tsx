import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stlhockeysticks.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "STL Hockey Sticks — Pro Sticks. STL Prices. Local Pickup.",
    template: "%s | STL Hockey Sticks",
  },
  description:
    "Composite hockey sticks and custom club mini sticks at wholesale prices. We bulk-order monthly and you pick up locally in St. Louis — no shipping, no markup.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "STL Hockey Sticks",
    description:
      "Pro-quality sticks at wholesale prices. Local pickup in St. Louis.",
    url: SITE_URL,
    siteName: "STL Hockey Sticks",
    locale: "en_US",
    type: "website",
    images: [{ url: "/logo.png", alt: "STL Hockey Sticks" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "STL Hockey Sticks",
    description: "Pro-quality sticks at wholesale prices. Local pickup in St. Louis.",
    images: ["/logo.png"],
  },
};

// Local-business structured data — helps Google's local pack + knowledge panel
// for searches like "hockey sticks St. Louis". Pickup-only, so no street address.
const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "SportingGoodsStore",
  name: "STL Hockey Sticks",
  url: SITE_URL,
  image: `${SITE_URL}/logo.png`,
  description:
    "Composite hockey sticks and custom club mini sticks at wholesale prices, with local pickup in St. Louis.",
  priceRange: "$$",
  areaServed: { "@type": "City", name: "St. Louis", "@id": "https://en.wikipedia.org/wiki/St._Louis" },
  address: { "@type": "PostalAddress", addressLocality: "St. Louis", addressRegion: "MO", addressCountry: "US" },
};

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inner = (
    <CartProvider>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </CartProvider>
  );

  return (
    <html lang="en">
      <body>
        <JsonLd data={localBusinessLd} />
        {clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner}
      </body>
    </html>
  );
}
