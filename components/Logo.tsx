import Link from "next/link";

const VOLT = "#b8e62e";

type Variant = "dark" | "light";

/**
 * The STL HOCKEY STICKS wordmark: Gateway-Arch glyph, green "STL",
 * "HOCKEY STICKS", and trailing speed bars. 10° speed slant.
 *
 * `variant="dark"`  -> for dark backgrounds (white "HOCKEY STICKS")
 * `variant="light"` -> for light backgrounds (ink "HOCKEY STICKS")
 * `size` scales the whole lockup (px height of the text row).
 */
export function Logo({
  variant = "light",
  size = 24,
  className = "",
}: {
  variant?: Variant;
  size?: number;
  className?: string;
}) {
  const word = variant === "dark" ? "#fafafa" : "#0a0a0b";
  const arch = size * 1.35;

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: size * 0.28 }}
    >
      {/* Gateway Arch glyph */}
      <svg
        viewBox="0 0 48 48"
        width={arch}
        height={arch}
        aria-hidden="true"
        style={{ transform: "skewX(-10deg)", overflow: "visible" }}
      >
        <path
          d="M6 42 C6 18 18 6 24 6 C30 6 42 18 42 42"
          fill="none"
          stroke={VOLT}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="10.5" cy="40" r="3.4" fill={VOLT} />
      </svg>

      {/* Wordmark */}
      <span
        className="font-black italic tracking-tight"
        style={{
          fontSize: size,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: VOLT }}>STL</span>
        <span style={{ color: word, marginLeft: size * 0.18 }}>
          HOCKEY STICKS
        </span>
      </span>

      {/* Trailing speed bars */}
      <svg
        viewBox="0 0 20 32"
        width={size * 0.62}
        height={size}
        aria-hidden="true"
        style={{ transform: "skewX(-10deg)" }}
      >
        <rect x="2" y="4" width="18" height="4.5" rx="2.25" fill={VOLT} />
        <rect x="6" y="14" width="14" height="4.5" rx="2.25" fill={VOLT} />
        <rect x="10" y="24" width="10" height="4.5" rx="2.25" fill={VOLT} />
      </svg>
    </span>
  );
}

/** Logo wrapped in a home link — used in the header. */
export function LogoLink({
  variant = "light",
  size = 22,
  className = "",
}: {
  variant?: Variant;
  size?: number;
  className?: string;
}) {
  return (
    <Link href="/" aria-label="STL Hockey Sticks — home" className={className}>
      <Logo variant={variant} size={size} />
    </Link>
  );
}

export default Logo;
