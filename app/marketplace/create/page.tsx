"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

/* ─── Types ─── */
interface DogSearchResult {
  dog_id: number;
  registered_name: string;
  photo_url: string | null;
  sex: string | null;
}

/* ─── Constants ─── */
const LOGO = "https://i.imgur.com/cAvQemZ.png";

const GLASS_BOX = {
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--text-primary, #e2e8f0)",
  fontFamily: "var(--font-table)",
  transition: "all 0.2s ease",
};

const CATEGORIES = [
  { key: "dogs_for_sale", label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  { key: "stud_service", label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  { key: "litters_for_sale", label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  { key: "supplies_gear", label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  { key: "courier_services", label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  { key: "puppies_wanted", label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#e8c86e" },
];

const COUNTRY_MAP: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Cuba", "Dominica", "Dominican Republic", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica", "El Salvador", "Costa Rica", "Nicaragua", "Panama", "Puerto Rico", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Uruguay", "Paraguay", "Bolivia"],
  "Europe": ["United Kingdom", "Ireland", "Spain", "Portugal", "France", "Germany", "Italy", "Netherlands", "Belgium", "Sweden", "Denmark", "Norway", "Finland", "Poland", "Romania", "Hungary", "Czech Republic", "Greece", "Croatia", "Serbia", "Bulgaria", "Albania", "Russia", "Ukraine", "Turkey"],
  "Asia": ["Philippines", "Japan", "South Korea", "China", "Thailand", "Indonesia", "Vietnam", "India", "Pakistan", "Iran", "Iraq", "Israel", "Saudi Arabia", "UAE", "Malaysia", "Singapore", "Taiwan"],
  "Africa": ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana", "Tanzania", "Ethiopia", "Cameroon", "Algeria"],
  "Oceania": ["Australia", "New Zealand", "Fiji", "Papua New Guinea"],
};

/* ─── Main Create Ad Page ─── */
export default function CreateAdPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg-primary, #080d18)" }} />}>
      <CreateAdContent />
    </Suspense>
  );
}

function CreateAdContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams.get("category") || "";
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  // Form state
  const [category, setCategory] = useState(preselectedCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [venmo, setVenmo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [dogId, setDogId] = useState<number | null>(null);
  const [dogSearchQuery, setDogSearchQuery] = useState("");
  const [dogSearchResults, setDogSearchResults] = useState<DogSearchResult[]>([]);
  const [showDogSearch, setShowDogSearch] = useState(false);
  const [selectedDogName, setSelectedDogName] = useState("");

  // Photo upload state
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if ((!userStr || userStr === "null") && !token) {
        setNotLoggedIn(true);
        return;
      }
      const u = userStr && userStr !== "null" ? JSON.parse(userStr) : null;
      if (u && u.id) {
        setUser(u);
      } else if (token) {
        // User has token but no user object — try to get user info
        fetch("/api/account/me", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            if (data && data.id) {
              setUser({ id: data.id, username: data.username || data.name || "User" });
              localStorage.setItem("user", JSON.stringify(data));
            } else {
              setNotLoggedIn(true);
            }
          })
          .catch(() => setNotLoggedIn(true));
      } else {
        setNotLoggedIn(true);
      }
    } catch (_e) {
      setNotLoggedIn(true);
    }
  }, []);

  // Dog search
  useEffect(() => {
    if (!dogSearchQuery.trim() || dogSearchQuery.length < 2) {
      setDogSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(dogSearchQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setDogSearchResults(data.slice(0, 10));
          else if (data.dogs) setDogSearchResults(data.dogs.slice(0, 10));
        })
        .catch(() => setDogSearchResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [dogSearchQuery]);

  // Photo upload handler
  const uploadPhoto = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photos: "File too large (max 5MB)" }));
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photos: "Invalid file type. Use JPG, PNG, or WebP." }));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/marketplace/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotos((prev) => [...prev, data.path]);
      setErrors((prev) => ({ ...prev, photos: "" }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setErrors((prev) => ({ ...prev, photos: message }));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) {
      setErrors((prev) => ({ ...prev, photos: "Maximum 5 photos allowed" }));
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    toUpload.forEach((f) => uploadPhoto(f));
  }, [photos.length, uploadPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!category) errs.category = "Please select a category";
    if (!title.trim()) errs.title = "Heading is required";
    else if (title.trim().length < 5) errs.title = "Heading must be at least 5 characters";
    else if (title.trim().length > 80) errs.title = "Heading must be 80 characters or less";

    if (!description.trim()) errs.description = "Description is required";
    else if (description.trim().length < 10) errs.description = "Description must be at least 10 characters";
    else if (description.trim().length > 500) errs.description = "Description must be 500 characters or less";

    if (photos.length === 0) errs.photos = "At least one photo is required";

    if (!continent && !country) errs.location = "At least a continent or country is required";

    if (!phone.trim() && !email.trim() && !venmo.trim() && !paypal.trim()) {
      errs.contact = "At least one contact method is required";
    }

    const dogRequiredCategories = ["dogs_for_sale", "stud_service", "litters_for_sale"];
    if (dogRequiredCategories.includes(category) && !dogId) {
      errs.dog = "Linking to a dog is required for this category";
    }

    // Heading must match linked dog name
    if (dogId && selectedDogName && title.trim().toUpperCase() !== selectedDogName.toUpperCase()) {
      errs.title = `Heading must match the linked dog's name: "${selectedDogName}"`;
      errs.dog = `Linked dog name "${selectedDogName}" does not match the heading "${title.trim()}"`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          price: price ? parseFloat(price) : null,
          photos,
          location: [country, continent].filter(Boolean).join(", "),
          contactPhone: phone.trim() || null,
          contactEmail: email.trim() || null,
          contactVenmo: venmo.trim() || null,
          contactPaypal: paypal.trim() || null,
          dogId,
          userId: user.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create ad");
      }

      const data = await res.json();
      router.push(`/marketplace/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  // Not logged in state
  if (notLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "var(--bg-deep, #0b1120)" }}>
        <div className="text-5xl opacity-30">{"\uD83D\uDD12"}</div>
        <h2
          className="text-xl font-black uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-display, Oswald, sans-serif)",
            background: "linear-gradient(135deg, #e8c86e, #d4a855)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Please Log In
        </h2>
        <p className="text-sm" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
          You need to be logged in to create a marketplace ad.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login?redirect=/marketplace/create"
            className="px-6 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/marketplace"
            className="px-6 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
              color: "#000",
              fontFamily: "var(--font-table)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const dropzoneStyle: React.CSSProperties = {
    border: dragOver ? "2px dashed rgba(212,168,85,0.7)" : "2px dashed rgba(212,168,85,0.3)",
    background: dragOver ? "rgba(212,168,85,0.06)" : "rgba(30,64,120,0.08)",
    borderRadius: "12px",
    padding: "28px 16px",
    textAlign: "center",
    cursor: photos.length >= 5 ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    ...(dragOver ? { boxShadow: "0 0 20px rgba(212,168,85,0.15)" } : {}),
  };

  const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--text-primary, #e2e8f0)",
    fontFamily: "var(--font-table)",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235a6a82' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "12px",
    transition: "all 0.2s ease",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #0b1120)" }}>
      <div className="max-w-[700px] mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <Link href="/marketplace" className="text-[10px] font-medium hover:underline" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
            Marketplace
          </Link>
          <span style={{ color: "#5a6a82", fontSize: "10px" }}>/</span>
          <span className="text-[10px] font-medium" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
            Create Ad
          </span>
        </div>

        {/* Header */}
        <h1
          className="text-2xl font-black uppercase tracking-widest mb-1"
          style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, #d4a855, #f5d994, #d4a855)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Create Ad
        </h1>
        <p className="text-xs mb-6" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
          Fill in the details below to post your marketplace listing
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ─── Listed By ─── */}
          <div
            className="rounded-2xl p-5"
            style={{ ...GLASS_BOX }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              👤 Listed By
            </label>
            <div
              className="flex items-center gap-3 rounded-lg px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, #e8c86e, #b8860b)",
                  color: "#000",
                  fontFamily: "var(--font-table)",
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}
              >
                {user?.username || "Loading..."}
              </span>
            </div>
          </div>

          {/* ─── Category ─── */}
          {preselectedCategory ? (
            /* Category was preselected from marketplace page — show compact label */
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                ...GLASS_BOX,
                border: `1.5px solid ${CATEGORIES.find(c => c.key === category)?.color || "rgba(255,255,255,0.06)"}55`,
              }}
            >
              <span className="text-lg">{CATEGORIES.find(c => c.key === category)?.icon}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                  📂 Category
                </span>
                <span className="text-sm font-bold" style={{ color: CATEGORIES.find(c => c.key === category)?.color, fontFamily: "var(--font-table)" }}>
                  {CATEGORIES.find(c => c.key === category)?.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  router.replace("/marketplace/create");
                }}
                className="ml-auto text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 hover:scale-105 hover:brightness-125"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#5a6a82", fontFamily: "var(--font-table)" }}
              >
                Change
              </button>
            </div>
          ) : (
            /* No preselected category — show full picker */
            <div
              className="rounded-2xl p-5"
              style={{
                ...GLASS_BOX,
                border: errors.category ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
              }}
            >
              <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                📂 Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setCategory(cat.key);
                      setErrors((prev) => ({ ...prev, category: "" }));
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: category === cat.key ? `${cat.color}18` : "rgba(255,255,255,0.03)",
                      border: category === cat.key ? `1.5px solid ${cat.color}55` : "1.5px solid rgba(255,255,255,0.06)",
                      boxShadow: category === cat.key ? `0 0 12px ${cat.color}20` : "none",
                    }}
                    onMouseEnter={(e) => { if (category !== cat.key) (e.currentTarget.style.boxShadow = `0 0 16px ${cat.color}15`); }}
                    onMouseLeave={(e) => { if (category !== cat.key) (e.currentTarget.style.boxShadow = "none"); }}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        color: category === cat.key ? cat.color : "#94a3b8",
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="text-[10px] mt-2 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                  {errors.category}
                </p>
              )}
            </div>
          )}

          {/* ─── Link to Dog ─── */}
          <div
            className="rounded-2xl p-5 relative"
            style={{
              ...GLASS_BOX,
              border: errors.dog ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
              overflow: "visible",
              zIndex: 10,
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              🐕 Link to Dog {["dogs_for_sale", "stud_service", "litters_for_sale"].includes(category)
                ? <span className="text-[9px] normal-case tracking-normal font-normal" style={{ color: "#ef4444" }}>(required)</span>
                : <span className="text-[9px] normal-case tracking-normal font-normal">(optional)</span>}
            </label>
            <p className="text-[10px] mb-3" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Link this ad to a registered pedigree on the platform — the heading will be auto-filled
            </p>
            {errors.dog && (
              <p className="text-[10px] mb-2" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.dog}
              </p>
            )}

            {selectedDogName ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(212,168,85,0.08)", border: "1px solid rgba(212,168,85,0.25)" }}
                >
                  <span className="text-xs">{"\uD83D\uDC15"}</span>
                  <span className="text-xs font-bold" style={{ color: getDogColor(selectedDogName), fontFamily: "var(--font-table)" }}>
                    {selectedDogName}
                  </span>
                  <span className="text-[9px]" style={{ color: "#e8c86e", fontFamily: "var(--font-mono)" }}>
                    ID: {dogId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDogId(null);
                    setSelectedDogName("");
                    setDogSearchQuery("");
                    setTitle("");
                    setPhotos([]);
                  }}
                  className="px-2.5 py-2 rounded-lg text-xs transition-all hover:scale-105"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  {"\u2715"}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#e8c86e" }}>🔍</span>
                  <input
                    type="text"
                    value={dogSearchQuery}
                    onChange={(e) => {
                      setDogSearchQuery(e.target.value);
                      setShowDogSearch(true);
                    }}
                    onFocus={() => setShowDogSearch(true)}
                    placeholder="Search for a dog by name..."
                    className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none"
                    style={{
                      ...INPUT_STYLE,
                    }}
                  />
                </div>
                {showDogSearch && dogSearchResults.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 max-h-48 overflow-y-auto"
                    style={{
                      ...GLASS_BOX,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    {dogSearchResults.map((dog) => (
                      <button
                        key={dog.dog_id}
                        type="button"
                        onClick={() => {
                          setDogId(dog.dog_id);
                          setSelectedDogName(dog.registered_name);
                          setTitle(dog.registered_name);
                          setShowDogSearch(false);
                          setDogSearchQuery("");
                          setErrors((prev) => ({ ...prev, title: "", dog: "" }));
                          // Auto-fill photo from database
                          if (dog.photo_url) {
                            const photoUrl = dog.photo_url.startsWith("http")
                              ? dog.photo_url
                              : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`;
                            setPhotos([photoUrl]);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-[rgba(212,168,85,0.08)]"
                        style={{ borderBottom: "1px solid rgba(30,64,120,0.2)" }}
                      >
                        {dog.photo_url && (
                          <img src={dog.photo_url.startsWith("http") ? dog.photo_url : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`}
                            alt="" className="w-6 h-6 rounded-full object-cover" />
                        )}
                        <span style={{ color: getDogColor(dog.registered_name), fontFamily: "var(--font-table)", fontWeight: 600 }}>
                          {dog.registered_name}
                        </span>
                        <span className="text-[9px] ml-auto" style={{ color: "#e8c86e", fontFamily: "var(--font-mono)" }}>
                          ID: {dog.dog_id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Heading ─── */}
          <div
            className="rounded-2xl p-5"
            style={{
              ...GLASS_BOX,
              border: errors.title ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                ✏️ Heading <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span
                className="text-[10px]"
                style={{
                  color: title.length > 80 ? "#ef4444" : title.length > 60 ? "#eab308" : "#5a6a82",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {title.length}/80
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder={selectedDogName ? selectedDogName : "e.g., Champion Bloodline Male - 2 Years Old"}
              maxLength={80}
              readOnly={!!selectedDogName}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none font-bold"
              style={{
                background: selectedDogName ? "rgba(212,168,85,0.08)" : "rgba(255,255,255,0.04)",
                border: selectedDogName ? "1px solid rgba(212,168,85,0.25)" : "1px solid rgba(255,255,255,0.08)",
                color: selectedDogName ? getDogColor(selectedDogName) : "var(--text-primary, #e2e8f0)",
                fontFamily: "var(--font-table)",
                cursor: selectedDogName ? "not-allowed" : "text",
                transition: "all 0.2s ease",
              }}
            />
            {selectedDogName && (
              <p className="text-[10px] mt-1.5" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                Auto-filled from linked dog
              </p>
            )}
            {errors.title && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* ─── Description ─── */}
          <div
            className="rounded-2xl p-5"
            style={{
              ...GLASS_BOX,
              border: errors.description ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                📝 Description <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span
                className="text-[10px]"
                style={{
                  color: description.length > 500 ? "#ef4444" : description.length > 400 ? "#eab308" : "#5a6a82",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {description.length}/500
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="Describe your listing in detail..."
              rows={5}
              maxLength={500}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none"
              style={{
                ...INPUT_STYLE,
              }}
            />
            {errors.description && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.description}
              </p>
            )}
          </div>

          {/* ─── Price ─── */}
          <div
            className="rounded-2xl p-5"
            style={{ ...GLASS_BOX }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              💰 Price <span className="text-[9px] normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: "#22c55e", fontFamily: "var(--font-mono)" }}
              >
                $
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#22c55e",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
            <p className="text-[9px] mt-1.5" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Leave blank to show &ldquo;Contact for Price&rdquo;
            </p>
          </div>

          {/* ─── Photos ─── */}
          <div
            className="rounded-2xl p-5"
            style={{
              ...GLASS_BOX,
              border: errors.photos ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                📸 Photos <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
                {photos.length}/5
              </span>
            </div>

            {/* Thumbnail previews — all photos (auto + manual) */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((photo, i) => {
                  const isAutoPhoto = selectedDogName && i === 0 && (photo.includes("online-pedigrees.com") || photo.includes("apbt"));
                  return (
                    <div
                      key={i}
                      className="relative group"
                      style={{ width: 80, height: 80 }}
                    >
                      <img
                        src={photo}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                        style={{ border: isAutoPhoto ? "1.5px solid rgba(212,168,85,0.3)" : "1.5px solid rgba(30,64,120,0.3)" }}
                      />
                      {isAutoPhoto && (
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-b-lg px-1 py-0.5 text-center"
                          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                        >
                          <span className="text-[8px] font-bold" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                            Auto
                          </span>
                        </div>
                      )}
                      {/* Show remove button for manual photos only */}
                      {!isAutoPhoto && (
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                          style={{
                            background: "rgba(239,68,68,0.9)",
                            color: "#fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                          }}
                        >
                          {"\u2715"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Auto-loaded note */}
            {selectedDogName && photos.length > 0 && (photos[0].includes("online-pedigrees.com") || photos[0].includes("apbt")) && (
              <p className="text-[10px] mb-3" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                First photo auto-loaded from database — you can add up to {5 - photos.length} more below
              </p>
            )}

            {/* Drag and drop zone — always show if under 5 photos */}
            {photos.length < 5 && (
              <div
                style={dropzoneStyle}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "rgba(212,168,85,0.5)", borderTopColor: "transparent" }}
                    />
                    <span className="text-xs" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                      Uploading...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl opacity-50">{"\uD83D\uDCF7"}</span>
                    <span className="text-xs font-medium" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                      {selectedDogName ? "Add more photos" : "Drag photos here or click to browse"}
                    </span>
                    <span className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                      JPG, PNG, WebP — Max 5MB each — Up to {5 - photos.length} more
                    </span>
                  </div>
                )}
              </div>
            )}

            {errors.photos && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.photos}
              </p>
            )}
          </div>

          {/* ─── Location ─── */}
          <div
            className="rounded-2xl p-5"
            style={{
              ...GLASS_BOX,
              border: errors.location ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              📍 Location <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Continent */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                  Continent
                </label>
                <select
                  value={continent}
                  onChange={(e) => {
                    setContinent(e.target.value);
                    setCountry("");
                    if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
                  }}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer"
                  style={selectStyle}
                >
                  <option value="">Select continent...</option>
                  {Object.keys(COUNTRY_MAP).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Country */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
                  }}
                  disabled={!continent}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={selectStyle}
                >
                  <option value="">{continent ? "Select country..." : "Select continent first"}</option>
                  {continent && COUNTRY_MAP[continent]?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {errors.location && (
              <p className="text-[10px] mt-2 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.location}
              </p>
            )}
          </div>

          {/* ─── Contact Info ─── */}
          <div
            className="rounded-2xl p-5"
            style={{
              ...GLASS_BOX,
              border: errors.contact ? "1.5px solid rgba(239,68,68,0.5)" : GLASS_BOX.border,
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              📞 Contact Information <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <p className="text-[10px] mb-3" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Provide at least one contact method
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <span className="text-sm">{"\uD83D\uDCDE"}</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.contact) setErrors((prev) => ({ ...prev, contact: "" }));
                  }}
                  placeholder="Phone number"
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.1)" }}>
                  <span className="text-sm">{"\u2709\uFE0F"}</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.contact) setErrors((prev) => ({ ...prev, contact: "" }));
                  }}
                  placeholder="Email address"
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>V</span>
                </div>
                <input
                  type="text"
                  value={venmo}
                  onChange={(e) => {
                    setVenmo(e.target.value);
                    if (errors.contact) setErrors((prev) => ({ ...prev, contact: "" }));
                  }}
                  placeholder="Venmo username"
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.1)" }}>
                  <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>P</span>
                </div>
                <input
                  type="text"
                  value={paypal}
                  onChange={(e) => {
                    setPaypal(e.target.value);
                    if (errors.contact) setErrors((prev) => ({ ...prev, contact: "" }));
                  }}
                  placeholder="PayPal email or username"
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
            </div>
            {errors.contact && (
              <p className="text-[10px] mt-2 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.contact}
              </p>
            )}
          </div>

          {/* ─── Submit Error ─── */}
          {submitError && (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)" }}
            >
              <p className="text-xs font-bold" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {submitError}
              </p>
            </div>
          )}

          {/* ─── Submit Button ─── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: "linear-gradient(135deg, #d4a855, #f5d994, #d4a855)",
              color: "#000",
              fontFamily: "var(--font-table)",
              boxShadow: "0 4px 24px rgba(212,168,85,0.35), 0 0 48px rgba(212,168,85,0.15)",
              letterSpacing: "0.08em",
            }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#000", borderTopColor: "transparent" }}
                />
                Posting...
              </span>
            ) : (
              "Post Ad"
            )}
          </button>
        </form>
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-6 mt-4" style={{ borderTop: "1px solid var(--border, rgba(30,64,120,0.3))" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO} alt="Logo" className="w-5 h-5 rounded" />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "12px",
              background: "linear-gradient(135deg, #e8c86e, #d4a855)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Pedigree Platform
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Home</Link>
          <Link href="/marketplace" className="text-[10px] hover:underline" style={{ color: "#e8c86e" }}>Marketplace</Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Terms</Link>
        </div>
      </footer>

      {/* ─── Focus styles for selects ─── */}
      <style jsx global>{`
        .rounded-lg select:focus,
        .rounded-lg input:focus,
        .rounded-lg textarea:focus {
          border-color: rgba(212,168,85,0.4) !important;
          box-shadow: 0 0 0 2px rgba(212,168,85,0.12), 0 0 12px rgba(212,168,85,0.08);
        }
        select {
          color-scheme: dark !important;
          background-color: #1e1e1e !important;
          color: #e2e8f0 !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        select option {
          background-color: #1e1e1e !important;
          color: #e2e8f0 !important;
          border: none !important;
          padding: 6px 8px;
        }
        select option:hover,
        select option:checked {
          background-color: #333 !important;
          color: #e8c86e !important;
        }
      `}</style>
    </div>
  );
}
