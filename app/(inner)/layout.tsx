"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    } else {
      setAuthed(true);
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }}
          />
          Loading...
        </div>
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {children}
    </div>
  );
}
