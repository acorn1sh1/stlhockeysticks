import type { Metadata } from "next";
import SizeTierPage from "@/components/SizeTierPage";

export const metadata: Metadata = {
  title: "Intermediate Sticks",
  description:
    "Intermediate composite hockey sticks — Elite, Performance, and Value builds — at wholesale prices. Custom flex, curve, color, and name. Local St. Louis pickup.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <SizeTierPage tier="intermediate" />;
}
