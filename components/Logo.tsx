import Link from "next/link";
import { useId } from "react";

/**
 * STL HOCKEY STICKS logo — chrome Gateway Arch bent from a hockey stick
 * (right leg ends in a taped blade), with metallic "STL / HOCKEY STICKS"
 * wordmark. Green glow outline, silver-chrome fills.
 *
 * Recreated as SVG from the brand raster logo so it scales crisply.
 * `variant` kept for API compatibility; the chrome/green design reads on
 * both light and dark backgrounds.
 */

const GREEN = "#5cd821";
const INK = "#17181a";

type Variant = "dark" | "light";

const SHAFT_D =
  "M16 154 C22 96 52 12 86 12 C116 12 122 62 130 106 C133 120 136 128 144 134";
const BLADE_D =
  "M128 106 C134 124 142 132 154 136 L172 139 C180 140 182 143 181 148 C180 153 176 155 169 154 L150 152 C132 149 120 136 116 118 Z";

function ChromeDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#dfe2e6" />
        <stop offset="0.6" stopColor="#a7adb5" />
        <stop offset="0.78" stopColor="#7d838b" />
        <stop offset="1" stopColor="#b9bec5" />
      </linearGradient>
    </defs>
  );
}

/** Arch-stick glyph, drawn into a 0 0 170 170 box. */
function ArchGlyph({ id }: { id: string }) {
  const chrome = `url(#${id}-c)`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {/* shaft */}
      <path d={SHAFT_D} fill="none" stroke={GREEN} strokeWidth="21" />
      <path d={SHAFT_D} fill="none" stroke={INK} strokeWidth="16" />
      <path d={SHAFT_D} fill="none" stroke={chrome} strokeWidth="12" />
      {/* blade */}
      <path d={BLADE_D} fill={GREEN} stroke={GREEN} strokeWidth="8" />
      <path d={BLADE_D} fill={chrome} stroke={INK} strokeWidth="4" />
      {/* blade tape */}
      <g stroke={INK} strokeWidth="2.2" opacity="0.85">
        <line x1="158" y1="136" x2="155" y2="152" />
        <line x1="164" y1="137" x2="161" y2="153" />
        <line x1="170" y1="138" x2="167" y2="154" />
      </g>
    </g>
  );
}

/** Layered chrome wordmark text: green outer ring, ink edge, chrome fill. */
function ChromeText({
  id,
  x,
  y,
  fontSize,
  children,
  textLength,
  anchor,
}: {
  id: string;
  x: number;
  y: number;
  fontSize: number;
  children: string;
  textLength?: number;
  anchor?: "middle";
}) {
  const common = {
    x,
    y,
    fontSize,
    textAnchor: anchor,
    textLength,
    lengthAdjust: textLength ? ("spacingAndGlyphs" as const) : undefined,
  };
  return (
    <>
      <text
        {...common}
        fill={INK}
        stroke={GREEN}
        strokeWidth={11}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {children}
      </text>
      <text
        {...common}
        fill={`url(#${id}-c)`}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {children}
      </text>
    </>
  );
}

export function Logo({
  variant = "light",
  size = 24,
  className = "",
}: {
  variant?: Variant;
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/[:]/g, "");
  void variant; // one design works on light + dark backgrounds
  return (
    <svg
      viewBox="0 0 700 170"
      height={size * 1.6}
      width={(size * 1.6 * 700) / 170}
      role="img"
      aria-label="STL Hockey Sticks"
      className={className}
    >
      <ChromeDefs id={id} />
      <ArchGlyph id={id} />
      <g
        transform="skewX(-8)"
        fontFamily='"Arial Black","Archivo Black",Arial,sans-serif'
        fontWeight={900}
        fontStyle="italic"
      >
        <ChromeText id={id} x={210} y={84} fontSize={80}>
          STL
        </ChromeText>
        <ChromeText id={id} x={210} y={156} fontSize={57} textLength={486}>
          HOCKEY STICKS
        </ChromeText>
      </g>
    </svg>
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
