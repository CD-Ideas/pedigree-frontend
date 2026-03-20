import type { Metadata } from "next";

const OG_IMAGE = "https://pedigreeplatform.com/preview.png";
const SITE = "https://pedigreeplatform.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let dogName = "Dog Pedigree";
  let description = `View the pedigree, offspring, titles, and genetic stats on Pedigree Platform.`;

  try {
    const res = await fetch(`${SITE}/api/dogs/${id}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      dogName = data.registered_name || dogName;
      const offspring = data.offspring_count || data.offspring?.length || 0;
      const pedigree = data.pedigree?.length || 0;
      description = `${dogName} — ${pedigree} ancestors, ${offspring} offspring. View full pedigree, titles, siblings, and genetic stats on Pedigree Platform.`;
    }
  } catch (_e) {}

  const title = `${dogName} | Pedigree Platform`;
  const url = `${SITE}/pedigree/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Pedigree Platform",
      images: [
        {
          url: OG_IMAGE,
          width: 800,
          height: 800,
          alt: `${dogName} - Pedigree Platform`,
          type: "image/png",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default function PedigreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
