"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const steelFrame = {
  border: "1.5px solid rgba(30,64,120,0.8)",
  boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
  background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email: string; role: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) setUser(u);
      else router.push("/login");
    } catch { router.push("/login"); }
  }, [router]);

  const handleDeactivate = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setMessage("Account deactivated. You have been logged out.");
    setMessageType("success");
    setTimeout(() => router.push("/"), 2000);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user?.username }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setMessage("Account permanently deleted.");
        setMessageType("success");
        setTimeout(() => router.push("/"), 2000);
      } else {
        setMessage(data.message || "Failed to delete account");
        setMessageType("error");
      }
    } catch {
      setMessage("Server error");
      setMessageType("error");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "var(--accent-gold)" }}>
        Account Settings
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
        Manage your account preferences
      </p>

      {message && (
        <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{
          background: messageType === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${messageType === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: messageType === "success" ? "#22c55e" : "#ef4444",
          fontFamily: "var(--font-table)",
        }}>
          {message}
        </div>
      )}

      {/* Profile Info */}
      <div className="mt-6 rounded-xl p-6" style={steelFrame}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
          Profile
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Username</span>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{user.username}</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Email</span>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{user.email || "Not set"}</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Role</span>
            <span className="text-sm font-bold uppercase" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>{user.role}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Status</span>
            <span className="text-sm font-bold flex items-center gap-2" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 rounded-xl p-6" style={{ ...steelFrame, border: "1.5px solid rgba(239,68,68,0.3)" }}>
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
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
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
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
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
