"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { notificationsApi, type ApiNotification } from "../lib/api";

type Props = {
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
};

const SECTION_LABELS = ["Today", "Yesterday", "This week", "Older"] as const;
type Section = typeof SECTION_LABELS[number];

const STATUS_COLORS: Record<string, string> = {
  "To Do": "#94a3b8",
  "In Progress": "#338EF7",
  "In Review": "#F5A524",
  "Done": "#17C964",
  "Blocked": "#F31260",
};

const FALLBACK_COLORS = ["#F97316", "#9353D3", "#338EF7", "#17C964", "#F31260", "#F5A524", "#06B7DB", "#FF4ECD"];

function colorForId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function relTime(iso: string): string {
  const diff = Math.round((Date.now() - +new Date(iso)) / 60_000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  const days = Math.round(diff / 1440);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bucket(iso: string): Section {
  const t = +new Date(iso);
  const now = new Date();
  const sod = new Date(now); sod.setHours(0, 0, 0, 0);
  const todayStart = +sod;
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  if (t >= todayStart) return "Today";
  if (t >= yesterdayStart) return "Yesterday";
  if (t >= weekStart) return "This week";
  return "Older";
}

function verb(n: ApiNotification): string {
  const p = n.payload ?? {};
  const type = p.itemType ?? "item";
  switch (n.kind) {
    case "item.assigned":         return `assigned a ${type} to you`;
    case "item.unassigned":       return `unassigned you from a ${type}`;
    case "item.commented":        return `commented on a ${type}`;
    case "item.mentioned":        return `mentioned you in a ${type}`;
    case "item.status_changed":   return `changed a ${type} from ${p.fromValue ?? "?"} to ${p.toValue ?? "?"}`;
    case "item.priority_changed": return `set ${type} priority to ${p.toValue ?? "?"}`;
    case "item.due_changed":      return p.toValue ? `set a due date on a ${type}` : `cleared the due date on a ${type}`;
    case "item.reporter_changed": return `made you the reporter on a ${type}`;
    case "item.deleted":          return `deleted a ${type}`;
    case "item.restored":         return `restored a ${type}`;
    case "subtask.added":         return `added a subtask`;
    case "sprint.started":        return `started a sprint`;
    case "sprint.completed":      return `completed a sprint`;
    case "project.invited":       return `added you to a project`;
    case "project.removed_from":  return `removed you from a project`;
    case "project.role_changed":  return `set your role to ${p.toValue ?? "?"}`;
    case "lunch.topup.verified":  return `verified your top-up`;
    case "lunch.balance.low":     return `your lunch balance is low`;
    default:                       return n.kind;
  }
}

function linkFor(n: ApiNotification): string | null {
  const p = n.payload ?? {};
  if (!p.projectKey) {
    if (n.kind.startsWith("lunch.")) return "/lunch";
    if (n.kind === "project.invited" || n.kind === "project.role_changed" || n.kind === "project.removed_from") {
      return p.projectKey ? `/projects/${p.projectKey}` : "/projects";
    }
    return null;
  }
  if (n.kind.startsWith("item.") || n.kind === "subtask.added") {
    const anchor = p.commentId && (n.kind === "item.commented" || n.kind === "item.mentioned")
      ? `#comment-${p.commentId}`
      : "";
    if (p.itemNumber != null) return `/projects/${p.projectKey}/${p.projectKey}-${p.itemNumber}${anchor}`;
    return `/projects/${p.projectKey}`;
  }
  if (n.kind.startsWith("sprint.")) return `/projects/${p.projectKey}?tab=board`;
  return `/projects/${p.projectKey}`;
}

function Avatar({ n, size = 32 }: { n: ApiNotification; size?: number }) {
  const p = n.payload ?? {};
  const name = p.actorName ?? "?";
  const url = p.actorAvatarUrl as string | undefined;
  const color = (p.actorAvatarColor as string | undefined) ?? colorForId(p.actorId ?? n.id);
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size} height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color, color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 600, flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatusChip({ status }: { status: string | undefined }) {
  if (!status) return null;
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 500,
        color, padding: "1px 8px",
        background: `${color}1f`, borderRadius: 10,
      }}
    >
      {status}
    </span>
  );
}

type Group = { primary: ApiNotification; extra: number };

