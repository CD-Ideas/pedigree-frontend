"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDogColor } from "@/app/utils/colors";
import { playNotifChime, playMessagePop } from "@/app/sounds";

const LOGO = "/logo.png";


function NavSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ dog_id: number; registered_name: string; photo_url?: string | null }[]>([]);
  const [suggestions, setSuggestions] = useState<{ dog_id: number; registered_name: string; photo_url?: string | null }[]>([]);
  const [show, setShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = (val: string) => {
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    // URL paste detection
    const urlMatch = val.match(/pedigreeplatform\.com\/(?:pedigree|dogs)\/(\d+)/);
    if (urlMatch) {
      fetch(`/api/dogs/${urlMatch[1]}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.registered_name) {
            setResults([{ dog_id: Number(urlMatch[1]), registered_name: data.registered_name, photo_url: data.photo_url }]);
            setShow(true);
          }
        })
        .catch(() => {});
      return;
    }
    if (val.length < 2) { setResults([]); setSuggestions([]); setShow(false); return; }
    timerRef.current = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(val)}&limit=8`)
        .then((r) => r.json())
        .then((d) => { setResults(d.dogs || d); setSuggestions(d.suggestions || []); setShow(true); })
        .catch(() => {});
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-300 focus-within:scale-[1.02]" style={{
        background: "#FAFAFA",
        border: "2px solid #C9B29F",
      }}>
        <span className="text-sm">🔍</span>
        <input
          type="text"
          value={q}
          onChange={(e) => doSearch(e.target.value)}
          onFocus={() => (results.length > 0 || suggestions.length > 0) && setShow(true)}
          placeholder="Search dog or paste URL..."
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: q && getDogColor(q) !== "#3a3a3a" ? getDogColor(q) : "#1C1C1C", fontFamily: "var(--font-table, system-ui, sans-serif)", minWidth: 0 }}
        />
        {q && <button onClick={() => { setQ(""); setResults([]); setSuggestions([]); setShow(false); }} className="text-[12px] opacity-50 hover:opacity-100">✕</button>}
      </div>
      {show && (results.length > 0 || suggestions.length > 0) && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-lg overflow-hidden z-[100]"
          style={{
            background: "#FAFAFA",
            border: "2px solid #C9B29F",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {results.map((r) => {
            const photoSrc = r.photo_url
              ? r.photo_url.startsWith("http") ? r.photo_url : `https://www.apbt.online-pedigrees.com/${r.photo_url}`
              : null;
            return (
              <a
                key={r.dog_id}
                href={`/pedigree/${r.dog_id}`}
                className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-[#C9B29F]/10 text-xs"
                style={{ borderBottom: "1px solid #C9B29F" }}
              >
                {photoSrc ? (
                  <img src={photoSrc} alt="" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid #C9B29F" }} onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.objectFit = "contain"; t.style.padding = "8px"; }} />
                ) : (
                  <img src="/logo.png" alt="" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid #C9B29F" }} />
                )}
                <span className="font-semibold truncate" style={{ color: getDogColor(r.registered_name), fontFamily: "var(--font-table)" }}>
                  {r.registered_name}
                </span>
              </a>
            );
          })}
          {results.length === 0 && suggestions.length > 0 && (
            <>
              <div className="px-3 py-2 text-[12px] uppercase tracking-wider font-semibold"
                style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", borderBottom: "1px solid #C9B29F", background: "rgba(201,178,159,0.1)" }}>
                Similar names
              </div>
              {suggestions.map((r) => {
                const photoSrc = r.photo_url
                  ? r.photo_url.startsWith("http") ? r.photo_url : `https://www.apbt.online-pedigrees.com/${r.photo_url}`
                  : null;
                return (
                  <a
                    key={r.dog_id}
                    href={`/pedigree/${r.dog_id}`}
                    className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-[#C9B29F]/10 text-xs"
                    style={{ borderBottom: "1px solid #C9B29F" }}
                  >
                    {photoSrc ? (
                      <img src={photoSrc} alt="" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid #C9B29F" }} onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.objectFit = "contain"; t.style.padding = "8px"; }} />
                    ) : (
                      <img src="/logo.png" alt="" className="w-6 h-6 rounded-lg object-contain flex-shrink-0 opacity-30" style={{ background: "#FAFAFA", border: "1px solid #C9B29F", padding: "2px" }} />
                    )}
                    <span className="font-semibold truncate" style={{ color: getDogColor(r.registered_name), fontFamily: "var(--font-table)" }}>
                      {r.registered_name}
                    </span>
                  </a>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(0);
  const [userPicture, setUserPicture] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: number; type: string; title: string; body: string; link: string; is_read: number; created_at: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const prevUnreadCountRef = useRef<number | null>(null);
  const prevMessageNotifCountRef = useRef<number | null>(null);

  const AVATAR_OPTIONS = [
    { id: "dog1", emoji: "🐕", label: "Dog" },
    { id: "dog2", emoji: "🐶", label: "Puppy" },
    { id: "dog3", emoji: "🐾", label: "Paw" },
    { id: "wolf", emoji: "🐺", label: "Wolf" },
    { id: "bone", emoji: "🦴", label: "Bone" },
    { id: "star", emoji: "⭐", label: "Star" },
    { id: "fire", emoji: "🔥", label: "Fire" },
    { id: "crown", emoji: "👑", label: "Crown" },
    { id: "trophy", emoji: "🏆", label: "Trophy" },
    { id: "shield", emoji: "🛡️", label: "Shield" },
    { id: "diamond", emoji: "💎", label: "Diamond" },
    { id: "bolt", emoji: "⚡", label: "Bolt" },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedIn(true);
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        if (u?.id) setUserId(u.id);
        if (u?.username) setUserName(u.username);
        else if (u?.email) setUserName(u.email);
        if (u?.profile_picture) setUserPicture(u.profile_picture);
      } catch (_e) {}
    } else {
      setLoggedIn(false);
      setUserName("");
      setUserPicture("");
    }
  }, [pathname, mounted]); // re-check on every navigation and on mount

  // Poll for notifications
  useEffect(() => {
    if (!userId || !loggedIn) return;
    const fetchNotifications = () => {
      fetch(`/api/notifications?userId=${userId}`)
        .then(r => r.json())
        .then(data => {
          const newUnread = data.unread_count || 0;
          const notifs = data.notifications || [];

          // Count message-type notifications
          const msgNotifCount = notifs.filter((n: { type: string; is_read: number }) => n.type === "message" && !n.is_read).length;

          // Play sounds only when counts INCREASE (not on first load)
          if (prevUnreadCountRef.current !== null && newUnread > prevUnreadCountRef.current) {
            // Check if the increase is from message notifications
            const isOnMessagesPage = typeof window !== "undefined" && window.location.pathname.startsWith("/messages");
            if (prevMessageNotifCountRef.current !== null && msgNotifCount > prevMessageNotifCountRef.current && !isOnMessagesPage) {
              playMessagePop();
            } else if (msgNotifCount === (prevMessageNotifCountRef.current || 0)) {
              // Non-message notification increased
              playNotifChime();
            } else if (isOnMessagesPage) {
              // On messages page, still chime for non-message notifs
              if (newUnread - msgNotifCount > (prevUnreadCountRef.current - (prevMessageNotifCountRef.current || 0))) {
                playNotifChime();
              }
            } else {
              // Mixed — play message pop (takes priority)
              playMessagePop();
            }
          }

          prevUnreadCountRef.current = newUnread;
          prevMessageNotifCountRef.current = msgNotifCount;

          setUnreadCount(newUnread);
          setNotifications(notifs);
        })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // every 15s
    // Listen for custom event to re-fetch notifications immediately
    const handleRefresh = () => fetchNotifications();
    window.addEventListener("refreshNotifications", handleRefresh);
    return () => { clearInterval(interval); window.removeEventListener("refreshNotifications", handleRefresh); };
  }, [userId, loggedIn]);

  const markNotificationRead = useCallback(async (notifId: number) => {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", userId, notificationId: notifId }),
    });
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [userId]);

  const deleteNotification = useCallback(async (notifId: number) => {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", userId, notificationId: notifId }),
    });
    setNotifications(prev => {
      const removed = prev.find(n => n.id === notifId);
      if (removed && !removed.is_read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== notifId);
    });
  }, [userId]);

  const clearAllNotifications = useCallback(async () => {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all", userId }),
    });
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
  }, [userId]);

  const handleAvatarSelect = useCallback(async (emoji: string) => {
    if (!userId) return;
    setAvatarUploading(true);
    try {
      const avatarValue = emoji ? `emoji:${emoji}` : "";
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profile_picture: avatarValue }),
      });
      const data = await res.json();
      if (!data.error) {
        setUserPicture(avatarValue);
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = avatarValue;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    setShowAvatarPicker(false);
  }, [userId]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", String(userId));
      fd.append("avatar", file);
      const res = await fetch("/api/account/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.profile_picture) {
        setUserPicture(data.profile_picture);
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = data.profile_picture;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    e.target.value = "";
  }, [userId]);

  // Don't show navbar on landing, login, register, share preview
  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/pedigree-lab/share") return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setLoggedIn(false);
    router.push("/");
  };

  const links = [
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <>
    <nav
      style={{
        background: "#1C1C1C",
        borderBottom: "2px solid #C9B29F",
      }}
      className="sticky top-0 z-50 overflow-visible"
    >
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-14 overflow-visible">
        <Link href="/" className="flex items-center gap-2">
          <img src={LOGO} alt="Logo" className="w-12" style={{ height: "auto" }} />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "#C9B29F",
              letterSpacing: "0.02em",
            }}
          >
            Pedigree Platform
          </span>
        </Link>
        {/* Back button moved below navbar */}
        {(pathname.startsWith("/pedigree/") && pathname !== "/pedigree/spotlight" || pathname === "/dashboard") && (
          <div className="flex-1 max-w-md mx-4 overflow-visible">
            <NavSearch />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {loggedIn && links.map((link) => {
            const isActive =
              pathname === link.href ||
              pathname.startsWith(link.href + "/");
            const isHome = link.label === "Home";
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all`}
                style={isHome ? {
                  background: isActive ? "#C9B29F" : "transparent",
                  color: isActive ? "#1C1C1C" : "#FAF7F2",
                  fontFamily: "var(--font-table)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  border: "2px solid #C9B29F",
                } : link.label === "Dashboard" ? {
                  background: "#C9B29F",
                  color: "#1C1C1C",
                  fontFamily: "var(--font-table)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  border: "2px solid #C9B29F",
                } : {
                  color: isActive
                    ? "#1C1C1C"
                    : "#FAF7F2",
                  background: isActive
                    ? "#C9B29F"
                    : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Notification Bell - before Dashboard, styled silver */}
          {mounted && loggedIn && (
            <div className="relative" style={{ order: -1 }}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setDropdownOpen(false); }}
                className="relative px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                }}
                title="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-lg flex items-center justify-center text-[12px] font-bold"
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                    }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-16px)] rounded-lg overflow-hidden z-50"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                    }}>
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "2px solid #C9B29F" }}>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                        Notifications {unreadCount > 0 && <span className="ml-1 text-[12px]" style={{ color: "#ef4444" }}>({unreadCount} new)</span>}
                      </p>
                      {notifications.length > 0 && (
                        <button onClick={clearAllNotifications}
                          className="text-[12px] px-2 py-0.5 rounded transition-colors hover:bg-red-500/10"
                          style={{ color: "#ef4444", fontFamily: "var(--font-table)", border: "1px solid #ef4444" }}>
                          Clear All
                        </button>
                      )}
                    </div>
                    {/* Notification List - Grouped */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <span className="text-2xl block mb-2">🔔</span>
                          <p className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                            No notifications
                          </p>
                        </div>
                      ) : (() => {
                        // Group notifications
                        const groups: { key: string; icon: string; title: string; body: string; link: string; ids: number[]; count: number; hasUnread: boolean; latestTime: string }[] = [];
                        const groupMap = new Map<string, typeof groups[0]>();

                        for (const notif of notifications) {
                          let groupKey: string;
                          if (notif.type === "message") {
                            // Group by sender name (extract from title "New message from X")
                            const match = notif.title.match(/from (.+)$/i);
                            const sender = match ? match[1] : notif.title;
                            groupKey = `msg_${sender}`;
                            if (!groupMap.has(groupKey)) {
                              groupMap.set(groupKey, { key: groupKey, icon: "💬", title: sender, body: notif.body, link: `/messages?user=${encodeURIComponent(sender)}`, ids: [], count: 0, hasUnread: false, latestTime: notif.created_at });
                            }
                          } else if (notif.type === "marketplace") {
                            // Group by ad link
                            const adLink = notif.link || "marketplace";
                            groupKey = `mkt_${adLink}`;
                            if (!groupMap.has(groupKey)) {
                              const adTitle = notif.body || notif.title.replace(/^New /, "");
                              groupMap.set(groupKey, { key: groupKey, icon: "🏪", title: adTitle, body: "", link: notif.link, ids: [], count: 0, hasUnread: false, latestTime: notif.created_at });
                            }
                          } else if (notif.type === "support") {
                            groupKey = "support_all";
                            if (!groupMap.has(groupKey)) {
                              groupMap.set(groupKey, { key: groupKey, icon: "🎫", title: "Support replies", body: notif.body, link: "/dashboard/support", ids: [], count: 0, hasUnread: false, latestTime: notif.created_at });
                            }
                          } else if (notif.type === "title") {
                            groupKey = "title_all";
                            if (!groupMap.has(groupKey)) {
                              groupMap.set(groupKey, { key: groupKey, icon: "🏆", title: "Title tracking updates", body: "", link: notif.link, ids: [], count: 0, hasUnread: false, latestTime: notif.created_at });
                            }
                          } else {
                            groupKey = `other_${notif.id}`;
                            groupMap.set(groupKey, { key: groupKey, icon: "🔔", title: notif.title, body: notif.body, link: notif.link, ids: [], count: 0, hasUnread: false, latestTime: notif.created_at });
                          }
                          const g = groupMap.get(groupKey)!;
                          g.ids.push(notif.id);
                          g.count++;
                          if (!notif.is_read) g.hasUnread = true;
                          if (notif.created_at > g.latestTime) {
                            g.latestTime = notif.created_at;
                            g.body = notif.body;
                            g.link = notif.link;
                          }
                        }

                        return Array.from(groupMap.values()).sort((a, b) => b.latestTime.localeCompare(a.latestTime)).map(group => (
                          <div key={group.key}
                            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#C9B29F]/10 cursor-pointer"
                            style={{
                              borderBottom: "1px solid #C9B29F",
                              background: group.hasUnread ? "rgba(201,178,159,0.1)" : "transparent",
                            }}
                            onClick={() => {
                              group.ids.forEach(id => {
                                const n = notifications.find(nn => nn.id === id);
                                if (n && !n.is_read) markNotificationRead(id);
                              });
                              if (group.link) router.push(group.link);
                              setShowNotifications(false);
                            }}
                          >
                            <span className="text-sm mt-0.5 flex-shrink-0">{group.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{
                                color: group.hasUnread ? "#1C1C1C" : "#4A4A4A",
                                fontFamily: "var(--font-table)",
                              }}>
                                {group.count > 1 ? (
                                  group.key.startsWith("msg_") ? `${group.count} new messages from ${group.title}` :
                                  group.key.startsWith("mkt_") ? `${group.count} responses on ${group.title}` :
                                  group.key === "title_all" ? `${group.count} title tracking updates` :
                                  group.key === "support_all" ? `${group.count} support replies` :
                                  group.title
                                ) : (
                                  group.key.startsWith("msg_") ? `New message from ${group.title}` :
                                  group.key.startsWith("mkt_") ? group.title :
                                  group.key === "title_all" ? "1 title tracking update" :
                                  group.key === "support_all" ? "1 support reply" :
                                  group.title
                                )}
                              </p>
                              {group.body && (
                                <p className="text-[12px] mt-0.5 truncate" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                                  {group.body}
                                </p>
                              )}
                              <p className="text-[12px] mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                                {new Date(group.latestTime + "Z").toLocaleString()}
                              </p>
                            </div>
                            {group.hasUnread && (
                              <div className="flex items-center gap-1 flex-shrink-0 mt-1.5">
                                {group.count > 1 && <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-lg" style={{ background: "rgba(201,178,159,0.2)", color: "#1C1C1C" }}>{group.count}</span>}
                                <div className="w-2 h-2 rounded-lg" style={{ background: "#C9B29F" }} />
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); group.ids.forEach(id => deleteNotification(id)); }}
                              className="text-[12px] flex-shrink-0 p-1 rounded transition-colors hover:bg-red-500/10"
                              style={{ color: "#5a6a82" }}
                              title="Delete all"
                            >
                              ✕
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {!mounted ? (
            <div className="ml-4" style={{ width: 80 }} />
          ) : loggedIn && pathname === "/dashboard" ? (
            null
          ) : loggedIn ? (
            <div className="relative ml-4">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: "#FAF7F2",
                  background: dropdownOpen ? "rgba(201,178,159,0.15)" : "transparent",
                  border: "1px solid transparent",
                  fontFamily: "var(--font-table)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                <span
                  className={`flex items-center justify-center text-xs font-bold relative cursor-pointer overflow-hidden flex-shrink-0 ${userPicture && !userPicture.startsWith("emoji:") ? "rounded-lg" : "rounded-lg w-7 h-7"}`}
                  style={{ background: userPicture?.startsWith("emoji:") ? "#1C1C1C" : userPicture ? "transparent" : "#C9B29F", color: "#FAF7F2", border: "2px solid #C9B29F", ...(userPicture && !userPicture.startsWith("emoji:") ? { width: "32px", height: "24px" } : {}) }}
                  onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(!showAvatarPicker); }}
                  title="Click to change profile picture"
                >
                  {userPicture?.startsWith("emoji:") ? (
                    <span className="text-sm">{userPicture.replace("emoji:", "")}</span>
                  ) : userPicture ? (
                    <img src={userPicture} alt="" className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    (userName || "U")[0].toUpperCase()
                  )}
                  {avatarUploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "rgba(0,0,0,0.6)" }}>
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-lg animate-spin" />
                    </span>
                  )}
                </span>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {/* Avatar Picker Popup */}
                {showAvatarPicker && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(false); }} />
                    <div className="fixed right-2 sm:absolute sm:right-0 top-14 sm:top-full mt-0 sm:mt-2 w-[calc(100vw-16px)] sm:w-64 max-w-64 rounded-lg overflow-hidden z-[70]"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#FAFAFA",
                        border: "2px solid #C9B29F",
                      }}>
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid #C9B29F" }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                          Choose Avatar
                        </p>
                      </div>
                      {/* Upload Photo Option */}
                      <button
                        onClick={() => { setShowAvatarPicker(false); avatarInputRef.current?.click(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#C9B29F]/10"
                        style={{ borderBottom: "1px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,178,159,0.15)", border: "1px solid #C9B29F" }}>📷</span>
                        Upload Photo
                      </button>
                      {/* Avatar Grid */}
                      <div className="p-3 grid grid-cols-6 gap-2">
                        {AVATAR_OPTIONS.map((av) => (
                          <button
                            key={av.id}
                            onClick={() => handleAvatarSelect(av.emoji)}
                            title={av.label}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 hover:bg-[#C9B29F]/10"
                            style={{
                              background: userPicture === `emoji:${av.emoji}` ? "rgba(201,178,159,0.25)" : "#FAFAFA",
                              border: userPicture === `emoji:${av.emoji}` ? "2px solid #C9B29F" : "1px solid #C9B29F",
                            }}
                          >
                            {av.emoji}
                          </button>
                        ))}
                      </div>
                      {/* Remove avatar option */}
                      {userPicture && (
                        <button
                          onClick={() => handleAvatarSelect("")}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 transition-colors hover:bg-red-500/5 text-xs"
                          style={{ borderTop: "1px solid #C9B29F", color: "#ef4444", fontFamily: "var(--font-table)" }}>
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  </>
                )}
                {userName}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-lg overflow-hidden z-50"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                    }}>
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #C9B29F" }}>
                      <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{userName}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>Admin</p>
                    </div>

                    {/* Account Settings */}
                    <div className="py-1">
                      <Link href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#C9B29F]/10"
                        style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="text-sm">⚙️</span>
                        Account Settings
                      </Link>
                    </div>

                    {/* Contact Support */}
                    <div className="py-1">
                      <Link href="/contact"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#C9B29F]/10"
                        style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="text-sm">📩</span>
                        Contact Support
                      </Link>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid #C9B29F" }} />

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-red-500/5 text-left"
                        style={{ color: "#ef4444", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="text-sm">🚪</span>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-4">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "#FAF7F2" }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "#C9B29F",
                  color: "#1C1C1C",
                }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
      {mounted && loggedIn && pathname !== "/dashboard" && (
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-1">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="flex items-center gap-1.5 text-sm font-bold transition-all hover:underline"
            style={{
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </>
  );
}
