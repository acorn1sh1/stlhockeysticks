import type { Metadata } from "next";
import SizeTierPage from "@/components/SizeTierPage";

export const metadata: Metadata = {
  title: "Goalie Sticks",
  description:
    "Goalie composite sticks — Elite, Performance, and Value builds — at wholesale prices. Custom flex, curve, paddle size, and color. Local St. Louis pickup.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <SizeTierPage tier="goalie" />;
}
