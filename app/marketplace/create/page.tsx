"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ─── Types ─── */
interface DogSearchResult {
  id: number;
  name: string;
  reg_number: string;
}

/* ─── Constants ─── */
const LOGO = "https://i.imgur.com/cAvQemZ.png";

const CATEGORIES = [
  { key: "dogs_for_sale", label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  { key: "stud_service", label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  { key: "litters_for_sale", label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  { key: "supplies_gear", label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  { key: "courier_services", label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  { key: "puppies_wanted", label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#e8c86e" },
];

/* ─── Main Create Ad Page ─── */
export default function CreateAdPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  // Form state
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([""]);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [venmo, setVenmo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [dogId, setDogId] = useState<number | null>(null);
  const [dogSearchQuery, setDogSearchQuery] = useState("");
  const [dogSearchResults, setDogSearchResults] = useState<DogSearchResult[]>([]);
  const [showDogSearch, setShowDogSearch] = useState(false);
  const [selectedDogName, setSelectedDogName] = useState("");

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        setNotLoggedIn(true);
        return;
      }
      const u = JSON.parse(userStr);
      setUser(u);
    } catch {
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

  const addPhotoField = () => {
    if (photos.length < 5) setPhotos([...photos, ""]);
  };

  const removePhotoField = (index: number) => {
    if (photos.length > 1) {
      setPhotos(photos.filter((_, i) => i !== index));
    }
  };

  const updatePhoto = (index: number, value: string) => {
    const updated = [...photos];
    updated[index] = value;
    setPhotos(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!category) errs.category = "Please select a category";
    if (!title.trim()) errs.title = "Title is required";
    else if (title.trim().length < 5) errs.title = "Title must be at least 5 characters";
    else if (title.trim().length > 80) errs.title = "Title must be 80 characters or less";

    if (!description.trim()) errs.description = "Description is required";
    else if (description.trim().length < 10) errs.description = "Description must be at least 10 characters";
    else if (description.trim().length > 200) errs.description = "Description must be 200 characters or less";

    const validPhotos = photos.filter((p) => p.trim());
    if (validPhotos.length === 0) errs.photos = "At least one photo URL is required";

    if (!location.trim()) errs.location = "Location is required";

    if (!phone.trim() && !email.trim() && !venmo.trim() && !paypal.trim()) {
      errs.contact = "At least one contact method is required";
    }

    const dogRequiredCategories = ["dogs_for_sale", "stud_service", "litters_for_sale"];
    if (dogRequiredCategories.includes(category) && !dogId) {
      errs.dog = "Linking to a dog is required for this category";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSubmitting(true);
    setSubmitError("");

    const validPhotos = photos.filter((p) => p.trim());

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          price: price ? parseFloat(price) : null,
          photos: validPhotos,
          location: location.trim(),
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          contact_venmo: venmo.trim() || null,
          contact_paypal: paypal.trim() || null,
          dog_id: dogId,
          user_id: user.id,
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
            href="/login"
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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #0b1120)" }}>
      {/* ─── Nav ─── */}
      <nav
        className="sticky top-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-between"
        style={{
          background: "rgba(11,17,32,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border, rgba(30,64,120,0.3))",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src={LOGO} alt="Logo" className="w-7 h-7 rounded-lg" />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Pedigree Platform
          </span>
        </Link>
        <Link
          href="/marketplace"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
          style={{ color: "var(--text-secondary, #94a3b8)", fontFamily: "var(--font-table)" }}
        >
          {"\u2190"} Back to Marketplace
        </Link>
      </nav>

      <div className="max-w-[700px] mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-[10px] font-medium hover:underline" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
            Home
          </Link>
          <span style={{ color: "#5a6a82", fontSize: "10px" }}>/</span>
          <Link href="/marketplace" className="text-[10px] font-medium hover:underline" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
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
            fontFamily: "var(--font-display, Oswald, sans-serif)",
            background: "linear-gradient(135deg, #e8c86e, #d4a855)",
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
          {/* ─── Category ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.category ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Category <span style={{ color: "#ef4444" }}>*</span>
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
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: category === cat.key ? `${cat.color}18` : "rgba(30,64,120,0.1)",
                    border: category === cat.key ? `1.5px solid ${cat.color}55` : "1.5px solid rgba(30,64,120,0.2)",
                  }}
                >
                  <span className="text-base">{cat.icon}</span>
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

          {/* ─── Title ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.title ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                Title <span style={{ color: "#ef4444" }}>*</span>
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
              placeholder="e.g., Champion Bloodline Male - 2 Years Old"
              maxLength={80}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(30,64,120,0.15)",
                border: "1px solid rgba(30,64,120,0.3)",
                color: "var(--text-primary, #e2e8f0)",
                fontFamily: "var(--font-table)",
              }}
            />
            {errors.title && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* ─── Description ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.description ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                Description <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span
                className="text-[10px]"
                style={{
                  color: description.length > 200 ? "#ef4444" : description.length > 160 ? "#eab308" : "#5a6a82",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {description.length}/200
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="Describe your listing in detail..."
              rows={4}
              maxLength={200}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none"
              style={{
                background: "rgba(30,64,120,0.15)",
                border: "1px solid rgba(30,64,120,0.3)",
                color: "var(--text-primary, #e2e8f0)",
                fontFamily: "var(--font-table)",
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
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Price <span className="text-[9px] normal-case tracking-normal font-normal">(optional)</span>
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
                  background: "rgba(30,64,120,0.15)",
                  border: "1px solid rgba(30,64,120,0.3)",
                  color: "#22c55e",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <p className="text-[9px] mt-1.5" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Leave blank to show &ldquo;Contact for Price&rdquo;
            </p>
          </div>

          {/* ─── Photos ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.photos ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                Photos <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
                {photos.filter((p) => p.trim()).length}/5
              </span>
            </div>
            <div className="space-y-2">
              {photos.map((photo, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={photo}
                    onChange={(e) => {
                      updatePhoto(i, e.target.value);
                      if (errors.photos) setErrors((prev) => ({ ...prev, photos: "" }));
                    }}
                    placeholder={`Photo URL ${i + 1}${i === 0 ? " (required)" : ""}`}
                    className="flex-1 rounded-lg px-4 py-2 text-xs outline-none"
                    style={{
                      background: "rgba(30,64,120,0.15)",
                      border: "1px solid rgba(30,64,120,0.3)",
                      color: "var(--text-primary, #e2e8f0)",
                      fontFamily: "var(--font-table)",
                    }}
                  />
                  {photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhotoField(i)}
                      className="px-2.5 rounded-lg text-xs transition-all hover:scale-105"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      {"\u2715"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {photos.length < 5 && (
              <button
                type="button"
                onClick={addPhotoField}
                className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
                style={{
                  background: "rgba(212,168,85,0.08)",
                  color: "#e8c86e",
                  border: "1px solid rgba(212,168,85,0.2)",
                  fontFamily: "var(--font-table)",
                }}
              >
                + Add Another Photo
              </button>
            )}
            {errors.photos && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.photos}
              </p>
            )}
          </div>

          {/* ─── Location ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.location ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Location <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
              }}
              placeholder="e.g., Houston, TX"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(30,64,120,0.15)",
                border: "1px solid rgba(30,64,120,0.3)",
                color: "var(--text-primary, #e2e8f0)",
                fontFamily: "var(--font-table)",
              }}
            />
            {errors.location && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                {errors.location}
              </p>
            )}
          </div>

          {/* ─── Contact Info ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: errors.contact ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Contact Information <span style={{ color: "#ef4444" }}>*</span>
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
                    background: "rgba(30,64,120,0.15)",
                    border: "1px solid rgba(30,64,120,0.3)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
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
                    background: "rgba(30,64,120,0.15)",
                    border: "1px solid rgba(30,64,120,0.3)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
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
                    background: "rgba(30,64,120,0.15)",
                    border: "1px solid rgba(30,64,120,0.3)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
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
                    background: "rgba(30,64,120,0.15)",
                    border: "1px solid rgba(30,64,120,0.3)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-mono)",
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

          {/* ─── Link to Dog (Optional) ─── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: "1.5px solid rgba(30,64,120,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Link to Dog <span className="text-[9px] normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <p className="text-[10px] mb-3" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Link this ad to a registered pedigree on the platform
            </p>

            {selectedDogName ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(212,168,85,0.08)", border: "1px solid rgba(212,168,85,0.25)" }}
                >
                  <span className="text-xs">{"\uD83D\uDC15"}</span>
                  <span className="text-xs font-bold" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                    {selectedDogName}
                  </span>
                  <span className="text-[9px]" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
                    ID: {dogId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDogId(null);
                    setSelectedDogName("");
                    setDogSearchQuery("");
                  }}
                  className="px-2.5 py-2 rounded-lg text-xs transition-all hover:scale-105"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  {"\u2715"}
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={dogSearchQuery}
                  onChange={(e) => {
                    setDogSearchQuery(e.target.value);
                    setShowDogSearch(true);
                  }}
                  onFocus={() => setShowDogSearch(true)}
                  placeholder="Search for a dog by name..."
                  className="w-full rounded-lg px-4 py-2.5 text-xs outline-none"
                  style={{
                    background: "rgba(30,64,120,0.15)",
                    border: "1px solid rgba(30,64,120,0.3)",
                    color: "var(--text-primary, #e2e8f0)",
                    fontFamily: "var(--font-table)",
                  }}
                />
                {showDogSearch && dogSearchResults.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto"
                    style={{
                      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                      border: "1.5px solid rgba(30,64,120,0.5)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    {dogSearchResults.map((dog) => (
                      <button
                        key={dog.id}
                        type="button"
                        onClick={() => {
                          setDogId(dog.id);
                          setSelectedDogName(dog.name);
                          setShowDogSearch(false);
                          setDogSearchQuery("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-[rgba(212,168,85,0.08)]"
                        style={{ borderBottom: "1px solid rgba(30,64,120,0.2)" }}
                      >
                        <span style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)", fontWeight: 600 }}>
                          {dog.name}
                        </span>
                        <span className="text-[9px] ml-auto" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
                          {dog.reg_number}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
              boxShadow: "0 4px 20px rgba(212,168,85,0.25)",
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
    </div>
  );
}
