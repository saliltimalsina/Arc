"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar from "@/components/ProjectsListSidebar";

// ─── Icons ────────────────────────────────────────────────────────────────────

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}

const IBell   = mk(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
const IPlus   = mk(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IChevR  = mk(<path d="m9 6 6 6-6 6"/>);
const IFilter = mk(<><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></>);
const ISearch = mk(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
const IGrid   = mk(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);
const IList   = mk(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>);

// ─── Topbar ───────────────────────────────────────────────────────────────────

function ProjectsTopbar({ view, onView }: { view: string; onView: (v: string) => void }) {
  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        <strong>Projects</strong>
      </div>
      <div className="proj-topbar-right">
        <div className="pl-view-toggle">
          <button className={"pl-view-btn" + (view === "grid" ? " active" : "")} onClick={() => onView("grid")}>
            <IGrid style={{ width: 13, height: 13 }} />
          </button>
          <button className={"pl-view-btn" + (view === "list" ? " active" : "")} onClick={() => onView("list")}>
            <IList style={{ width: 13, height: 13 }} />
          </button>
        </div>
        <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
        <div className="proj-search-box">
          <ISearch />
          <span>Search projects…</span>
          <span className="kbd">⌘K</span>
        </div>
        <button className="proj-icon-btn" title="Notifications">
          <IBell />
          <span className="ping" />
        </button>
        <button className="proj-btn-primary">
          <IPlus /> New project
        </button>
      </div>
    </div>
  );
}

// ─── My Projects Grid ─────────────────────────────────────────────────────────

const MY_PROJECTS = [
  { id: "1", name: "Nova Banking App",   emoji: "🪐", color: "#338EF7", pct: 68, due: "4 days",  health: "On track", budget: "Healthy",   blockers: 2, avatars: ["AS","RK","MP","JL"], sprint: "Sprint 14" },
  { id: "2", name: "RetailOS",           emoji: "🏪", color: "#F97316", pct: 78, due: "11 days", health: "On track", budget: "Healthy",   blockers: 2, avatars: ["RM","SK","DP"],      sprint: "Sprint 11" },
  { id: "3", name: "Mantra Mobile",      emoji: "📱", color: "#9353D3", pct: 42, due: "38 days", health: "On track", budget: "Healthy",   blockers: 0, avatars: ["MJ","AR"],            sprint: "Sprint 6"  },
  { id: "4", name: "Notifications v2",   emoji: "🔔", color: "#17C964", pct: 91, due: "4 days",  health: "At risk",  budget: "On edge",   blockers: 1, avatars: ["SK","TV","DP"],       sprint: "Sprint 11" },
  { id: "5", name: "Onboarding Refresh", emoji: "👋", color: "#F5A524", pct: 23, due: "56 days", health: "On track", budget: "Healthy",   blockers: 0, avatars: ["MJ","AR","DP"],       sprint: "Sprint 4"  },
];

const AV_COLORS = ["#338EF7","#F97316","#9353D3","#17C964","#F31260","#F5A524","#FF6B5C","#06B7DB"];

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <div className="proj-ring">
      <svg width="48" height="48">
        <circle cx="24" cy="24" r={r} strokeWidth="4" fill="none" stroke="var(--proj-line-strong)" />
        <circle cx="24" cy="24" r={r} strokeWidth="4" fill="none"
          stroke={color} strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <span className="proj-ring-pct">{pct}%</span>
    </div>
  );
}

