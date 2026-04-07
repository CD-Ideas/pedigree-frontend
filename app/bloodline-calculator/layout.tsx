import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Bloodline Calculator — COI & Bloodline Analysis",
  description: "Calculate coefficient of inbreeding, analyze bloodlines, and plan breedings with our advanced bloodline calculator on Pedigree Platform.",
};
export default function BloodlineCalcLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
