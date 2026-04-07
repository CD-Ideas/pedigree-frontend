import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Breeding Calculator — COI & Bloodline Analysis",
  description: "Calculate coefficient of inbreeding, analyze bloodlines, and plan breedings with our advanced breeding calculator on Pedigree Platform.",
};
export default function BreedingCalcLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
