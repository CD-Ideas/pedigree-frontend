"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DogRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  useEffect(() => {
    if (id) router.replace(`/pedigree/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex items-center gap-3" style={{ color: "#4A4A4A" }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
        Redirecting...
      </div>
    </div>
  );
}
