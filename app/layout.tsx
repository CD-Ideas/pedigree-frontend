import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./NavBar";
import HeartbeatTracker from "./HeartbeatTracker";
import ChatWidget from "./ChatWidget";

export const metadata: Metadata = {
  title: "Pedigree Platform",
  description:
    "Track, manage, and share dog pedigrees with the most comprehensive lineage platform. Built for breeders, owners, and enthusiasts.",
  openGraph: {
    title: "Pedigree Platform",
    description:
      "Track, manage, and share dog pedigrees with the most comprehensive lineage platform.",
    images: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NavBar />
        <HeartbeatTracker />
        <main className="relative z-10">
          {children}
        </main>
        <ChatWidget />
      </body>
    </html>
  );
}
