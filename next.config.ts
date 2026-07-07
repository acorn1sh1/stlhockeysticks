import type { NextConfig } from "next";

// Clerk is optional (see middleware.ts / layout.tsx) — when a publishable
// key is set, its script/frame/connect origins need to be allow-listed or
// sign-in breaks. Kept data-driven so enabling Clerk later doesn't also
// require remembering to loosen the CSP.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkOrigins = clerkEnabled
  ? "https://*.clerk.accounts.dev https://*.clerk.com"
  : "";

const csp = [
  `default-src 'self'`,
  // Next.js injects small inline bootstrap scripts; no external script hosts in use.
  `script-src 'self' 'unsafe-inline' ${clerkOrigins}`.trim(),
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${clerkOrigins}`.trim(),
  `frame-src 'self' ${clerkOrigins}`.trim(),
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
