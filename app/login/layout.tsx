import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Pedigree Platform account to access your dogs, pedigrees, and breeding tools.",
  alternates: { canonical: "/login" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
