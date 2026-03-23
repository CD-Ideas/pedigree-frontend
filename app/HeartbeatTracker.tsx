"use client";

import { useEffect, useRef } from "react";

function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem("guest_session_key");
  if (!key) {
    key = "g_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("guest_session_key", key);
  }
  return key;
}

export default function HeartbeatTracker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const stored = localStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        const body: Record<string, string> = {};

        if (user?.id) {
          body.userId = String(user.id);
        } else {
          body.sessionKey = getSessionKey();
        }

        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // Silent fail
      }
    };

    // Send immediately on load
    sendHeartbeat();

    // Then every 90 seconds
    intervalRef.current = setInterval(sendHeartbeat, 90000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
