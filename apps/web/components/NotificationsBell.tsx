"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { notificationsApi, type ApiNotification } from "../lib/api";

type Props = {
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
};

function relTime(iso: string) {
  const diff = Math.round((Date.now() - +new Date(iso)) / 60_000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.round(diff / 60)}h`;
  const days = Math.round(diff / 1440);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function describe(n: ApiNotification): string {
  const title = n.payload?.title ?? "";
  switch (n.kind) {
    case "item.assigned": return `Assigned to you: ${title}`;
    case "item.commented": return `New comment on: ${title}`;
    case "item.mentioned": return `Mentioned in: ${title}`;
    case "project.invited": return `Added to project`;
    case "lunch.topup.verified": return `Top-up verified`;
    case "lunch.balance.low": return `Lunch balance low`;
    default: return n.kind;
  }
}

export function NotificationsBell({ className = "", iconClassName = "", children }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await notificationsApi.unreadCount();
      setUnread(r.count);
    } catch { /* ignore */ }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationsApi.list({ limit: 20 });
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread(c => Math.max(0, c - 1));
    try { await notificationsApi.markRead(id); } catch { /* ignore */ }
  };

  const markAll = async () => {
    setItems(prev => prev.map(n => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnread(0);
    try { await notificationsApi.markAllRead(); } catch { /* ignore */ }
  };

  return (
    <div ref={popRef} className={`notifications-bell-wrap ${className}`} style={{ position: "relative" }}>
      <button
        type="button"
        className={iconClassName}
        title="Notifications"
        onClick={() => setOpen(o => !o)}
      >
        {children}
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              fontSize: 10,
              lineHeight: "16px",
              fontWeight: 600,
              borderRadius: 8,
              background: "#F31260",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            width: 360,
            maxHeight: 480,
            overflow: "auto",
            background: "var(--bg-elevated, #fff)",
            color: "var(--fg, #111)",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            zIndex: 1000,
            padding: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px" }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            <button
              type="button"
              onClick={markAll}
              style={{ fontSize: 12, color: "#338EF7", background: "none", border: "none", cursor: "pointer" }}
            >
              Mark all read
            </button>
          </div>

          {loading && items.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, opacity: 0.7 }}>Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, opacity: 0.7 }}>No notifications.</div>
          )}

          {items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.readAt && markRead(n.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                background: n.readAt ? "transparent" : "rgba(51, 142, 247, 0.08)",
                border: "none",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.35 }}>{describe(n)}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{relTime(n.createdAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