function groupNotifications(rows: ApiNotification[]): Group[] {
  const out: Group[] = [];
  for (const n of rows) {
    const last = out[out.length - 1];
    // Collapse only when actor + entity + KIND family match (e.g. only status_changed
    // collapses with status_changed). Mixing kinds buries what changed.
    if (
      last &&
      last.primary.payload?.actorId === n.payload?.actorId &&
      last.primary.entityId === n.entityId &&
      last.primary.kind === n.kind &&
      Math.abs(+new Date(last.primary.createdAt) - +new Date(n.createdAt)) < 60 * 60_000
    ) {
      last.extra++;
      continue;
    }
    out.push({ primary: n, extra: 0 });
  }
  return out;
}

export function NotificationsBell({ className = "", iconClassName = "", children }: Props) {
  const router = useRouter();
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
      const list = await notificationsApi.list({ limit: 40 });
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    let id: any = null;
    const start = () => {
      if (id) return;
      id = setInterval(fetchCount, 30_000);
    };
    const stop = () => {
      if (id) { clearInterval(id); id = null; }
    };
    const onVis = () => {
      if (document.hidden) stop();
      else { fetchCount(); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchCount]);

  const listFetchedAt = useRef(0);
  useEffect(() => {
    if (!open) return;
    // Cache list for 60s — popover reopen within that window skips refetch
    if (Date.now() - listFetchedAt.current < 60_000 && items.length > 0) return;
    fetchList().then(() => { listFetchedAt.current = Date.now(); });
  }, [open, fetchList]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const sections = useMemo(() => {
    const groups = groupNotifications(items);
    const bySection: Record<Section, Group[]> = {
      "Today": [], "Yesterday": [], "This week": [], "Older": [],
    };
    for (const g of groups) bySection[bucket(g.primary.createdAt)].push(g);
    return SECTION_LABELS.map(label => ({ label, groups: bySection[label] })).filter(s => s.groups.length > 0);
  }, [items]);

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread(c => Math.max(0, c - 1));
    try { await notificationsApi.markRead(id); } catch { /* ignore */ }
  };

  const onClickNotification = async (n: ApiNotification) => {
    if (!n.readAt) await markRead(n.id);
    const link = linkFor(n);
    setOpen(false);
    if (link) router.push(link);
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
        style={{ position: "relative" }}
      >
        {children}
        {unread > 0 && (
          <span
            style={{
              position: "absolute", top: -2, right: -2,
              minWidth: 16, height: 16, padding: "0 4px",
              fontSize: 10, lineHeight: "16px", fontWeight: 600,
              borderRadius: 8, background: "#F31260", color: "white",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
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
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            width: 420, maxHeight: 560, overflow: "auto",
            background: "var(--bg-elevated, #fff)", color: "var(--fg, #111)",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            zIndex: 1000, padding: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" }}>
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
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, opacity: 0.7 }}>Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", fontSize: 13, opacity: 0.6 }}>
              You&apos;re all caught up.
            </div>
          )}

          {sections.map(section => (
            <div key={section.label} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.55, padding: "8px 10px 6px" }}>
                {section.label}
              </div>
              {section.groups.map(g => {
                const n = g.primary;
                const p = n.payload ?? {};
                const projectRef = p.projectKey && p.itemNumber != null ? `${p.projectKey}-${p.itemNumber}` : null;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onClickNotification(n)}
                    style={{
                      display: "flex", width: "100%", gap: 10, textAlign: "left",
                      padding: "10px 10px",
                      borderRadius: 8,
                      background: n.readAt ? "transparent" : "rgba(51, 142, 247, 0.08)",
                      border: "none", cursor: "pointer", marginBottom: 2,
                    }}
                  >
                    <Avatar n={n} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                          <b>{p.actorName ?? "Someone"}</b> {verb(n)}
                        </div>
                        <span style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap" }}>{relTime(n.createdAt)}</span>
                      </div>
                      {p.title && (
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.title}
                        </div>
                      )}
                      {(projectRef || p.status) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                          {projectRef && (
                            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{projectRef}</span>
                          )}
                          {(p.toValue && n.kind === "item.status_changed" ? p.toValue : p.status) && (
                            <StatusChip status={n.kind === "item.status_changed" ? p.toValue : p.status} />
                          )}
                        </div>
                      )}
                      {g.extra > 0 && (
                        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
                          +{g.extra} more update{g.extra === 1 ? "" : "s"} from {p.actorName ?? "them"}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
