/* eslint-disable @next/next/no-img-element */

// Real cut-out stick shaft photo, tinted per colorway. PNGs live in
// /public/sticks. Files: carbon, goalie, club, fun, white.
const FILE: Record<string, string> = {
  carbon: "carbon",
  goalie: "goalie",
  club: "club",
  fun: "fun",
  white: "white",
};

/**
 * Displays the cut-out stick shaft photo. `className` sizes the box; the image
 * fills the height, keeps its aspect ratio, and is centered. `rotate` tilts it.
 */
export default function StickPhoto({
  colorway = "carbon",
  className = "",
  rotate = -18,
}: {
  colorway?: keyof typeof FILE;
  className?: string;
  rotate?: number;
}) {
  const file = FILE[colorway] ?? FILE.carbon;
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={`/sticks/${file}.png`}
        alt="STL hockey stick"
        className="h-full w-auto object-contain"
        style={{ transform: `rotate(${rotate}deg)` }}
      />
    </div>
  );
}
