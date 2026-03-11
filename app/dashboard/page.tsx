"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const cards = [
    {
      title: "Dogs",
      description: "View registered dogs and add new ones",
      href: "/dashboard/dogs",
    },
    {
      title: "Litters",
      description: "Track breeding records",
      href: "/dashboard/litters",
    },
    {
      title: "Pedigrees",
      description: "View bloodline history",
      href: "/dashboard/pedigrees",
    },
    {
      title: "Media",
      description: "Manage dog photos and files",
      href: "/dashboard/media",
    },
    {
      title: "Settings",
      description: "Manage account and breeder settings",
      href: "/dashboard/settings",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Pedigree Dashboard</h1>
          <p className="text-gray-400">
            Manage dogs, pedigrees, litters, and platform records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="block rounded-2xl border border-gray-800 bg-[#0b0b0b] p-6 hover:border-gray-600 transition"
            >
              <h2 className="text-2xl font-semibold mb-2">{card.title}</h2>
              <p className="text-gray-400">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <button
            onClick={handleLogout}
            className="rounded-xl bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
