const VOLT = "#b8e62e";

type Colorway = {
  shaft: string;
  blade: string;
  accent?: string;
  tape?: string;
};

const COLORWAYS: Record<string, Colorway> = {
  carbon: { shaft: "#1b1b1f", blade: "#0d0d10", accent: VOLT, tape: "#0a0a0b" },
  goalie: { shaft: "#0f3b2f", blade: "#0a2a21", accent: VOLT, tape: "#0a2a21" },
  club: { shaft: "#16305f", blade: "#0f2247", accent: VOLT, tape: "#0f2247" },
  fun: { shaft: "#b5471a", blade: "#7b1f6a", accent: VOLT, tape: "#5c1650" },
  white: { shaft: "#f2f2f2", blade: "#d9d9d9", accent: VOLT, tape: "#c4c4c4" },
};

// Straight thin shaft (stroked line) rising to a clean rounded butt; blade is
// flat along the bottom with a concave heel and a rounded, slightly curled toe
// — matching the one-piece stick. SHAFT_ANGLE matches the shaft slope so the
// printed logo runs true down the shaft.
const BLADE_PATH =
  "M200 192 C170 188 118 186 84 190 Q68 192 68 202 Q68 214 82 214 L214 214 C212 206 208 198 200 192 Z";
const SHAFT = "M200 205 L410 60";
const SHAFT_W = 20;
const SHAFT_ANGLE = -34.6;

/**
 * A realistic full hockey stick — straight shaft, flat-bottomed blade with a
 * rounded toe, taped knob — with the green STL wordmark down the shaft.
 * Scale it with `className` (e.g. "h-40 w-full").
 *
 * `colorway`: carbon (default), goalie, club, fun, white.
 */
export default function StickGraphic({
  colorway = "carbon",
  className = "",
  logo = true,
}: {
  colorway?: keyof typeof COLORWAYS;
  className?: string;
  logo?: boolean;
}) {
  const c = COLORWAYS[colorway] ?? COLORWAYS.carbon;
  const accent = c.accent ?? VOLT;
  const onWhite = colorway === "white";
  const markWord = onWhite ? "#0a0a0b" : "#fafafa";

  return (
    <svg
      viewBox="0 0 460 260"
      className={className}
      role="img"
      aria-label="STL Hockey Sticks composite stick"
    >
      {/* blade — flat bottom, rounded toe */}
      <path d={BLADE_PATH} fill={c.blade} />

      {/* straight shaft */}
      <path
        d={SHAFT}
        fill="none"
        stroke={c.shaft}
        strokeWidth={SHAFT_W}
        strokeLinecap="round"
      />
      {/* sheen down the shaft */}
      <path
        d={SHAFT}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={onWhite ? 0.4 : 0.12}
        transform="translate(-4 -2)"
      />

      {/* thin grip band near the butt (no bulky knob) */}
      <g transform="translate(395 70) rotate(-34.6)">
        <rect x="-3" y="-11" width="6" height="22" rx="2" fill={c.tape} opacity="0.9" />
        <rect x="7" y="-11" width="4" height="22" rx="2" fill={c.tape} opacity="0.9" />
      </g>

      {/* printed logo running down the shaft */}
      {logo && (
        <g transform={`translate(230 182) rotate(${SHAFT_ANGLE})`}>
          <g transform="skewX(-10)">
            <path
              d="M0 6 C0 -4 6 -8 10 -8 C14 -8 20 -4 20 6"
              fill="none"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="2" cy="5" r="2.1" fill={accent} />
            <text
              x="28"
              y="6"
              fontFamily="Arial, Helvetica, sans-serif"
              fontWeight="900"
              fontStyle="italic"
              fontSize="14"
              letterSpacing="-0.5"
            >
              <tspan fill={accent}>STL</tspan>
              <tspan fill={markWord} dx="2">HOCKEY STICKS</tspan>
            </text>
            <g fill={accent}>
              <rect x="152" y="-4" width="16" height="3" rx="1.5" />
              <rect x="156" y="1.5" width="12" height="3" rx="1.5" />
              <rect x="160" y="7" width="8" height="3" rx="1.5" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