function MyProjectsSection({ view, onOpen }: { view: string; onOpen: (id: string) => void }) {
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">My projects</span>
        <span className="pl-section-count">{MY_PROJECTS.length}</span>
        <button className="pl-section-link" onClick={() => {}}>View all <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>

      {view === "grid" ? (
        <div className="pl-proj-grid">
          {MY_PROJECTS.map((p, i) => (
            <div key={p.id} className="pl-proj-card" onClick={() => onOpen(p.id)}>
              <div className="pl-proj-card-top">
                <div className="pl-proj-emoji" style={{ background: p.color + "18" }}>{p.emoji}</div>
                <Ring pct={p.pct} color={p.color} />
              </div>
              <div className="pl-proj-name">{p.name}</div>
              <div className="pl-proj-sprint">{p.sprint}</div>
              <div className="pl-proj-due">
                <span className="pl-health-dot" style={{ background: p.health === "At risk" ? "#F31260" : "#17C964" }} />
                {p.health} · due in {p.due}
              </div>
              <div className="pl-proj-foot">
                <div className="pl-proj-avs">
                  {p.avatars.slice(0, 3).map((av, k) => (
                    <div key={k} className="pl-proj-av" style={{ background: AV_COLORS[(i + k) % AV_COLORS.length] }}>{av.slice(0, 2)}</div>
                  ))}
                  {p.avatars.length > 3 && <div className="pl-proj-av pl-proj-av-more">+{p.avatars.length - 3}</div>}
                </div>
                <span className={"pl-blockers" + (p.blockers === 0 ? " zero" : "")}>
                  {p.blockers === 0 ? "Clear" : `${p.blockers} blocker${p.blockers > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          ))}
          <button className="pl-proj-card pl-proj-card-new" onClick={() => {}}>
            <IPlus style={{ width: 20, height: 20, color: "var(--proj-text-4)" }} />
            <span>New project</span>
          </button>
        </div>
      ) : (
        <div className="pl-proj-list">
          {MY_PROJECTS.map((p, i) => (
            <div key={p.id} className="pl-proj-row" onClick={() => onOpen(p.id)}>
              <span className="pl-proj-row-emoji" style={{ background: p.color + "18" }}>{p.emoji}</span>
              <div className="pl-proj-row-info">
                <span className="pl-proj-row-name">{p.name}</span>
                <span className="pl-proj-row-meta">{p.sprint} · due in {p.due}</span>
              </div>
              <span className="pl-health-dot" style={{ background: p.health === "At risk" ? "#F31260" : "#17C964", marginRight: 6 }} />
              <span className="pl-proj-row-pct" style={{ color: p.color }}>{p.pct}%</span>
              <div className="pl-proj-avs" style={{ marginLeft: 12 }}>
                {p.avatars.slice(0, 3).map((av, k) => (
                  <div key={k} className="pl-proj-av" style={{ background: AV_COLORS[(i + k) % AV_COLORS.length] }}>{av.slice(0, 2)}</div>
                ))}
              </div>
              <IChevR style={{ width: 14, height: 14, color: "var(--proj-text-4)", marginLeft: 8 }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── My Work ──────────────────────────────────────────────────────────────────

const MY_WORK = [
  { prio: "high", proj: "🪐 Nova Banking",  id: "NB-218", title: "Auth refactor — refresh token logic",    due: "Today",  dueRed: true  },
  { prio: "high", proj: "🏪 RetailOS",       id: "RT-482", title: "API permission layer review",             due: "Today",  dueRed: true  },
  { prio: "med",  proj: "🪐 Nova Banking",  id: "NB-220", title: "Session persistence — pair with Rakesh",  due: "May 12", dueRed: false },
  { prio: "med",  proj: "🔔 Notifications", id: "NT-91",  title: "Push delivery reliability fix",           due: "May 13", dueRed: false },
  { prio: "low",  proj: "👋 Onboarding",    id: "OB-45",  title: "Onboarding copy final review",            due: "May 14", dueRed: false },
];

const PRIO_COLOR: Record<string, string> = { high: "#F31260", med: "#F5A524", low: "#338EF7" };

function MyWorkSection() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">My work</span>
        <span className="pl-section-count">{MY_WORK.length}</span>
        <button className="pl-section-link">All tasks <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>
      <div className="pl-work-list">
        {MY_WORK.map((t, i) => (
          <div key={i} className={"pl-work-row" + (checked[i] ? " done" : "")} onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
            <div className="pl-work-prio" style={{ background: PRIO_COLOR[t.prio] }} />
            <div className={"pl-work-check" + (checked[i] ? " on" : "")}>
              {checked[i] && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div className="pl-work-content">
              <div className="pl-work-meta">
                <span className="pl-work-proj">{t.proj}</span>
                <span className="pl-work-id">{t.id}</span>
                {t.dueRed && <span className="pl-work-due-red">{t.due}</span>}
              </div>
              <div className={"pl-work-title" + (checked[i] ? " struck" : "")}>{t.title}</div>
              {!t.dueRed && <div className="pl-work-due">{t.due}</div>}
            </div>
            <IChevR style={{ width: 13, height: 13, color: "var(--proj-text-4)", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

const ACTIVITY = [
  { av: "#F97316", init: "RK", name: "Rakesh",  action: "completed Auth API setup in Nova Banking",  extra: "+50 XP", time: "12m" },
  { av: "#9353D3", init: "MP", name: "Mira",    action: "opened a PR on Round-up calc",              extra: "",       time: "38m" },
  { av: "#338EF7", init: "JL", name: "Jaya",    action: "uploaded Onboarding final.fig",             extra: "",       time: "1h"  },
  { av: "#F31260", init: "DT", name: "Dev",     action: 'kudosed Mira — “great edge case”',  extra: "",       time: "2h"  },
  { av: "#17C964", init: "LP", name: "Lakshmi", action: "closed Wire transfer error states",         extra: "",       time: "4h"  },
];

function ActivitySection() {
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">Recent activity</span>
        <button className="pl-section-link">All activity <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>
      <div className="pl-activity-list">
        {ACTIVITY.map((a, i) => (
          <div key={i} className="pl-activity-row">
            <div className="pl-activity-av" style={{ background: a.av }}>{a.init}</div>
            <div className="pl-activity-text">
              <strong>{a.name}</strong> {a.action}
              {a.extra && <span className="pl-activity-xp">{a.extra}</span>}
            </div>
            <div className="pl-activity-time">{a.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow() {
  const stats = [
    { label: "Active projects", val: "5",   delta: "+1 this month",  good: true  },
    { label: "Open tasks",      val: "34",  delta: "8 due this week", good: false },
    { label: "In review",       val: "7",   delta: "2 need action",  good: false },
    { label: "Completed",       val: "89",  delta: "+11 vs last sprint", good: true },
    { label: "Blockers",        val: "3",   delta: "across 2 projects", good: false },
    { label: "Team members",    val: "9",   delta: "6 active today",  good: true  },
  ];
  return (
    <div className="pl-stats-row">
      {stats.map((s, i) => (
        <div key={i} className="pl-stat">
          <div className="pl-stat-label">{s.label}</div>
          <div className="pl-stat-val">{s.val}</div>
          <div className={"pl-stat-delta" + (s.good ? " good" : "")}>{s.delta}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("1");
  const [view, setView] = useState<"grid" | "list">("grid");

  const handleOpenProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  return (
    <div className="proj-shell" data-theme="light">
      <OGSidebar />
      <ProjectsListSidebar
        selected={selected}
        onSelect={(id) => { setSelected(id); handleOpenProject(id); }}
      />

      <div className="proj-workspace">
        <ProjectsTopbar view={view} onView={(v) => setView(v as "grid" | "list")} />

        <div className="pl-canvas">
          <StatsRow />
          <MyProjectsSection view={view} onOpen={handleOpenProject} />
          <div className="pl-two-col">
            <MyWorkSection />
            <ActivitySection />
          </div>
        </div>
      </div>
    </div>
  );
}
