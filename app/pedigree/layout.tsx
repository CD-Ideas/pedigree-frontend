import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Search Dog Pedigrees — 947,000+ APBT Records",
  description: "Search the world's largest APBT pedigree database. Find any dog by name, registration number, or ancestry.",
  alternates: { canonical: "/pedigree" },
};
export default function PedigreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
