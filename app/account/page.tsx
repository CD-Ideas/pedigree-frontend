"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { playNotifChime } from "@/app/sounds";

const cardStyle = {
  background: "#FAF7F2",
  border: "2px solid #C9B29F",
  borderRadius: "8px",
};

const inputStyle = {
  background: "#FAFAFA",
  border: "2px solid #C9B29F",
  borderRadius: "8px",
  color: "#1C1C1C",
  fontFamily: "var(--font-table)",
};

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
}

const capName = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

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

  // Sound mute
  const [soundMuted, setSoundMuted] = useState(false);

  // Active status
  const [activeStatus, setActiveStatus] = useState(true);

  // Support messages
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);

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
    setSoundMuted(localStorage.getItem("soundMuted") === "true");
    // Load active status
    fetch("/api/account/active-status")
      .then(r => r.json())
      .then(d => { if (typeof d.active_status === "boolean") setActiveStatus(d.active_status); })
      .catch(() => {});
    // Load support messages
    const loadedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (loadedUser?.username) {
      setSupportLoading(true);
      fetch(`/api/support/my-messages?username=${encodeURIComponent(loadedUser.username)}`)
        .then(r => r.json())
        .then(d => { if (d.messages) setSupportMessages(d.messages); })
        .catch(() => {})
        .finally(() => setSupportLoading(false));
    }
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
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6" style={{ background: "#EDE4D5" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-table)", fontSize: "1.6rem", fontWeight: 700, color: "#1C1C1C" }}>
          Account Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
          Manage your profile, password, and account
        </p>
      </div>

      {/* Message toast */}
      {message && (
        <div className="px-4 py-3 text-sm transition-all" style={{
          background: messageType === "success" ? "#F0FDF4" : "#FEF2F2",
          border: `2px solid ${messageType === "success" ? "#86EFAC" : "#FCA5A5"}`,
          borderRadius: "8px",
          color: messageType === "success" ? "#166534" : "#991B1B",
          fontFamily: "var(--font-table)",
        }}>
          {message}
        </div>
      )}

      {/* --- Profile Picture --- */}
      <div className="p-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          Profile Picture
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {avatarPreview?.startsWith("emoji:") ? (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: "#FAF7F2",
                  border: "2px solid #C9B29F",
                }}
              >
                {avatarPreview.replace("emoji:", "")}
              </div>
            ) : avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="rounded-lg object-cover"
                style={{ border: "2px solid #C9B29F", width: "120px", height: "90px" }}
                onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.objectFit = "contain"; t.style.padding = "8px"; }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                style={{
                  background: "#C9B29F",
                  color: "#1C1C1C",
                  border: "2px solid #C9B29F",
                }}
              >
                {(user.username || "U")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <span className="text-white text-xs font-bold" style={{ fontFamily: "var(--font-table)" }}>
                {avatarUploading ? "..." : "Change"}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              {capName(user.username)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Click on the picture to upload a new one
            </p>
            <p className="text-[12px] mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* --- Edit Profile --- */}
      <div className="p-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Username
            </label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none transition-all focus:ring-1"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Email
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 text-sm outline-none transition-all focus:ring-1"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "2px solid #C9B29F" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] uppercase tracking-wider" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Role</span>
                <span className="text-xs font-bold uppercase" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{user.role}</span>
              </div>
              <span className="text-[12px]" style={{ color: "#4A4A4A" }}>|</span>
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
                background: "#C9B29F",
                color: "#1C1C1C",
                borderRadius: "8px",
                fontFamily: "var(--font-table)",
                border: "2px solid #C9B29F",
              }}
            >
              {profileSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* --- Change Password --- */}
      <div className="p-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none pr-10"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "#4A4A4A" }}
              >
                {showCurrentPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2.5 text-sm outline-none pr-10"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "#4A4A4A" }}
              >
                {showNewPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-widest font-semibold mb-1.5"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[12px] mt-1" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                Passwords do not match
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2" style={{ borderTop: "2px solid #C9B29F" }}>
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "#C9B29F",
                color: "#1C1C1C",
                borderRadius: "8px",
                fontFamily: "var(--font-table)",
                border: "2px solid #C9B29F",
              }}
            >
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* --- Subscription / Plan --- */}
      <div className="p-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          Subscription & Plan
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4" style={{
            background: "#FAFAFA",
            border: "2px solid #C9B29F",
            borderRadius: "8px",
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "#C9B29F", color: "#1C1C1C", borderRadius: "8px" }}>
                ★
              </div>
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: "var(--font-table)" }}>
                  <span style={{ color: "#1C1C1C" }}>FREE PLAN</span>
                  <span className="text-xs font-normal ml-1" style={{ color: "#4A4A4A" }}>/ 3 MONTHS</span>
                </p>
                <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Basic access to all features
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[12px] font-bold uppercase"
              style={{ background: "#F0FDF4", color: "#166534", border: "2px solid #86EFAC", fontFamily: "var(--font-table)" }}>
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
              <div key={item.label} className="flex items-center gap-2 py-2 px-3"
                style={{ background: "#FAFAFA", border: "2px solid #C9B29F", borderRadius: "8px" }}>
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-[12px] uppercase tracking-wider" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{item.label}</p>
                  <p className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center" style={{ borderTop: "2px solid #C9B29F" }}>
            <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Premium plans coming soon with advanced features
            </p>
          </div>
        </div>
      </div>

      {/* --- Preferences --- */}
      <div className="p-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          Preferences
        </h2>
        <div className="space-y-4">
          {/* Default Generation View */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Default Pedigree Generations</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                How many generations to show by default
              </p>
            </div>
            <select
              defaultValue="4"
              onChange={(e) => {
                localStorage.setItem("pref_default_gens", e.target.value);
                showMsg("Default generations updated", "success");
              }}
              className="px-3 py-1.5 text-sm outline-none"
              style={inputStyle}
            >
              <option value="3">3 Generations</option>
              <option value="4">4 Generations</option>
              <option value="5">5 Generations</option>
            </select>
          </div>


          {/* Notifications */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Email Notifications</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Receive updates about your pedigrees and community activity
              </p>
            </div>
            <button
              onClick={(e) => {
                const btn = e.currentTarget;
                const isOn = btn.dataset.on === "true";
                btn.dataset.on = isOn ? "false" : "true";
                btn.style.background = isOn ? "#EDE4D5" : "rgba(34,197,94,0.3)";
                btn.querySelector("span")!.style.transform = isOn ? "translateX(0)" : "translateX(20px)";
                btn.querySelector("span")!.style.background = isOn ? "#4A4A4A" : "#22c55e";
                localStorage.setItem("pref_email_notifs", isOn ? "off" : "on");
                showMsg(`Email notifications ${isOn ? "disabled" : "enabled"}`, "success");
              }}
              data-on="false"
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: "#EDE4D5", border: "2px solid #C9B29F" }}
            >
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all" style={{ background: "#4A4A4A" }} />
            </button>
          </div>

          {/* Notification Sounds */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Notification Sounds</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Play sounds for new notifications and messages
              </p>
            </div>
            <button
              onClick={() => {
                const newMuted = !soundMuted;
                setSoundMuted(newMuted);
                localStorage.setItem("soundMuted", newMuted ? "true" : "false");
                showMsg(`Notification sounds ${newMuted ? "muted" : "enabled"}`, "success");
                if (!newMuted) {
                  // Play a preview chime so user hears the sound is on
                  setTimeout(() => playNotifChime(), 200);
                }
              }}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{
                background: soundMuted ? "#EDE4D5" : "rgba(34,197,94,0.3)",
                border: "2px solid #C9B29F",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: soundMuted ? "#4A4A4A" : "#22c55e",
                  transform: soundMuted ? "translateX(0)" : "translateX(20px)",
                }}
              />
            </button>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Active Status</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Show when you&apos;re online to other users
              </p>
            </div>
            <button
              onClick={async () => {
                const newStatus = !activeStatus;
                setActiveStatus(newStatus);
                try {
                  await fetch("/api/account/active-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ active_status: newStatus }),
                  });
                  showMsg(`Active status ${newStatus ? "visible" : "hidden"}`, "success");
                } catch {
                  setActiveStatus(!newStatus);
                  showMsg("Failed to update active status", "error");
                }
              }}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{
                background: activeStatus ? "rgba(34,197,94,0.3)" : "#EDE4D5",
                border: "2px solid #C9B29F",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: activeStatus ? "#22c55e" : "#4A4A4A",
                  transform: activeStatus ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </button>
          </div>
        </div>
      </div>


      {/* --- Danger Zone --- */}
      <div className="p-6" style={{ ...cardStyle, border: "2px solid #ef4444" }}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
          Danger Zone
        </h2>

        <div className="space-y-4">
          {/* Deactivate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Deactivate Account</p>
              <p className="text-xs mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Temporarily disable your account. You can reactivate by logging in again.
              </p>
            </div>
            <button onClick={handleDeactivate}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
              style={{
                color: "#f97316", background: "#FFF7ED",
                border: "2px solid #f97316", borderRadius: "8px", fontFamily: "var(--font-table)",
              }}>
              Deactivate
            </button>
          </div>

          <div style={{ borderTop: "2px solid #FCA5A5" }} />

          {/* Delete */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Delete Account Permanently</p>
                <p className="text-xs mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  This action is irreversible. All your data will be permanently removed.
                </p>
              </div>
              <button onClick={() => setShowDelete(!showDelete)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                style={{
                  color: "#ef4444", background: "#FEF2F2",
                  border: "2px solid #ef4444", borderRadius: "8px", fontFamily: "var(--font-table)",
                }}>
                Delete
              </button>
            </div>

            {showDelete && (
              <div className="mt-4 p-4" style={{ background: "#FEF2F2", border: "2px solid #FCA5A5", borderRadius: "8px" }}>
                <p className="text-xs mb-3" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                  Type <strong>DELETE</strong> to confirm permanent deletion:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{
                      background: "#FAFAFA", border: "2px solid #FCA5A5",
                      borderRadius: "8px",
                      color: "#1C1C1C", fontFamily: "var(--font-mono)",
                    }}
                  />
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirm !== "DELETE"}
                    className="px-6 py-2 text-xs font-bold uppercase transition-colors"
                    style={{
                      background: deleteConfirm === "DELETE" ? "#ef4444" : "#FEF2F2",
                      color: deleteConfirm === "DELETE" ? "#fff" : "#FCA5A5",
                      border: "2px solid #ef4444",
                      borderRadius: "8px",
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
