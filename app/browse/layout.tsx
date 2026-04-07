import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Browse Dogs — Search 947,000+ APBT Pedigrees",
  description: "Search and browse over 947,000 American Pit Bull Terrier pedigrees. Find dogs by name, registration number, or owner.",
  alternates: { canonical: "/browse" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
