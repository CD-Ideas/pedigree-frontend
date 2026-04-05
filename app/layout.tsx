import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./NavBar";
import HeartbeatTracker from "./HeartbeatTracker";
import ChatWidget from "./ChatWidget";

export const metadata: Metadata = {
  metadataBase: new URL('https://pedigreeplatform.com'),
  title: {
    default: "Pedigree Platform — The Largest APBT Pedigree Registry",
    template: "%s | Pedigree Platform",
  },
  description: "Track, manage, and share dog pedigrees with 947,000+ dogs. Browse pedigrees, use the bloodline calculator, marketplace, and community tools. Built for APBT breeders and enthusiasts.",
  keywords: ["pedigree", "APBT", "American Pit Bull Terrier", "dog pedigree", "bloodline", "breeding calculator", "dog registry", "pedigree tree"],
  openGraph: {
    title: "Pedigree Platform — The Largest APBT Pedigree Registry",
    description: "Track, manage, and share dog pedigrees with 947,000+ dogs.",
    url: "https://pedigreeplatform.com",
    siteName: "Pedigree Platform",
    images: [{ url: "/logo.png", width: 384, height: 375 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pedigree Platform — The Largest APBT Pedigree Registry",
    description: "Track, manage, and share dog pedigrees with 947,000+ dogs.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script src="/save-pedigree.js" defer></script>
      </head>
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
