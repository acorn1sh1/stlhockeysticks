import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stlhockeysticks.com"
  ),
  title: {
    default: "STL Hockey Sticks — Pro Sticks. STL Prices. Local Pickup.",
    template: "%s | STL Hockey Sticks",
  },
  description:
    "Composite hockey sticks and custom club mini sticks at wholesale prices. We bulk-order monthly and you pick up locally in St. Louis — no shipping, no markup.",
  openGraph: {
    title: "STL Hockey Sticks",
    description:
      "Pro-quality sticks at wholesale prices. Local pickup in St. Louis.",
    url: "https://stlhockeysticks.com",
    siteName: "STL Hockey Sticks",
    locale: "en_US",
    type: "website",
  },
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
      <body>{clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner}</body>
    </html>
  );
}
