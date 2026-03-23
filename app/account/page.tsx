"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const steelFrame = {
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const inputStyle = {
  background: "var(--bg-deep, #0b1120)",
  border: "1px solid rgba(30,64,120,0.5)",
  color: "var(--text-primary, #e2e8f0)",
  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
};

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserData | null>(null);

  // Profile edit
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Messages
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const showMsg = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) {
        setUser(u);
        setEditUsername(u.username || "");
        setEditEmail(u.email || "");
        setAvatarPreview(u.profile_picture || "");
      } else router.push("/login");
    } catch (_e) { router.push("/login"); }
  }, [router]);

  // Save profile (username/email)
  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editUsername.trim() || editUsername.trim().length < 2) {
      showMsg("Username must be at least 2 characters", "error");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, username: editUsername.trim(), email: editEmail.trim() }),
      });
      const data = await res.json();
      if (data.error) { showMsg(data.error, "error"); return; }
      const updated = { ...user, username: data.username, email: data.email };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      showMsg("Profile updated successfully", "success");
    } catch (_e) {
      showMsg("Failed to update profile", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword) { showMsg("Enter your current password", "error"); return; }
    if (newPassword.length < 6) { showMsg("New password must be at least 6 characters", "error"); return; }
    if (newPassword !== confirmPassword) { showMsg("Passwords do not match", "error"); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.error) { showMsg(data.error, "error"); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showMsg("Password changed successfully", "success");
    } catch (_e) {
      showMsg("Failed to change password", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  // Upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { showMsg("File too large (max 5MB)", "error"); return; }

    // Preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", String(user.id));
      fd.append("avatar", file);
      const res = await fetch("/api/account/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { showMsg(data.error, "error"); return; }
      const updated = { ...user, profile_picture: data.profile_picture };
      setUser(updated);
      setAvatarPreview(data.profile_picture);
      localStorage.setItem("user", JSON.stringify(updated));
      showMsg("Profile picture updated", "success");
    } catch (_e) {
      showMsg("Failed to upload picture", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Deactivate
  const handleDeactivate = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    showMsg("Account deactivated. You have been logged out.", "success");
    setTimeout(() => router.push("/"), 2000);
  };

  // Delete
  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE" || !user) return;
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        showMsg("Account permanently deleted.", "success");
        setTimeout(() => router.push("/"), 2000);
      } else {
        showMsg(data.message || "Failed to delete account", "error");
      }
    } catch (_e) {
      showMsg("Server error", "error");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "var(--accent-gold)" }}>
          Account Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
          Manage your profile, password, and account
        </p>
      </div>

      {/* Message toast */}
      {message && (
        <div className="rounded-lg px-4 py-3 text-sm transition-all" style={{
          background: messageType === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${messageType === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: messageType === "success" ? "#22c55e" : "#ef4444",
          fontFamily: "var(--font-table)",
        }}>
          {message}
        </div>
      )}

      {/* ─── Profile Picture ─── */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Profile Picture
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {avatarPreview?.startsWith("emoji:") ? (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: "linear-gradient(135deg, #1a2744, #0e1828)",
                  border: "3px solid var(--accent-gold)",
                }}
              >
                {avatarPreview.replace("emoji:", "")}
              </div>
            ) : avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: "3px solid var(--accent-gold)" }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), #b8860b)",
                  color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  border: "3px solid var(--accent-gold)",
                }}
              >
                {(user.username || "U")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <span className="text-white text-xs font-bold" style={{ fontFamily: "var(--font-table)" }}>
                {avatarUploading ? "..." : "Change"}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
              {user.username}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
              Click on the picture to upload a new one
            </p>
            <p className="text-[10px] mt-1" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Edit Profile ─── */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Username
            </label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Email
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(30,64,120,0.3)" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>Role</span>
                <span className="text-xs font-bold uppercase" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>{user.role}</span>
              </div>
              <span className="text-[10px]" style={{ color: "#5a6a82" }}>|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>Active</span>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving || (editUsername === user.username && editEmail === (user.email || ""))}
              className="px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #d4a855, #b8860b)",
                color: "#000",
                fontFamily: "var(--font-table)",
              }}
            >
              {profileSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Change Password ─── */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none pr-10"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "#5a6a82" }}
              >
                {showCurrentPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none pr-10"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "#5a6a82" }}
              >
                {showNewPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] mt-1" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                Passwords do not match
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2" style={{ borderTop: "1px solid rgba(30,64,120,0.3)" }}>
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #d4a855, #b8860b)",
                color: "#000",
                fontFamily: "var(--font-table)",
              }}
            >
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Subscription / Plan ─── */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Subscription & Plan
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 rounded-lg px-4" style={{
            background: "linear-gradient(135deg, rgba(212,168,85,0.08), rgba(184,134,11,0.04))",
            border: "1px solid rgba(212,168,85,0.2)",
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                ★
              </div>
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  <span style={{ color: "var(--accent-gold)" }}>FREE PLAN</span>
                  <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>/ 3 MONTHS</span>
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  Basic access to all features
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "var(--font-table)" }}>
              Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Pedigrees Created", value: "Unlimited", icon: "📋" },
              { label: "Color Predictions", value: "Unlimited", icon: "🎨" },
              { label: "Bloodline Calculator", value: "Unlimited", icon: "🧬" },
              { label: "Community Access", value: "Full", icon: "🌍" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 py-2 px-3 rounded-lg"
                style={{ background: "rgba(30,64,120,0.1)", border: "1px solid rgba(30,64,120,0.2)" }}>
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>{item.label}</p>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center" style={{ borderTop: "1px solid rgba(30,64,120,0.3)" }}>
            <p className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
              Premium plans coming soon with advanced features
            </p>
          </div>
        </div>
      </div>

      {/* ─── Preferences ─── */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Preferences
        </h2>
        <div className="space-y-4">
          {/* Default Generation View */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Default Pedigree Generations</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                How many generations to show by default
              </p>
            </div>
            <select
              defaultValue="4"
              onChange={(e) => {
                localStorage.setItem("pref_default_gens", e.target.value);
                showMsg("Default generations updated", "success");
              }}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={inputStyle}
            >
              <option value="3">3 Generations</option>
              <option value="4">4 Generations</option>
              <option value="5">5 Generations</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Theme</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Choose your display theme
              </p>
            </div>
            <div className="flex gap-2">
              {[
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "light", label: "Light", icon: "☀️", disabled: true },
              ].map((t) => (
                <button
                  key={t.value}
                  disabled={t.disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: t.value === "dark" ? "rgba(212,168,85,0.1)" : "rgba(30,64,120,0.1)",
                    border: t.value === "dark" ? "1px solid rgba(212,168,85,0.3)" : "1px solid rgba(30,64,120,0.2)",
                    color: t.value === "dark" ? "var(--accent-gold)" : "#5a6a82",
                    fontFamily: "var(--font-table)",
                    opacity: t.disabled ? 0.4 : 1,
                    cursor: t.disabled ? "not-allowed" : "pointer",
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                  {t.disabled && <span className="text-[8px] ml-1">(Soon)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Email Notifications</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Receive updates about your pedigrees and community activity
              </p>
            </div>
            <button
              onClick={(e) => {
                const btn = e.currentTarget;
                const isOn = btn.dataset.on === "true";
                btn.dataset.on = isOn ? "false" : "true";
                btn.style.background = isOn ? "rgba(30,64,120,0.2)" : "rgba(34,197,94,0.3)";
                btn.querySelector("span")!.style.transform = isOn ? "translateX(0)" : "translateX(20px)";
                btn.querySelector("span")!.style.background = isOn ? "#5a6a82" : "#22c55e";
                localStorage.setItem("pref_email_notifs", isOn ? "off" : "on");
                showMsg(`Email notifications ${isOn ? "disabled" : "enabled"}`, "success");
              }}
              data-on="false"
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: "rgba(30,64,120,0.2)", border: "1px solid rgba(30,64,120,0.3)" }}
            >
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all" style={{ background: "#5a6a82" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Danger Zone ─── */}
      <div className="rounded-xl p-6" style={{ ...steelFrame, border: "1.5px solid rgba(239,68,68,0.3)" }}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
          Danger Zone
        </h2>

        <div className="space-y-4">
          {/* Deactivate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Deactivate Account</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Temporarily disable your account. You can reactivate by logging in again.
              </p>
            </div>
            <button onClick={handleDeactivate}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
              style={{
                color: "#f97316", background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)", fontFamily: "var(--font-table)",
              }}>
              Deactivate
            </button>
          </div>

          <div style={{ borderTop: "1px solid rgba(239,68,68,0.15)" }} />

          {/* Delete */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Delete Account Permanently</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  This action is irreversible. All your data will be permanently removed.
                </p>
              </div>
              <button onClick={() => setShowDelete(!showDelete)}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                style={{
                  color: "#ef4444", background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-table)",
                }}>
                Delete
              </button>
            </div>

            {showDelete && (
              <div className="mt-4 rounded-lg p-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs mb-3" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                  Type <strong>DELETE</strong> to confirm permanent deletion:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--bg-elevated)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "var(--text-primary)", fontFamily: "var(--font-mono)",
                    }}
                  />
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirm !== "DELETE"}
                    className="px-6 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
                    style={{
                      background: deleteConfirm === "DELETE" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(239,68,68,0.1)",
                      color: deleteConfirm === "DELETE" ? "#fff" : "rgba(239,68,68,0.3)",
                      fontFamily: "var(--font-table)",
                      cursor: deleteConfirm === "DELETE" ? "pointer" : "not-allowed",
                    }}>
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
