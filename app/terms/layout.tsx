import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Pedigree Platform Terms of Service. Account terms, acceptable use, marketplace rules, and user agreements.",
  alternates: { canonical: "/terms" },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
