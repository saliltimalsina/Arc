"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar, { ALL_PROJECTS } from "@/components/ProjectsListSidebar";

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
const ICheck  = mk(<polyline points="20 6 9 17 4 12"/>);
const IExtR   = mk(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>);

type CanvasView = "home" | "my-work" | "my-tasks" | "assigned";

// ─── Topbar ───────────────────────────────────────────────────────────────────

function ProjectsTopbar({
  view, onView, canvasView, selectedProject,
}: {
  view: string; onView: (v: string) => void;
  canvasView: CanvasView; selectedProject?: { name: string; color: string };
}) {
  const titles: Record<CanvasView, string> = {
    home: "Projects",
    "my-work": "My Work",
    "my-tasks": "My Tasks",
    assigned: "Assigned to me",
  };

  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        {canvasView !== "home" && (
          <><span style={{ color: "var(--proj-text-3)", cursor: "pointer" }}>Projects</span><IChevR /></>
        )}
        {selectedProject && canvasView === "home" && (
          <><span style={{ color: "var(--proj-text-3)" }}>Projects</span><IChevR /></>
        )}
        <strong>{selectedProject && canvasView === "home" ? selectedProject.name : titles[canvasView]}</strong>
        {selectedProject && canvasView === "home" && (
          <span className="pl-sb-dot" style={{ background: selectedProject.color, marginLeft: 4 }} />
        )}
      </div>
      <div className="proj-topbar-right">
        {canvasView === "home" && (
          <>
            <div className="pl-view-toggle">
              <button className={"pl-view-btn" + (view === "grid" ? " active" : "")} onClick={() => onView("grid")}><IGrid style={{ width: 13, height: 13 }} /></button>
              <button className={"pl-view-btn" + (view === "list" ? " active" : "")} onClick={() => onView("list")}><IList style={{ width: 13, height: 13 }} /></button>
            </div>
            <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
          </>
        )}
        <div className="proj-search-box">
          <ISearch />
          <span>Search projects…</span>
          <span className="kbd">⌘K</span>
        </div>
        <button className="proj-icon-btn" title="Notifications"><IBell /><span className="ping" /></button>
        <button className="proj-btn-primary"><IPlus /> {canvasView === "home" ? "New project" : "Add task"}</button>
      </div>
    </div>
  );
}

// ─── My Projects Grid ─────────────────────────────────────────────────────────

const MY_PROJECTS = [
  { id: "1", name: "Nova Banking App",   emoji: "🪐", color: "#338EF7", pct: 68, due: "4 days",  health: "On track", blockers: 2, avatars: ["AS","RK","MP","JL"], sprint: "Sprint 14" },
  { id: "2", name: "RetailOS",           emoji: "🏪", color: "#F97316", pct: 78, due: "11 days", health: "On track", blockers: 2, avatars: ["RM","SK","DP"],      sprint: "Sprint 11" },
  { id: "3", name: "Mantra Mobile",      emoji: "📱", color: "#9353D3", pct: 42, due: "38 days", health: "On track", blockers: 0, avatars: ["MJ","AR"],            sprint: "Sprint 6"  },
  { id: "4", name: "Notifications v2",   emoji: "🔔", color: "#17C964", pct: 91, due: "4 days",  health: "At risk",  blockers: 1, avatars: ["SK","TV","DP"],       sprint: "Sprint 11" },
  { id: "5", name: "Onboarding Refresh", emoji: "👋", color: "#F5A524", pct: 23, due: "56 days", health: "On track", blockers: 0, avatars: ["MJ","AR","DP"],       sprint: "Sprint 4"  },
];

const AV_COLORS = ["#338EF7","#F97316","#9353D3","#17C964","#F31260","#F5A524","#FF6B5C","#06B7DB"];

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <div className="proj-ring">
      <svg width="48" height="48">
        <circle cx="24" cy="24" r={r} strokeWidth="4" fill="none" stroke="var(--proj-line-strong)" />
        <circle cx="24" cy="24" r={r} strokeWidth="4" fill="none" stroke={color}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
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
        <button className="pl-section-link">View all <IChevR style={{ width: 12, height: 12 }} /></button>
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
          <button className="pl-proj-card pl-proj-card-new">
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

// ─── Activity Feed ────────────────────────────────────────────────────────────

