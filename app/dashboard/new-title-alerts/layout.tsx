import { Metadata } from "next";
export const metadata: Metadata = {
  title: "New Title Alerts — Recently Announced Dogs",
  description: "See recently announced dogs from breeders worldwide on Pedigree Platform.",
  alternates: { canonical: "/dashboard/new-title-alerts" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
