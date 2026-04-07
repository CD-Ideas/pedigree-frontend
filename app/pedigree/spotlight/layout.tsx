import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Lineage Spotlight — Find Tightest Bred Dogs",
  description: "Find dogs most tightly bred to legendary foundation dogs like CH Jeep, GR CH Mayday, and more. Ranked by blood percentage.",
  alternates: { canonical: "/pedigree/spotlight" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
