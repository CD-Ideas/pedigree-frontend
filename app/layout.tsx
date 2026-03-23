import type { Metadata } from "next";
import "./globals.css";
import Particles from "./Particles";
import NavBar from "./NavBar";
import HeartbeatTracker from "./HeartbeatTracker";

export const metadata: Metadata = {
  title: "Pedigree Platform",
  description:
    "Track, manage, and share dog pedigrees with the most comprehensive lineage platform. Built for breeders, owners, and enthusiasts.",
  openGraph: {
    title: "Pedigree Platform",
    description:
      "Track, manage, and share dog pedigrees with the most comprehensive lineage platform.",
    images: [{ url: "https://i.imgur.com/cAvQemZ.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="grain vignette antialiased">
        <div className="ambient-bg">
          <Particles />
        </div>
        <NavBar />
        <HeartbeatTracker />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
