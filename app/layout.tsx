import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "./NavBar";
import HeartbeatTracker from "./HeartbeatTracker";
import ChatWidget from "./ChatWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1C1C1C",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://pedigreeplatform.com'),
  title: {
    default: "Pedigree Platform — The Largest APBT Pedigree Registry",
    template: "%s | Pedigree Platform",
  },
  description: "Track, manage, and share dog pedigrees with 947,000+ dogs. Browse pedigrees, use the bloodline calculator, marketplace, and community tools. Built for APBT breeders and enthusiasts.",
  keywords: ["pedigree", "APBT", "American Pit Bull Terrier", "dog pedigree", "bloodline", "bloodline calculator", "dog registry", "pedigree tree"],
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
  alternates: {
    canonical: "/",
  },
};

// JSON-LD structured data for SEO (Organization + WebSite with SearchAction)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://pedigreeplatform.com/#organization",
      "name": "Pedigree Platform",
      "url": "https://pedigreeplatform.com",
      "logo": "https://pedigreeplatform.com/logo.png",
      "description": "The largest American Pit Bull Terrier (APBT) pedigree registry with 947,000+ dogs.",
      "sameAs": [],
    },
    {
      "@type": "WebSite",
      "@id": "https://pedigreeplatform.com/#website",
      "url": "https://pedigreeplatform.com",
      "name": "Pedigree Platform",
      "publisher": { "@id": "https://pedigreeplatform.com/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://pedigreeplatform.com/browse?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
        <script src="/notification-chime.js" defer></script>
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        {/* Skip to content link for keyboard/screen reader users */}
        <a href="#main-content" className="skip-to-content">Skip to main content</a>
        <NavBar />
        <HeartbeatTracker />
        <main id="main-content" className="relative z-10" tabIndex={-1}>
          {children}
        </main>
        <ChatWidget />
      </body>
    </html>
  );
}
