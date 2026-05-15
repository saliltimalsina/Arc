"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./dashboard.css";
import "../projects/projects.css";
import OGSidebar from "@/components/OGSidebar";
import { useAuthStore } from "@/lib/authStore";
import { useProjectStore } from "@/lib/projectStore";
import { useMyItems } from "@/lib/useMyItems";
import { useDashboard } from "@/lib/useDashboard";
import type { ApiDashboard } from "@/lib/api";

// ─── SVG Icon factory ──────────────────────────────────────────────────────────

type IconProps = React.SVGProps<SVGSVGElement>;

function mkIcon(paths: React.ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

const IconHome     = mkIcon(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>);
const IconBoxes    = mkIcon(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
const IconCheck    = mkIcon(<><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></>);
const IconTimeline = mkIcon(<><path d="M4 6h10"/><circle cx="18" cy="6" r="2"/><path d="M4 12h6"/><circle cx="14" cy="12" r="2"/><path d="M4 18h12"/><circle cx="20" cy="18" r="2"/></>);
const IconUsers    = mkIcon(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);
const IconTrophy   = mkIcon(<><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2a2 2 0 0 1 0 4h-2"/><path d="M7 5H5a2 2 0 0 0 0 4h2"/></>);
const IconChart    = mkIcon(<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V9"/><path d="M16 15v-7"/></>);
const IconSearch   = mkIcon(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
const IconSettings = mkIcon(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
const IconBell     = mkIcon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
const IconPlay     = mkIcon(<path d="M8 5v14l11-7z"/>);
const IconPause    = mkIcon(<><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>);
const IconArrow    = mkIcon(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>);
const IconChevR    = mkIcon(<path d="m9 6 6 6-6 6"/>);
const IconStar     = mkIcon(<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 17l-5.6 3 1.5-6.3L3 9.5l6.4-.5z"/>);
const IconSpark    = mkIcon(<><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M5.6 18.4l2.8-2.8"/><path d="M15.6 8.4l2.8-2.8"/></>);
const IconFlag     = mkIcon(<><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>);
const IconAward    = mkIcon(<><circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/></>);
const IconBolt     = mkIcon(<path d="m13 3-9 12h7l-1 6 9-12h-7z"/>);
const IconArrowUp  = mkIcon(<><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>);
const IconTrending = mkIcon(<><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></>);
const IconAlert    = mkIcon(<><path d="m12 4 9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></>);
const IconBrain    = mkIcon(<path d="M9.5 4a3 3 0 0 0-3 3v.5a3 3 0 0 0-1 5.5v.5a3 3 0 0 0 4 3v.5a3 3 0 0 0 6 0V16a3 3 0 0 0 4-3v-.5a3 3 0 0 0-1-5.5V7a3 3 0 0 0-3-3z"/>);
const IconPlus     = mkIcon(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IconCalendar = mkIcon(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>);
const IconLogTime  = mkIcon(<><circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 2"/><path d="M9 3h6"/></>);
const IconLeaf     = mkIcon(<><path d="M5 19c8 0 14-6 14-14C13 5 5 11 5 19z"/><path d="M5 19l8-8"/></>);

// ─── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({ mode, onCmdK, userName, activeCount }: { mode: string; onCmdK: () => void; userName: string; activeCount: number }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="topbar">
      <div className="topbar-greeting">
        <h1>
          {greeting}, <span className="grad">{userName.split(" ")[0] || userName}</span>
        </h1>
        <p>
          You&apos;re contributing to <span className="accent">{activeCount} active project{activeCount !== 1 ? "s" : ""}</span> today.
        </p>
      </div>

      <span className="mode-pill">
        <span className="pulse" />
        {mode} mode
      </span>

      <button className="topbar-search" onClick={onCmdK}>
        <IconSearch />
        <span>Jump anywhere…</span>
        <span className="kbd">⌘ K</span>
      </button>

      <button className="topbar-icon-btn" title="Notifications">
        <IconBell />
        <span className="dot" />
      </button>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

type HeroState = "normal" | "deadline" | "achievement";

const CONFETTI_COLORS = ["#F97316", "#FB923C", "#F5A524", "#FF6B5C", "#9353D3"];

function Hero({ data }: { data: ApiDashboard["hero"] | null }) {
  const state: HeroState = data?.state ?? "normal";
  const velocity = Math.max(0, Math.min(100, 70 + (data?.momentumPct ?? 0)));
  return (
    <div className="hero" data-state={state}>
      {state === "achievement" && (
        <div className="confetti-strip">
          {Array.from({ length: 18 }).map((_, i) => (
            <i
              key={i}
              style={{
                left: `${(i / 18) * 100}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 7) * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="hero-state-tag">
        <span className="pip" />
        {data?.tag ?? "Loading…"}
      </div>
      <div className="hero-grid">
        <div>
          <h2 className="hero-headline">{data?.headline ?? "Loading dashboard…"}</h2>
          <p className="hero-sub">{data?.sub ?? ""}</p>
        </div>

        <div className="hero-stat">
          <span className="label">Sprint velocity</span>
          <div className="val">
            {velocity}%
            <span className={"delta" + ((data?.momentumPct ?? 0) < 0 ? " warn" : "")}>
              {(data?.momentumPct ?? 0) >= 0 ? "+" : ""}{data?.momentumPct ?? 0}%
            </span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${velocity}%` }} /></div>
        </div>

        <div className="hero-stat">
          <span className="label">
            {state === "deadline" ? "Blockers" : state === "achievement" ? "Tasks closed" : "This week"}
          </span>
          <div className="val">
            {state === "deadline" ? <>{data?.blockers ?? 0}<span className="delta bad">to clear</span></> :
             state === "achievement" ? <>{data?.completedThisWeek ?? 0}<span className="delta">milestone</span></> :
             <>{data?.completedThisWeek ?? 0}<span className="delta">closed</span></>}
          </div>
          <div className="bar">
            <div className="bar-fill" style={{
              width: state === "deadline" ? "62%" : state === "achievement" ? "100%" : `${Math.min(100, (data?.completedThisWeek ?? 0) * 12)}%`,
              background: state === "deadline" ? "linear-gradient(135deg,#FF6B5C,#F31260)" : undefined,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── For You ────────────────────────────────────────────────────────────────

const FY_PRIO_COLOR: Record<string, string> = { high: "#F31260", med: "#F5A524", low: "#338EF7" };
const FY_TYPE_STYLE: Record<string, string> = { Story: "tt-be", Review: "tt-des", Task: "tt-fe", Bug: "tt-bug", story: "tt-be", task: "tt-fe", bug: "tt-bug" };

function fyPrio(p: string) {
  return p === "urgent" || p === "high" ? "high" : p === "low" ? "low" : "med";
}
function fyFmtDue(iso: string | null): { label: string; red: boolean } {
  if (!iso) return { label: "—", red: false };
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const red = d <= today;
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), red };
}

type FyTabKey = "assigned" | "worked" | "viewed" | "boards";

function TodayFlow() {
  const router = useRouter();
  const { items: myItems, loading } = useMyItems();
  const projects = useProjectStore(s => s.projects);
  const [tab, setTab] = useState<FyTabKey>("assigned");
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mantra_viewed_projects");
      const list: { id: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      setViewedIds(list.map(v => v.id));
    } catch {}
  }, [tab]);

  const assigned = useMemo(() => myItems.map(({ item }) => {
    const { label: due, red: dueRed } = fyFmtDue(item.dueDate);
    const projKey = item.project.key || item.project.name.slice(0, 3).toUpperCase();
    return {
      id:        item.id,
      ref:       `${projKey}-${item.number}`,
      proj:      `${item.project.emoji} ${item.project.name}`,
      projColor: item.project.color,
      projId:    item.project.id,
      title:     item.title,
      type:      item.type.charAt(0).toUpperCase() + item.type.slice(1),
      prio:      fyPrio(item.priority),
      due,
      dueRed,
    };
  }), [myItems]);

  const tabs: { key: FyTabKey; label: string; count?: number }[] = [
    { key: "assigned", label: "Assigned to me", count: assigned.length },
    { key: "worked",   label: "Worked on" },
    { key: "viewed",   label: "Viewed" },
    { key: "boards",   label: "Boards" },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconBolt />For you</div>
      </div>
      <div className="foryou-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={"foryou-tab" + (tab === t.key ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count !== undefined && <span className="foryou-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "assigned" && (
        loading ? (
          <div className="fy-empty">Loading…</div>
        ) : assigned.length === 0 ? (
          <div className="fy-empty">Nothing assigned to you yet.</div>
        ) : (
          <div className="fy-list">
            {assigned.slice(0, 6).map(t => (
              <div key={t.id} className="fy-row" onClick={() => router.push(`/projects/${t.projId}`)}>
                <div className="fy-row-prio" style={{ background: FY_PRIO_COLOR[t.prio] }} />
                <div className="fy-row-body">
                  <div className="fy-row-top">
                    <span className="fy-ref">{t.ref}</span>
                    <span className={"t-tag " + (FY_TYPE_STYLE[t.type] ?? "tt-fe")}>{t.type}</span>
                    <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                  </div>
                  <div className="fy-row-title">{t.title}</div>
                </div>
                <div className="fy-row-right">
                  <span className="pv-prio-chip" style={{ color: FY_PRIO_COLOR[t.prio], background: FY_PRIO_COLOR[t.prio] + "18" }}>
                    {t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}
                  </span>
                  <span className={"fy-row-due" + (t.dueRed ? " red" : "")}>{t.due}</span>
                </div>
              </div>
            ))}
            {assigned.length > 6 && (
              <button className="fy-see-all" onClick={() => router.push("/projects/assigned")}>See all {assigned.length}<IconChevR /></button>
            )}
          </div>
        )
      )}

      {tab === "worked" && (
        loading ? (
          <div className="fy-empty">Loading…</div>
        ) : assigned.length === 0 ? (
          <div className="fy-empty">No recent work yet.</div>
        ) : (
          <div className="fy-list">
            {[...assigned].sort((a, b) => Number(b.ref.split("-")[1] ?? 0) - Number(a.ref.split("-")[1] ?? 0)).slice(0, 6).map(t => (
              <div key={t.id} className="fy-row" onClick={() => router.push(`/projects/${t.projId}`)}>
                <div className="fy-row-prio" style={{ background: FY_PRIO_COLOR[t.prio] }} />
                <div className="fy-row-body">
                  <div className="fy-row-top">
                    <span className="fy-ref">{t.ref}</span>
                    <span className={"t-tag " + (FY_TYPE_STYLE[t.type] ?? "tt-fe")}>{t.type}</span>
                    <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                  </div>
                  <div className="fy-row-title">{t.title}</div>
                </div>
                <div className="fy-row-right">
                  <span className="pv-prio-chip" style={{ color: FY_PRIO_COLOR[t.prio], background: FY_PRIO_COLOR[t.prio] + "18" }}>
                    {t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}
                  </span>
                  <span className={"fy-row-due" + (t.dueRed ? " red" : "")}>{t.due}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "viewed" && (() => {
        const viewedProjects = viewedIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as typeof projects;
        return viewedProjects.length === 0 ? (
          <div className="fy-empty">
            <div className="fy-empty-title">No viewed projects yet</div>
            <div className="fy-empty-sub">Projects you open appear here, most recent first.</div>
          </div>
        ) : (
          <div className="fy-board-grid">
            {viewedProjects.slice(0, 6).map(p => {
              const yourCount = assigned.filter(a => a.projId === p.id).length;
              return (
                <div key={p.id} className="fy-board-tile" onClick={() => router.push(`/projects/${p.id}`)}>
                  <div className="fy-board-emoji" style={{ background: p.color + "22", color: p.color }}>{p.emoji}</div>
                  <div className="fy-board-body">
                    <div className="fy-board-name">{p.name}</div>
                    <div className="fy-board-meta">
                      <span className="fy-ref">{p.key || "—"}</span>
                      <span className={"fy-board-status fy-st-" + p.status}>{p.status}</span>
                      <span className="fy-board-count">{yourCount} yours</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {tab === "boards" && (
        projects.length === 0 ? (
          <div className="fy-empty">
            <div className="fy-empty-title">No boards yet</div>
            <div className="fy-empty-sub">Create a project to see its board here.</div>
          </div>
        ) : (
          <div className="fy-board-grid">
            {projects.slice(0, 6).map(p => {
              const yourCount = assigned.filter(a => a.projId === p.id).length;
              return (
                <div key={p.id} className="fy-board-tile" onClick={() => router.push(`/projects/${p.id}`)}>
                  <div className="fy-board-emoji" style={{ background: p.color + "22", color: p.color }}>{p.emoji}</div>
                  <div className="fy-board-body">
                    <div className="fy-board-name">{p.name}</div>
                    {p.client && <div className="fy-board-client">{p.client}</div>}
                    <div className="fy-board-meta">
                      <span className="fy-ref">{p.key || "—"}</span>
                      <span className={"fy-board-status fy-st-" + p.status}>{p.status}</span>
                      <span className="fy-board-count">{yourCount} yours</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

    </div>
  );
}

// ─── Active Focus ──────────────────────────────────────────────────────────────

type FocusLog = Record<string, number>;
type FocusDaily = Record<string, Record<string, number>>;
type FocusCurrent = { projectId: string; startedAt: number | null; baseSecs: number };

function fmtHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaily(daily: FocusDaily, projectId: string, secs: number): FocusDaily {
  if (secs <= 0) return daily;
  const key = todayKey();
  const day = { ...(daily[key] ?? {}) };
  day[projectId] = (day[projectId] ?? 0) + secs;
  return { ...daily, [key]: day };
}

function ActiveFocus({ data }: { data: ApiDashboard["activeFocus"] | null }) {
  const projects = useProjectStore(s => s.projects);
  const [log, setLog] = useState<FocusLog>({});
  const [, setDaily] = useState<FocusDaily>({});
  const [current, setCurrent] = useState<FocusCurrent | null>(null);
  const [tick, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem("mantra_focus_log");
      const d = localStorage.getItem("mantra_focus_daily");
      const c = localStorage.getItem("mantra_focus_current");
      if (l) setLog(JSON.parse(l));
      if (d) setDaily(JSON.parse(d));
      if (c) setCurrent(JSON.parse(c));
    } catch {}
  }, []);

  useEffect(() => {
    if (!current && data?.projectId) {
      const init: FocusCurrent = { projectId: data.projectId, startedAt: null, baseSecs: 0 };
      setCurrent(init);
      localStorage.setItem("mantra_focus_current", JSON.stringify(init));
    }
  }, [data?.projectId, current]);

  useEffect(() => {
    if (!current?.startedAt) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [current?.startedAt]);

  const running = !!current?.startedAt;
  const elapsedSecs = current
    ? current.baseSecs + (current.startedAt ? Math.floor((Date.now() - current.startedAt) / 1000) : 0)
    : 0;

  const projectName = current
    ? (projects.find(p => p.id === current.projectId)?.name ?? data?.projectName ?? "Project")
    : (data?.projectName ?? "No active project");
  const projectEmoji = projects.find(p => p.id === current?.projectId)?.emoji ?? "";

  const persistAll = (next: FocusCurrent | null, nextLog: FocusLog, elapsedToBank: { projectId: string; secs: number } | null) => {
    setCurrent(next);
    setLog(nextLog);
    if (next) localStorage.setItem("mantra_focus_current", JSON.stringify(next));
    else localStorage.removeItem("mantra_focus_current");
    localStorage.setItem("mantra_focus_log", JSON.stringify(nextLog));
    if (elapsedToBank && elapsedToBank.secs > 0) {
      const raw = localStorage.getItem("mantra_focus_daily");
      const prev: FocusDaily = raw ? JSON.parse(raw) : {};
      const updated = addDaily(prev, elapsedToBank.projectId, elapsedToBank.secs);
      localStorage.setItem("mantra_focus_daily", JSON.stringify(updated));
      setDaily(updated);
      queueMicrotask(() => window.dispatchEvent(new Event("mantra-focus-daily-updated")));
    }
  };

  const toggle = () => {
    if (!current) return;
    if (current.startedAt) {
      const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
      const newBase = current.baseSecs + elapsed;
      const nextLog = { ...log, [current.projectId]: newBase };
      persistAll({ ...current, startedAt: null, baseSecs: newBase }, nextLog, { projectId: current.projectId, secs: elapsed });
    } else {
      persistAll({ ...current, startedAt: Date.now() }, log, null);
    }
  };

  const switchTo = (projectId: string) => {
    setPickerOpen(false);
    if (current && current.projectId === projectId) return;
    let nextLog = log;
    let bank: { projectId: string; secs: number } | null = null;
    if (current) {
      const elapsed = current.startedAt ? Math.floor((Date.now() - current.startedAt) / 1000) : 0;
      const total = current.baseSecs + elapsed;
      nextLog = { ...log, [current.projectId]: total };
      bank = { projectId: current.projectId, secs: elapsed };
    }
    const base = nextLog[projectId] ?? 0;
    persistAll({ projectId, startedAt: Date.now(), baseSecs: base }, nextLog, bank);
  };

  void tick;

  return (
    <div className="focus-card">
      <div>
        <div className="focus-task">Active project</div>
        <div className="focus-task-name">{projectEmoji} {projectName}</div>
      </div>
      <div className="focus-timer">
        {fmtHMS(elapsedSecs)}
        <span className="ms">logged</span>
      </div>
      <div className="focus-pomodoro">
        {[0, 1, 2, 3, 4].map(i => {
          const pomodoroDone = Math.floor(elapsedSecs / (25 * 60));
          const cls = i < pomodoroDone ? "done" : i === pomodoroDone && running ? "now" : "";
          return <i key={i} className={cls} />;
        })}
      </div>
      <div className="focus-actions">
        <button className="focus-btn primary" onClick={toggle} disabled={!current}>
          {running ? <IconPause /> : <IconPlay />}
          {running ? "Pause" : "Start"}
        </button>
        <div style={{ position: "relative", flex: 1 }}>
          <button className="focus-btn" onClick={() => setPickerOpen(o => !o)} style={{ width: "100%" }}>
            Switch project
          </button>
          {pickerOpen && (
            <div className="focus-picker">
              {projects.length === 0 ? (
                <div className="focus-picker-empty">No projects yet</div>
              ) : projects.map(p => {
                const t = log[p.id] ?? 0;
                const active = current?.projectId === p.id;
                return (
                  <button
                    key={p.id}
                    className={"focus-picker-row" + (active ? " active" : "")}
                    onClick={() => switchTo(p.id)}
                  >
                    <span className="focus-picker-name">{p.emoji} {p.name}</span>
                    <span className="focus-picker-time">{t > 0 ? fmtHMS(t) : "—"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="focus-amb">
        <div className="focus-amb-bars"><span/><span/><span/><span/><span/></div>
        {running ? "Logging time" : "Paused — tap Start"}
      </div>
    </div>
  );
}

// ─── Contribution Timeline ─────────────────────────────────────────────────────

const TIMELINE_KIND_ICON: Record<string, React.ComponentType<IconProps>> = {
  recognition: IconAward,
  complete:    IconCheck,
  milestone:   IconFlag,
  skill:       IconStar,
};

function ContributionTimeline({ data }: { data: ApiDashboard["timeline"] | null }) {
  const days = data?.days ?? Array(26).fill(0);
  const events = data?.events ?? [];
  const maxDay = Math.max(1, ...days);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconTimeline />Contribution timeline</div>
        <button className="card-action">View all<IconChevR /></button>
      </div>
      <div className="timeline-wrap">
        <div className="timeline-axis">
          {days.map((l, i) => {
            const level = l === 0 ? 0 : Math.min(4, Math.ceil((l / maxDay) * 4));
            return (
              <div
                key={i}
                className={"timeline-cell" + (level ? " l" + level : "") + (i === days.length - 1 ? " today" : "")}
                title={`Day ${i + 1}: ${l} contributions`}
              />
            );
          })}
        </div>
        <div className="timeline-stream">
          {events.length === 0 ? (
            <div className="t-event" style={{ color: "var(--text-3)", fontSize: 13 }}>
              <div className="t-dot"><IconBolt /></div>
              <div className="t-text">No recent activity yet.</div>
              <div className="t-time">—</div>
            </div>
          ) : events.map((e, i) => {
            const Ico = TIMELINE_KIND_ICON[e.kind] ?? IconBolt;
            return (
              <div key={i} className="t-event">
                <div className={"t-dot " + e.kind}><Ico /></div>
                <div className="t-text">{e.text}</div>
                <div className="t-time">{e.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Workload Heatmap ─────────────────────────────────────────────────────────

const WL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WL_COLS = ["W-3", "W-2", "W-1", "Now", "+1", "+2", "+3", "+4"];

function WorkloadHeatmap({ data }: { data: ApiDashboard["workload"] | null }) {
  const rows = data?.rows ?? Array.from({ length: 5 }, () => Array(8).fill("bal-l"));
  const heavyCount = rows.flat().filter(c => c === "over" || c === "amb").length;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconChart />Workload</div>
        <span className="badge warm">
          {heavyCount === 0 ? "All clear this window" :
           heavyCount > 12 ? "Trending heavy" : `${heavyCount} busy day${heavyCount === 1 ? "" : "s"} ahead`}
        </span>
      </div>
      <div className="heatmap">
        <div />
        {WL_COLS.map(c => <div key={c} className="h-col-label">{c}</div>)}
        {WL_DAYS.map((d, r) => (
          <React.Fragment key={d}>
            <div className="h-row-label">{d}</div>
            {rows[r].map((v, c) => <div key={c} className={"h-cell " + v} />)}
          </React.Fragment>
        ))}
      </div>
      <div className="heatmap-legend">
        <span><i style={{ background: "rgba(23,201,100,0.35)" }} />Balanced</span>
        <span><i style={{ background: "rgba(245,165,36,0.55)" }} />Heavy</span>
        <span><i style={{ background: "rgba(243,18,96,0.55)" }}  />Overloaded</span>
      </div>
    </div>
  );
}

// ─── Team Energy ──────────────────────────────────────────────────────────────

function TeamEnergy({ data }: { data: ApiDashboard["team"] | null }) {
  const members = data ?? [];
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconUsers />Team energy</div>
        <button className="card-action">All teams<IconChevR /></button>
      </div>
      <div className="team-grid">
        {members.length === 0 ? (
          <div style={{ padding: "16px 0", color: "var(--text-3)", fontSize: 13, gridColumn: "1 / -1" }}>
            No teammates yet. Add members to your projects.
          </div>
        ) : members.map((t, i) => (
          <div key={i} className="team-row">
            <div className={"avatar " + t.status} style={{ background: t.color }}>{t.initials}</div>
            <div>
              <div className="team-name">{t.name}</div>
              <div className="team-status">{t.statusText}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Project Snapshots ────────────────────────────────────────────────────────

function Ring({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <div className="ring-wrap">
      <svg width="48" height="48">
        <circle cx="24" cy="24" r={r} className="ring-bg" strokeWidth="4" fill="none" />
        <circle
          cx="24" cy="24" r={r}
          className="ring-fg" strokeWidth="4" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round"
        />
      </svg>
      <div className="ring-pct">{pct}%</div>
    </div>
  );
}

function ProjectSnapshots({ data }: { data: ApiDashboard["snapshots"] | null }) {
  const router = useRouter();
  const projects = data ?? [];
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconBoxes />Project snapshots</div>
        <button className="card-action" onClick={() => router.push("/projects")}>All projects<IconChevR /></button>
      </div>
      <div className="proj-grid">
        {projects.length === 0 ? (
          <div style={{ padding: "16px 0", color: "var(--text-3)", fontSize: 13, gridColumn: "1 / -1" }}>
            No active projects yet.
          </div>
        ) : projects.map((p) => (
          <div key={p.id} className="proj-card" onClick={() => router.push(`/projects/${p.id}`)}>
            <div className="proj-head">
              <div>
                <div className="proj-name">{p.emoji} {p.name}</div>
                <div className="proj-due">{p.due}</div>
              </div>
              <Ring pct={p.pct} />
            </div>
            <div className="proj-meta">
              <span>Sprint <b className={p.health === "good" ? "pulse-good" : "pulse-warn"}>{p.health === "good" ? "Good" : "Tight"}</b></span>
              <span>Budget <b>{p.budget}</b></span>
            </div>
            <div className="proj-foot">
              <div className="avatar-stack">
                {p.avatars.map((a, k) => (
                  <div key={k} className="avatar" style={{ background: a.color }}>{a.initials}</div>
                ))}
              </div>
              <span className={"blockers-pill" + (p.blockers === 0 ? " zero" : "")}>
                {p.blockers === 0 ? "No blockers" : `${p.blockers} blocker${p.blockers > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Journey Pulse ────────────────────────────────────────────────────────────

// ─── Project Wellbeing ────────────────────────────────────────────────────────

function ProjectWellbeing() {
  const projects = useProjectStore(s => s.projects);
  const [daily, setDaily] = useState<FocusDaily>({});
  const [current, setCurrent] = useState<FocusCurrent | null>(null);
  const [, setTick] = useState(0);

  const reload = useCallback(() => {
    try {
      const d = localStorage.getItem("mantra_focus_daily");
      const c = localStorage.getItem("mantra_focus_current");
      setDaily(d ? JSON.parse(d) : {});
      setCurrent(c ? JSON.parse(c) : null);
    } catch {}
  }, []);

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("mantra-focus-daily-updated", onUpdate);
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => {
      window.removeEventListener("mantra-focus-daily-updated", onUpdate);
      clearInterval(id);
    };
  }, [reload]);

  const days: { key: string; label: string; total: number; isToday: boolean }[] = useMemo(() => {
    const arr: { key: string; label: string; total: number; isToday: boolean }[] = [];
    const LBL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayK = todayKey();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = daily[key] ?? {};
      let total = Object.values(day).reduce((a, b) => a + b, 0);
      if (key === todayK && current?.startedAt) {
        total += Math.floor((Date.now() - current.startedAt) / 1000);
      }
      arr.push({ key, label: LBL[d.getDay()], total, isToday: key === todayK });
    }
    return arr;
  }, [daily, current]);

  const max = Math.max(1, ...days.map(d => d.total));
  const todayTotal = days[days.length - 1]?.total ?? 0;
  const todayBuckets = daily[todayKey()] ?? {};
  const todayWithLive: Record<string, number> = { ...todayBuckets };
  if (current?.startedAt) {
    const live = Math.floor((Date.now() - current.startedAt) / 1000);
    todayWithLive[current.projectId] = (todayWithLive[current.projectId] ?? 0) + live;
  }
  const todayList = Object.entries(todayWithLive)
    .map(([id, secs]) => ({
      id,
      secs,
      project: projects.find(p => p.id === id),
    }))
    .filter(r => r.project)
    .sort((a, b) => b.secs - a.secs);

  const fmtMins = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
  };

  return (
    <div className="card wb-card">
      <div className="card-head">
        <div className="card-title"><IconChart />Wellbeing</div>
        <span className="badge">Focus time</span>
      </div>

      <div className="wb-total">
        <div className="wb-total-num">{fmtMins(todayTotal)}</div>
        <div className="wb-total-sub">today across projects</div>
      </div>

      <div className="wb-bars">
        {days.map(d => {
          const h = Math.max(2, Math.round((d.total / max) * 80));
          return (
            <div key={d.key} className="wb-bar-col">
              <div className="wb-bar-track">
                <div className={"wb-bar-fill" + (d.isToday ? " today" : "")} style={{ height: `${h}px` }} />
              </div>
              <div className={"wb-bar-label" + (d.isToday ? " today" : "")}>{d.label}</div>
            </div>
          );
        })}
      </div>

      <div className="wb-list">
        {todayList.length === 0 ? (
          <div className="wb-empty">No time logged today. Tap Start above to begin.</div>
        ) : todayList.slice(0, 4).map(r => {
          const pct = todayTotal > 0 ? Math.round((r.secs / todayTotal) * 100) : 0;
          return (
            <div key={r.id} className="wb-row">
              <div className="wb-row-icon" style={{ background: (r.project!.color) + "22", color: r.project!.color }}>
                {r.project!.emoji}
              </div>
              <div className="wb-row-body">
                <div className="wb-row-name">{r.project!.name}</div>
                <div className="wb-row-bar">
                  <div className="wb-row-bar-fill" style={{ width: `${pct}%`, background: r.project!.color }} />
                </div>
              </div>
              <div className="wb-row-time">{fmtMins(r.secs)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JourneyPulse({ data: journeyData }: { data: ApiDashboard["journey"] | null }) {
  const [range, setRange] = useState<"week" | "month" | "year">("week");
  const data = journeyData?.[range] ?? [1, 1, 1, 1, 1, 1, 1, 1];
  const W = 520, H = 96, pad = 6;
  const max = Math.max(...data);
  const stepX = (W - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: pad + i * stepX,
    y: H - pad - (v / max) * (H - pad * 2),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPath =
    `M${pad},${H - pad} ` +
    pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${pts[pts.length - 1].x.toFixed(1)},${H - pad} Z`;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconLeaf />Journey pulse</div>
        <div className="pulse-tabs">
          {(["week", "month", "year"] as const).map(r => (
            <button key={r} className={"pulse-tab" + (range === r ? " active" : "")} onClick={() => setRange(r)}>
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="pulse-wrap">
        <div className="pulse-graph">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="pulseStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B5C" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#F5A524" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#pulseGrad)" />
            <path d={linePath} fill="none" stroke="url(#pulseStroke)" strokeWidth="2" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 0} fill="#F97316" />
            ))}
          </svg>
        </div>
        <div className="pulse-meta">
          <div>
            <div className="big">+24%</div>
            <div style={{ marginTop: 4 }}>vs last {range}</div>
          </div>
          <div>Consistency · <b style={{ color: "var(--text)" }}>9 of 14 days</b></div>
        </div>
      </div>
    </div>
  );
}

// ─── Cmd+K ────────────────────────────────────────────────────────────────────

interface CmdItem {
  sec: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
  sk?: string;
}

const CMD_ALL: CmdItem[] = [
  { sec: "Actions", label: "Create task",         Icon: IconPlus,     sk: "T" },
  { sec: "Actions", label: "Log time",             Icon: IconLogTime,  sk: "L" },
  { sec: "Actions", label: "Start focus timer",    Icon: IconPlay,     sk: "F" },
  { sec: "Actions", label: "Request leave",        Icon: IconCalendar, sk: "R" },
  { sec: "Jump to", label: "RetailOS — project",   Icon: IconBoxes              },
  { sec: "Jump to", label: "Mantra Mobile — project", Icon: IconBoxes           },
  { sec: "Jump to", label: "Today flow",           Icon: IconBolt               },
  { sec: "People",  label: "Rakesh M.",            Icon: IconUsers              },
  { sec: "People",  label: "Sana K.",              Icon: IconUsers              },
];

function CmdK({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ(""); setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = q
    ? CMD_ALL.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
    : CMD_ALL;

  const sections = filtered.reduce<Record<string, CmdItem[]>>((m, c) => {
    (m[c.sec] = m[c.sec] || []).push(c); return m;
  }, {});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")    onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(a => Math.min(filtered.length - 1, a + 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(a => Math.max(0, a - 1)); }
      if (e.key === "Enter")     onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered.length, onClose]);

  if (!open) return null;
  let idx = 0;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="Type a command, person, project…"
          value={q}
          onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
        />
        <div className="cmd-list">
          {Object.entries(sections).map(([sec, rows]) => (
            <div key={sec}>
              <div className="cmd-section">{sec}</div>
              {rows.map(r => {
                const myIdx = idx++;
                return (
                  <div
                    key={r.label}
                    className="cmd-row"
                    data-active={myIdx === activeIdx ? "true" : "false"}
                    onMouseEnter={() => setActiveIdx(myIdx)}
                    onClick={onClose}
                  >
                    <div className="cmd-ico"><r.Icon /></div>
                    <div className="cmd-label">{r.label}</div>
                    <div className="cmd-shortcut">{r.sk ? "⌘ " + r.sk : "↵"}</div>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "24px 14px", color: "var(--text-3)", fontSize: 13 }}>
              No matches for &ldquo;{q}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tweaks hook + panel ──────────────────────────────────────────────────────

type TweakDefaults = {
  theme: "light" | "dark";
  mode: string;
  density: "spacious" | "balanced" | "dense";
  showJourneyPulse: boolean;
  showTeam: boolean;
  showWorkload: boolean;
};

const TWEAK_DEFAULTS: TweakDefaults = {
  theme: "light",
  mode: "planning",
  density: "balanced",
  showJourneyPulse: true,
  showTeam: true,
  showWorkload: true,
};

function useTweaks<T extends Record<string, unknown>>(defaults: T): [T, (key: keyof T, val: T[keyof T]) => void] {
  const [values, setValues] = useState<T>(defaults);
  const setTweak = useCallback((key: keyof T, val: T[keyof T]) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);
  return [values, setTweak];
}

const TWEAK_CSS = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:9999;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.88);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none;
    border-bottom:.5px solid rgba(0,0,0,.08)}
  .twk-hd b{font-size:12px;font-weight:600}
  .twk-x{background:transparent;border:0;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px}
  .twk-x:hover{background:rgba(0,0,0,.06)}
  .twk-body{padding:4px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;min-height:0}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:6px}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{font-size:11px;font-weight:500;color:rgba(41,38,27,.72)}
  .twk-seg{display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06)}
  .twk-seg button{flex:1;border:0;background:transparent;color:inherit;font:inherit;
    font-size:11px;font-weight:500;padding:4px 6px;border-radius:6px;cursor:pointer}
  .twk-seg button.on{background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12)}
  .twk-field{width:100%;height:26px;padding:0 8px;border:.5px solid rgba(0,0,0,.1);
    border-radius:7px;background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center;padding-right:22px;
    appearance:none}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:pointer;padding:0;flex-shrink:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
`;

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
  t: TweakDefaults;
  setTweak: (key: keyof TweakDefaults, val: TweakDefaults[keyof TweakDefaults]) => void;
}

function TweaksPanel({ open, onClose, t, setTweak }: TweaksPanelProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ r: 16, b: 16 });

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startR = window.innerWidth - rect.right;
    const startB = window.innerHeight - rect.bottom;
    const move = (ev: MouseEvent) => {
      posRef.current = {
        r: Math.max(8, startR - (ev.clientX - sx)),
        b: Math.max(8, startB - (ev.clientY - sy)),
      };
      if (panel) {
        panel.style.right = posRef.current.r + "px";
        panel.style.bottom = posRef.current.b + "px";
      }
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!open) return null;
  return (
    <>
      <style>{TWEAK_CSS}</style>
      <div ref={dragRef} className="twk-panel" style={{ right: posRef.current.r, bottom: posRef.current.b }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>Tweaks</b>
          <button className="twk-x" onClick={onClose}>✕</button>
        </div>
        <div className="twk-body">
          <div className="twk-sect">Atmosphere</div>

          <div className="twk-row">
            <div className="twk-lbl">Theme</div>
            <div className="twk-seg">
              {(["light", "dark"] as const).map(v => (
                <button key={v} className={t.theme === v ? "on" : ""} onClick={() => setTweak("theme", v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="twk-row">
            <div className="twk-lbl">Mode</div>
            <select className="twk-field" value={t.mode} onChange={e => setTweak("mode", e.target.value)}>
              <option value="planning">Planning — sprint overview</option>
              <option value="focus">Focus — deep work only</option>
              <option value="reflection">Reflection — growth &amp; journey</option>
            </select>
          </div>

          <div className="twk-row">
            <div className="twk-lbl">Density</div>
            <div className="twk-seg">
              {(["spacious", "balanced", "dense"] as const).map(v => (
                <button key={v} className={t.density === v ? "on" : ""} onClick={() => setTweak("density", v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="twk-sect">Modules</div>
          {([
            ["showTeam",         "Team energy"],
            ["showWorkload",     "Workload"],
            ["showJourneyPulse", "Journey pulse"],
          ] as [keyof TweakDefaults, string][]).map(([key, label]) => (
            <div key={key} className="twk-row twk-row-h">
              <div className="twk-lbl">{label}</div>
              <button
                className="twk-toggle"
                data-on={t[key] ? "1" : "0"}
                onClick={() => setTweak(key, !t[key] as TweakDefaults[typeof key])}
              ><i /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter();
  const authUser = useAuthStore(s => s.user);
  const projects = useProjectStore(s => s.projects);
  const activeCount = projects.filter(p => p.status === "active").length;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { data: dash } = useDashboard();

  const isReflection = t.mode === "reflection";
  const isFocus      = t.mode === "focus";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setTweaksOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCmdClose = useCallback(() => setCmdOpen(false), []);

  return (
    <div className="dashboard-root" data-theme={t.theme} data-density={t.density}>
      <div className="app-bg" />
      <div className="app">
        <OGSidebar />
        <div className="main">
          <Topbar mode={t.mode} onCmdK={() => setCmdOpen(true)} userName={authUser?.name ?? "..."} activeCount={activeCount} />
          <div className="canvas">
            {/* Left column */}
            <div className="col">
              {!isFocus && <Hero data={dash?.hero ?? null} />}
              <TodayFlow />
              {!isFocus && <ContributionTimeline data={dash?.timeline ?? null} />}
              {!isFocus && t.showWorkload && <WorkloadHeatmap data={dash?.workload ?? null} />}
              {!isFocus && isReflection && t.showJourneyPulse && <JourneyPulse data={dash?.journey ?? null} />}
              {!isFocus && t.showTeam && <TeamEnergy data={dash?.team ?? null} />}
            </div>
            {/* Right column */}
            <div className="col">
              <ActiveFocus data={dash?.activeFocus ?? null} />
              {!isFocus && <ProjectWellbeing />}
              {!isFocus && !isReflection && t.showJourneyPulse && <JourneyPulse data={dash?.journey ?? null} />}
              {!isFocus && <ProjectSnapshots data={dash?.snapshots ?? null} />}
            </div>
          </div>
        </div>
      </div>

      <CmdK open={cmdOpen} onClose={handleCmdClose} />
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} t={t} setTweak={setTweak} />
    </div>
  );
}
