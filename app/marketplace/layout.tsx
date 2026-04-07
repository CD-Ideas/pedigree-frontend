import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Marketplace — Buy & Sell Dogs, Stud Services & Supplies",
  description: "Browse verified listings for dogs, puppies, stud services, and supplies. Connect with breeders worldwide on Pedigree Platform.",
  alternates: { canonical: "/marketplace" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
