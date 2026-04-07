import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Pedigree Platform Privacy Policy. Learn how we collect, use, and protect your personal data and dog pedigree information.",
  alternates: { canonical: "/privacy" },
};
export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
