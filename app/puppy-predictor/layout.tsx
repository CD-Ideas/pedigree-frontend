import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Puppy Color Predictor — Predict Coat Colors",
  description: "Predict possible coat colors for your litter based on parent genetics. Use our puppy color predictor tool on Pedigree Platform.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