const ACTIVITY = [
  { av: "#F97316", init: "RK", name: "Rakesh",  action: "completed Auth API setup in Nova Banking",  extra: "+50 XP", time: "12m" },
  { av: "#9353D3", init: "MP", name: "Mira",    action: "opened a PR on Round-up calc",              extra: "",       time: "38m" },
  { av: "#338EF7", init: "JL", name: "Jaya",    action: "uploaded Onboarding final.fig",             extra: "",       time: "1h"  },
  { av: "#F31260", init: "DT", name: "Dev",     action: 'kudosed Mira — "great edge case"',          extra: "",       time: "2h"  },
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
    { label: "Active projects", val: "5",  delta: "+1 this month",      good: true  },
    { label: "Open tasks",      val: "34", delta: "8 due this week",    good: false },
    { label: "In review",       val: "7",  delta: "2 need action",      good: false },
    { label: "Completed",       val: "89", delta: "+11 vs last sprint", good: true  },
    { label: "Blockers",        val: "3",  delta: "across 2 projects",  good: false },
    { label: "Team members",    val: "9",  delta: "6 active today",     good: true  },
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

// ─── My Work View ─────────────────────────────────────────────────────────────

const MY_WORK_ALL = [
  { prio: "high", proj: "🪐 Nova Banking",   projColor: "#338EF7", id: "NB-218", title: "Auth refactor — refresh token logic",         due: "Today",  dueRed: true,  type: "Story"  },
  { prio: "high", proj: "🏪 RetailOS",        projColor: "#F97316", id: "RT-482", title: "API permission layer review",                  due: "Today",  dueRed: true,  type: "Review" },
  { prio: "med",  proj: "🪐 Nova Banking",   projColor: "#338EF7", id: "NB-220", title: "Session persistence — pair with Rakesh",       due: "May 12", dueRed: false, type: "Task"   },
  { prio: "med",  proj: "🔔 Notifications",  projColor: "#17C964", id: "NT-91",  title: "Push delivery reliability fix",                due: "May 13", dueRed: false, type: "Bug"    },
  { prio: "low",  proj: "👋 Onboarding",     projColor: "#F5A524", id: "OB-45",  title: "Onboarding copy final review",                 due: "May 14", dueRed: false, type: "Task"   },
];

const PRIO_COLOR: Record<string, string> = { high: "#F31260", med: "#F5A524", low: "#338EF7" };
const TYPE_STYLE: Record<string, string> = { Story: "tt-be", Review: "tt-des", Task: "tt-fe", Bug: "tt-bug" };

const WORK_FILTERS = ["All", "Today", "This week", "Overdue"];

function MyWorkView({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState("All");

  const items = MY_WORK_ALL.filter(t => {
    if (filter === "Today") return t.dueRed;
    if (filter === "Overdue") return t.dueRed;
    return true;
  });

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">My Work</h1>
          <span className="pl-section-count">{MY_WORK_ALL.length}</span>
        </div>
        <div className="pv-header-right">
          <div className="pv-filter-group">
            {WORK_FILTERS.map(f => (
              <button key={f} className={"pv-filter-btn" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <button className="proj-btn-primary" style={{ height: 32, fontSize: 12 }}><IPlus style={{ width: 13, height: 13 }} /> Add task</button>
        </div>
      </div>

      <div className="pv-summary-row">
        <div className="pv-summary-chip pv-chip-red"><span>{MY_WORK_ALL.filter(t => t.dueRed).length}</span> due today</div>
        <div className="pv-summary-chip pv-chip-amber"><span>2</span> in review</div>
        <div className="pv-summary-chip pv-chip-green"><span>2</span> on track</div>
      </div>

      <div className="pv-task-list">
        {items.map((t, i) => (
          <div key={i} className={"pv-task-row" + (checked[i] ? " done" : "")}>
            <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
            <button
              className={"pv-checkbox" + (checked[i] ? " on" : "")}
              onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}
            >
              {checked[i] && <ICheck style={{ width: 10, height: 10, stroke: "white", strokeWidth: 3 }} />}
            </button>
            <div className="pv-task-body">
              <div className="pv-task-meta">
                <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                <span className="pv-id-tag">{t.id}</span>
                <span className={"t-tag " + TYPE_STYLE[t.type]}>{t.type}</span>
              </div>
              <div className={"pv-task-title" + (checked[i] ? " struck" : "")}>{t.title}</div>
            </div>
            <div className={"pv-due" + (t.dueRed ? " red" : "")}>{t.due}</div>
            <button className="pv-open-btn"><IExtR style={{ width: 13, height: 13 }} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── My Tasks View ────────────────────────────────────────────────────────────

const MY_TASKS_DATA = [
  { id: "NB-218", proj: "🪐 Nova Banking",  projColor: "#338EF7", title: "Auth refactor — refresh token logic",         status: "in-progress", prio: "high", due: "Today"  },
  { id: "RT-482", proj: "🏪 RetailOS",       projColor: "#F97316", title: "API permission layer review",                  status: "in-progress", prio: "high", due: "Today"  },
  { id: "NB-220", proj: "🪐 Nova Banking",  projColor: "#338EF7", title: "Session persistence — pair with Rakesh",       status: "todo",        prio: "med",  due: "May 12" },
  { id: "NT-91",  proj: "🔔 Notifications", projColor: "#17C964", title: "Push delivery reliability fix",                status: "todo",        prio: "med",  due: "May 13" },
  { id: "OB-45",  proj: "👋 Onboarding",    projColor: "#F5A524", title: "Onboarding copy final review",                 status: "todo",        prio: "low",  due: "May 14" },
  { id: "MM-34",  proj: "📱 Mantra Mobile", projColor: "#9353D3", title: "Dark mode polish pass",                        status: "todo",        prio: "low",  due: "May 20" },
  { id: "NB-201", proj: "🪐 Nova Banking",  projColor: "#338EF7", title: "Refresh token rotation",                       status: "done",        prio: "high", due: "May 8"  },
  { id: "NB-202", proj: "🪐 Nova Banking",  projColor: "#338EF7", title: "Revoke session on logout everywhere",          status: "done",        prio: "med",  due: "May 9"  },
];

const STATUS_META: Record<string, { label: string; dot: string }> = {
  "in-progress": { label: "In Progress", dot: "#338EF7" },
  "todo":        { label: "To Do",       dot: "#9A9FAB" },
  "done":        { label: "Done",        dot: "#17C964" },
};

function MyTasksView() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const groups = ["in-progress", "todo", "done"] as const;

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">My Tasks</h1>
          <span className="pl-section-count">{MY_TASKS_DATA.length}</span>
        </div>
        <div className="pv-header-right">
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
          <button className="proj-btn-primary" style={{ height: 32, fontSize: 12 }}><IPlus style={{ width: 13, height: 13 }} /> New task</button>
        </div>
      </div>

      {groups.map(status => {
        const items = MY_TASKS_DATA.filter(t => t.status === status);
        if (!items.length) return null;
        const meta = STATUS_META[status];
        return (
          <div key={status} className="pv-group">
            <div className="pv-group-head">
              <span className="pv-group-dot" style={{ background: meta.dot }} />
              <span className="pv-group-label">{meta.label}</span>
              <span className="pv-group-count">{items.length}</span>
            </div>
            <div className="pv-task-list">
              {items.map((t, i) => {
                const key = t.id;
                const done = checked[key];
                return (
                  <div key={key} className={"pv-task-row" + (done ? " done" : "")}>
                    <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
                    <button className={"pv-checkbox" + (done ? " on" : "")} onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}>
                      {done && <ICheck style={{ width: 10, height: 10, stroke: "white", strokeWidth: 3 }} />}
                    </button>
                    <div className="pv-task-body">
                      <div className="pv-task-meta">
                        <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                        <span className="pv-id-tag">{t.id}</span>
                      </div>
                      <div className={"pv-task-title" + (done ? " struck" : "")}>{t.title}</div>
                    </div>
                    <div className={"pv-due" + (t.due === "Today" ? " red" : "")}>{t.due}</div>
                    <button className="pv-open-btn"><IExtR style={{ width: 13, height: 13 }} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Assigned to Me View ──────────────────────────────────────────────────────

const ASSIGNED_DATA = [
  { id: "NB-221", proj: "🪐 Nova Banking",   projColor: "#338EF7", title: "Round-up calc — edge cases review",          by: "Mira",    byColor: "#9353D3", byInit: "MP", prio: "high", due: "Today",  type: "Review" },
  { id: "RT-495", proj: "🏪 RetailOS",        projColor: "#F97316", title: "Integration test failures — investigate",    by: "Rakesh",  byColor: "#F97316", byInit: "RK", prio: "high", due: "Today",  type: "Bug"    },
  { id: "NB-215", proj: "🪐 Nova Banking",   projColor: "#338EF7", title: "Code review — biometric fallback",           by: "Dev",     byColor: "#F31260", byInit: "DT", prio: "med",  due: "May 12", type: "Review" },
  { id: "MM-28",  proj: "📱 Mantra Mobile",  projColor: "#9353D3", title: "UX feedback pass on notifications",          by: "Jaya",    byColor: "#338EF7", byInit: "JL", prio: "med",  due: "May 13", type: "Task"   },
  { id: "NT-88",  proj: "🔔 Notifications",  projColor: "#17C964", title: "Test push on iOS 17.4 devices",              by: "Lakshmi", byColor: "#17C964", byInit: "LP", prio: "med",  due: "May 13", type: "Task"   },
  { id: "OB-44",  proj: "👋 Onboarding",     projColor: "#F5A524", title: "Legal copy signoff — terms v3",              by: "Dev",     byColor: "#F31260", byInit: "DT", prio: "low",  due: "May 15", type: "Task"   },
  { id: "MM-31",  proj: "📱 Mantra Mobile",  projColor: "#9353D3", title: "Accessibility audit items",                  by: "Jaya",    byColor: "#338EF7", byInit: "JL", prio: "low",  due: "May 17", type: "Task"   },
  { id: "RT-498", proj: "🏪 RetailOS",        projColor: "#F97316", title: "API docs update for v2 endpoints",           by: "Rakesh",  byColor: "#F97316", byInit: "RK", prio: "low",  due: "May 18", type: "Docs"   },
];

function AssignedView() {
  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">Assigned to me</h1>
          <span className="pl-section-count">{ASSIGNED_DATA.length}</span>
        </div>
        <div className="pv-header-right">
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
        </div>
      </div>

      <div className="pv-summary-row">
        <div className="pv-summary-chip pv-chip-red"><span>{ASSIGNED_DATA.filter(t => t.due === "Today").length}</span> due today</div>
        <div className="pv-summary-chip pv-chip-amber"><span>{ASSIGNED_DATA.filter(t => t.type === "Review").length}</span> reviews</div>
        <div className="pv-summary-chip pv-chip-blue"><span>{ASSIGNED_DATA.filter(t => t.type === "Bug").length}</span> bugs</div>
      </div>

      <div className="pv-table">
        <div className="pv-table-head">
          <span className="pv-th-task">Task</span>
          <span className="pv-th">Project</span>
          <span className="pv-th">Assigned by</span>
          <span className="pv-th">Type</span>
          <span className="pv-th">Priority</span>
          <span className="pv-th">Due</span>
        </div>
        {ASSIGNED_DATA.map((t, i) => (
          <div key={i} className="pv-table-row">
            <div className="pv-td-task">
              <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
              <span className="pv-task-title-sm">{t.title}</span>
              <span className="pv-id-tag" style={{ marginLeft: 6 }}>{t.id}</span>
            </div>
            <div className="pv-td">
              <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
            </div>
            <div className="pv-td">
              <div className="pv-assigner">
                <div className="pv-assigner-av" style={{ background: t.byColor }}>{t.byInit}</div>
                <span>{t.by}</span>
              </div>
            </div>
            <div className="pv-td"><span className={"t-tag " + TYPE_STYLE[t.type]}>{t.type}</span></div>
            <div className="pv-td">
              <span className="pv-prio-chip" style={{ color: PRIO_COLOR[t.prio], background: PRIO_COLOR[t.prio] + "18" }}>
                {t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}
              </span>
            </div>
            <div className="pv-td"><span className={"pv-due" + (t.due === "Today" ? " red" : "")}>{t.due}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Home Canvas ──────────────────────────────────────────────────────────────

function HomeCanvas({ view, onOpen }: { view: string; onOpen: (id: string) => void }) {
  return (
    <div className="pl-canvas">
      <StatsRow />
      <MyProjectsSection view={view} onOpen={onOpen} />
      <div className="pl-two-col">
        <HomeWorkSection />
        <ActivitySection />
      </div>
    </div>
  );
}

function HomeWorkSection() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">My work</span>
        <span className="pl-section-count">{MY_WORK_ALL.length}</span>
        <button className="pl-section-link">All tasks <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>
      <div className="pl-work-list">
        {MY_WORK_ALL.map((t, i) => (
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERSONAL_KEYS = ["my-work", "my-tasks", "assigned"];

export default function ProjectsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("home");
  const [canvasView, setCanvasView] = useState<CanvasView>("home");
  const [gridView, setGridView] = useState<"grid" | "list">("grid");

  function handleSelect(key: string) {
    setSelected(key);
    if (PERSONAL_KEYS.includes(key)) {
      setCanvasView(key as CanvasView);
    } else {
      setCanvasView("home");
    }
  }

  const selectedProject = ALL_PROJECTS.find(p => p.id === selected);

  return (
    <div className="proj-shell" data-theme="light">
      <OGSidebar />
      <ProjectsListSidebar selected={selected} onSelect={handleSelect} />

      <div className="proj-workspace">
        <ProjectsTopbar
          view={gridView}
          onView={(v) => setGridView(v as "grid" | "list")}
          canvasView={canvasView}
          selectedProject={canvasView === "home" && selectedProject ? selectedProject : undefined}
        />

        {canvasView === "home"     && <HomeCanvas view={gridView} onOpen={(id) => router.push(`/projects/${id}`)} />}
        {canvasView === "my-work"  && <MyWorkView onOpenProject={(id) => router.push(`/projects/${id}`)} />}
        {canvasView === "my-tasks" && <MyTasksView />}
        {canvasView === "assigned" && <AssignedView />}
      </div>
    </div>
  );
}
