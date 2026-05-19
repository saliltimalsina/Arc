"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar, { NewProjectModal } from "@/components/ProjectsListSidebar";
import { useProjectStore, projectSlug, type Project } from "@/lib/projectStore";
import { useMyItems } from "@/lib/useMyItems";
import { meApi, type ApiMyStats, type ApiActivityEvent } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

// ─── Icon helpers ─────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type CanvasView = "overview" | "my-work" | "my-tasks" | "assigned";

const VIEW_TITLES: Record<CanvasView, string> = {
  overview:  "Projects",
  "my-work": "My Work",
  "my-tasks": "My Tasks",
  assigned:  "Assigned to me",
};

// ─── Topbar ───────────────────────────────────────────────────────────────────

function ProjectsTopbar({ view, onView, canvasView, onNewProject, onAddTask }: {
  view: string; onView: (v: string) => void; canvasView: CanvasView;
  onNewProject: () => void; onAddTask: () => void;
}) {
  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        {canvasView !== "overview" && (
          <><span style={{ color: "var(--proj-text-3)" }}>Projects</span><IChevR /></>
        )}
        <strong>{VIEW_TITLES[canvasView]}</strong>
      </div>
      <div className="proj-topbar-right">
        {canvasView === "overview" && (
          <>
            <div className="pl-view-toggle">
              <button className={"pl-view-btn" + (view === "grid" ? " active" : "")} onClick={() => onView("grid")}><IGrid style={{ width: 13, height: 13 }} /></button>
              <button className={"pl-view-btn" + (view === "list" ? " active" : "")} onClick={() => onView("list")}><IList style={{ width: 13, height: 13 }} /></button>
            </div>
            <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
          </>
        )}
        <div className="proj-search-box">
          <ISearch /><span>Search projects…</span><span className="kbd">⌘K</span>
        </div>
        <button className="proj-icon-btn" title="Notifications"><IBell /><span className="ping" /></button>
        <button className="proj-btn-primary" onClick={canvasView === "overview" ? onNewProject : onAddTask}>
          <IPlus /> {canvasView === "overview" ? "New project" : "Add task"}
        </button>
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: ApiMyStats | null }) {
  const rows = [
    { label: "Active projects", val: stats ? String(stats.activeProjects)  : "—", good: true  },
    { label: "Open tasks",      val: stats ? String(stats.openItems)        : "—", good: false },
    { label: "In review",       val: stats ? String(stats.inReview)         : "—", good: false },
    { label: "Completed",       val: stats ? String(stats.completedItems)   : "—", good: true  },
    { label: "Blockers",        val: stats ? String(stats.blockers)         : "—", good: false },
    { label: "Team members",    val: "—",                                           good: true  },
  ];
  return (
    <div className="pl-stats-row">
      {rows.map((s, i) => (
        <div key={i} className="pl-stat">
          <div className="pl-stat-label">{s.label}</div>
          <div className="pl-stat-val">{s.val}</div>
          <div className={"pl-stat-delta" + (s.good ? " good" : "")}>&nbsp;</div>
        </div>
      ))}
    </div>
  );
}

// ─── My Projects Section ──────────────────────────────────────────────────────

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

function MyProjectsSection({ view, onOpen, onNewProject }: { view: string; onOpen: (id: string) => void; onNewProject: () => void }) {
  const projects = useProjectStore(s => s.projects);
  const cards = projects.map(p => ({
    id:       p.id,
    name:     p.name,
    emoji:    p.emoji,
    color:    p.color,
    pct:      0,
    due:      "—",
    health:   p.status === "active" ? "On track" : "Archived",
    blockers: 0,
    avatars:  [] as string[],
    sprint:   "—",
  }));
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">My projects</span>
        <span className="pl-section-count">{cards.length}</span>
        <button className="pl-section-link">View all <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>
      {view === "grid" ? (
        <div className="pl-proj-grid">
          {cards.map((p) => (
            <div key={p.id} className="pl-proj-card" onClick={() => onOpen(p.id)}>
              <div className="pl-proj-card-top">
                <div className="pl-proj-emoji" style={{ background: p.color + "18" }}>{p.emoji}</div>
                <Ring pct={p.pct} color={p.color} />
              </div>
              <div className="pl-proj-name">{p.name}</div>
              <div className="pl-proj-sprint">{p.sprint}</div>
              <div className="pl-proj-due">
                <span className="pl-health-dot" style={{ background: p.health === "At risk" ? "#F31260" : "#17C964" }} />
                {p.health}
              </div>
              <div className="pl-proj-foot">
                <div className="pl-proj-avs" />
                <span className="pl-blockers zero">Clear</span>
              </div>
            </div>
          ))}
          <button className="pl-proj-card pl-proj-card-new" onClick={onNewProject}>
            <IPlus style={{ width: 20, height: 20, color: "var(--proj-text-4)" }} />
            <span>New project</span>
          </button>
        </div>
      ) : (
        <div className="pl-proj-list">
          {cards.map((p) => (
            <div key={p.id} className="pl-proj-row" onClick={() => onOpen(p.id)}>
              <span className="pl-proj-row-emoji" style={{ background: p.color + "18" }}>{p.emoji}</span>
              <div className="pl-proj-row-info">
                <span className="pl-proj-row-name">{p.name}</span>
                <span className="pl-proj-row-meta">{p.health}</span>
              </div>
              <span className="pl-health-dot" style={{ background: p.health === "At risk" ? "#F31260" : "#17C964", marginRight: 6 }} />
              <IChevR style={{ width: 14, height: 14, color: "var(--proj-text-4)", marginLeft: 8 }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function nameToColor(name: string) { return AV_COLORS[name.charCodeAt(0) % AV_COLORS.length]; }
function initials(name: string) { return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function evToRow(ev: ApiActivityEvent): { key: string; actor: string | null; text: string; time: string } {
  const ago = timeAgo(ev.at);
  if (ev.type === "item_created") {
    return { key: ev.id, actor: ev.actor, text: `created ${ev.itemType} "${ev.title}"${ev.projectName ? ` in ${ev.projectName}` : ""}`, time: ago };
  }
  if (ev.type === "comment") {
    return { key: ev.id, actor: ev.actor, text: `commented on "${ev.itemTitle}"`, time: ago };
  }
  const verb = ev.type === "sprint_started" ? "started" : "completed";
  return { key: ev.id, actor: null, text: `Sprint "${ev.name}" ${verb}${ev.projectName ? ` in ${ev.projectName}` : ""}`, time: ago };
}

function ActivitySection() {
  const [activity, setActivity] = useState<ApiActivityEvent[]>([]);

  useEffect(() => {
    meApi.activity().then(setActivity).catch(() => {});
  }, []);

  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">Recent activity</span>
      </div>
      <div className="pl-activity-list">
        {activity.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--text-3, #888)", padding: "8px 0" }}>No activity yet.</div>
        )}
        {activity.map(ev => {
          const { key, actor, text, time } = evToRow(ev);
          const color = actor ? nameToColor(actor) : "#94A3B8";
          const init  = actor ? initials(actor) : "—";
          return (
            <div key={key} className="pl-activity-row">
              <div className="pl-activity-av" style={{ background: color }}>{init}</div>
              <div className="pl-activity-text">
                {actor && <strong>{actor}</strong>}{actor ? " " : ""}{text}
              </div>
              <div className="pl-activity-time">{time}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── My Work View ─────────────────────────────────────────────────────────────

const PRIO_COLOR: Record<string, string> = { high: "#F31260", med: "#F5A524", low: "#338EF7" };
const TYPE_STYLE: Record<string, string> = { Story: "tt-be", Review: "tt-des", Task: "tt-fe", Bug: "tt-bug", story: "tt-be", task: "tt-fe", bug: "tt-bug" };
const WORK_FILTERS = ["All", "Today", "This week", "Overdue"];

function apiPrio(p: string) {
  return p === "urgent" || p === "high" ? "high" : p === "low" ? "low" : "med";
}
function fmtDue(iso: string | null): { label: string; red: boolean } {
  if (!iso) return { label: "—", red: false };
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const red = d <= today;
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), red };
}

export function MyWorkView({ onOpenProject, onAddTask }: { onOpenProject: (id: string) => void; onAddTask: () => void }) {
  const { items: myItems, loading } = useMyItems();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filter, setFilter]   = useState("All");

  const workItems = myItems.map(({ item }) => {
    const { label: due, red: dueRed } = fmtDue(item.dueDate);
    const displayId = item.project.key && item.number > 0 ? `${item.project.key}-${item.number}` : item.id.slice(-6);
    return {
      prio:      apiPrio(item.priority),
      proj:      `${item.project.emoji} ${item.project.name}`,
      projColor: item.project.color,
      projId:    item.project.id,
      id:        item.id,
      displayId,
      title:     item.title,
      due,
      dueRed,
      type:      item.type.charAt(0).toUpperCase() + item.type.slice(1),
    };
  });

  const items = workItems.filter(t => filter === "All" || (filter === "Today" && t.dueRed) || filter === "This week");

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">My Work</h1>
          <span className="pl-section-count">{workItems.length}</span>
        </div>
        <div className="pv-header-right">
          <div className="pv-filter-group">
            {WORK_FILTERS.map(f => (
              <button key={f} className={"pv-filter-btn" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <button className="proj-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={onAddTask}><IPlus style={{ width: 13, height: 13 }} /> Add task</button>
        </div>
      </div>
      <div className="pv-summary-row">
        <div className="pv-summary-chip pv-chip-red"><span>{workItems.filter(t => t.dueRed).length}</span> due today</div>
        <div className="pv-summary-chip pv-chip-green"><span>{workItems.length}</span> total</div>
      </div>
      {loading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--proj-text-3)", fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="mywork"
          title="No work in flight"
          description="Items from active sprints you're assigned to will appear here."
        />
      ) : (
        <div className="pv-task-list">
          {items.map((t) => (
            <div key={t.id} className={"pv-task-row" + (checked[t.id] ? " done" : "")}>
              <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
              <button className={"pv-checkbox" + (checked[t.id] ? " on" : "")} onClick={() => setChecked(p => ({ ...p, [t.id]: !p[t.id] }))}>
                {checked[t.id] && <ICheck style={{ width: 10, height: 10, stroke: "white", strokeWidth: 3 }} />}
              </button>
              <div className="pv-task-body">
                <div className="pv-task-meta">
                  <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                  <span className="pv-id-tag">{t.displayId}</span>
                  <span className={"t-tag " + (TYPE_STYLE[t.type] ?? "tt-fe")}>{t.type}</span>
                </div>
                <div className={"pv-task-title" + (checked[t.id] ? " struck" : "")}>{t.title}</div>
              </div>
              <div className={"pv-due" + (t.dueRed ? " red" : "")}>{t.due}</div>
              <button className="pv-open-btn" onClick={() => onOpenProject(t.projId)}><IExtR style={{ width: 13, height: 13 }} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Tasks View ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; dot: string }> = {
  "In Progress":  { label: "In Progress", dot: "#338EF7" },
  "To Do":        { label: "To Do",       dot: "#9A9FAB" },
  "Done":         { label: "Done",        dot: "#17C964" },
  "In Review":    { label: "In Review",   dot: "#F5A524" },
};

export function MyTasksView({ onAddTask }: { onAddTask: () => void }) {
  const { items: myItems, loading } = useMyItems();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"open" | "review" | "done" | "all">("open");
  const groups = ["In Progress", "To Do", "In Review", "Done"] as const;

  const taskItems = myItems.map(({ item }) => {
    const { label: due } = fmtDue(item.dueDate);
    const displayId = item.project.key && item.number > 0 ? `${item.project.key}-${item.number}` : item.id.slice(-6);
    return {
      id:        item.id,
      displayId,
      proj:      `${item.project.emoji} ${item.project.name}`,
      projColor: item.project.color,
      title:     item.title,
      status:    item.status,
      prio:      apiPrio(item.priority),
      due,
    };
  });

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">My Tasks</h1>
          <span className="pl-section-count">{taskItems.length}</span>
        </div>
        <div className="pv-header-right">
          <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "var(--proj-surface-2)", borderRadius: 8 }}>
            {([
              ["open",   "Open"],
              ["review", "In Review"],
              ["done",   "Done"],
              ["all",    "All"],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: 0, cursor: "pointer",
                  fontSize: 12, fontWeight: tab === k ? 600 : 500,
                  background: tab === k ? "var(--proj-surface)" : "transparent",
                  color: tab === k ? "var(--blue)" : "var(--proj-text-3)",
                }}>{label}</button>
            ))}
          </div>
          <button className="proj-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={onAddTask}><IPlus style={{ width: 13, height: 13 }} /> New task</button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--proj-text-3)", fontSize: 13 }}>Loading…</div>
      ) : taskItems.length === 0 ? (
        <EmptyState
          variant="tasks"
          title="Your task list is empty"
          description="Tasks assigned to you across all projects appear here."
          action={{ label: "New task", onClick: onAddTask }}
        />
      ) : (
        groups.map(status => {
          if (tab === "open" && status === "Done") return null;
          if (tab === "open" && status === "In Review") return null;
          if (tab === "review" && status !== "In Review") return null;
          if (tab === "done" && status !== "Done") return null;
          const items = taskItems.filter(t => t.status === status);
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
                {items.map(t => {
                  const done = checked[t.id];
                  return (
                    <div key={t.id} className={"pv-task-row" + (done ? " done" : "")}>
                      <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
                      <button className={"pv-checkbox" + (done ? " on" : "")} onClick={() => setChecked(p => ({ ...p, [t.id]: !p[t.id] }))}>
                        {done && <ICheck style={{ width: 10, height: 10, stroke: "white", strokeWidth: 3 }} />}
                      </button>
                      <div className="pv-task-body">
                        <div className="pv-task-meta">
                          <span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span>
                          <span className="pv-id-tag">{t.displayId}</span>
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
        })
      )}
    </div>
  );
}

// ─── Assigned to Me View ──────────────────────────────────────────────────────

export function AssignedView() {
  const { items: myItems, loading } = useMyItems();

  const assigned = myItems.map(({ item }) => {
    const { label: due, red: dueRed } = fmtDue(item.dueDate);
    const prio = apiPrio(item.priority);
    const displayId = item.project.key && item.number > 0 ? `${item.project.key}-${item.number}` : item.id.slice(-6);
    return {
      id:        item.id,
      displayId,
      proj:      `${item.project.emoji} ${item.project.name}`,
      projColor: item.project.color,
      title:     item.title,
      type:      item.type.charAt(0).toUpperCase() + item.type.slice(1),
      prio,
      due,
      dueRed,
    };
  });

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">Assigned to me</h1>
          <span className="pl-section-count">{assigned.length}</span>
        </div>
        <div className="pv-header-right">
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
        </div>
      </div>
      <div className="pv-summary-row">
        <div className="pv-summary-chip pv-chip-red"><span>{assigned.filter(t => t.dueRed).length}</span> due today</div>
        <div className="pv-summary-chip pv-chip-blue"><span>{assigned.filter(t => t.type === "Bug").length}</span> bugs</div>
      </div>
      {loading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--proj-text-3)", fontSize: 13 }}>Loading…</div>
      ) : assigned.length === 0 ? (
        <EmptyState
          variant="assigned"
          title="Nothing assigned yet"
          description="Work items assigned to you across all projects appear here."
        />
      ) : (
        <div className="pv-table">
          <div className="pv-table-head">
            <span className="pv-th-task">Task</span>
            <span className="pv-th">Project</span>
            <span className="pv-th">Type</span>
            <span className="pv-th">Priority</span>
            <span className="pv-th">Due</span>
          </div>
          {assigned.map((t) => (
            <div key={t.id} className="pv-table-row">
              <div className="pv-td-task">
                <div className="pv-prio-bar" style={{ background: PRIO_COLOR[t.prio] }} />
                <span className="pv-task-title-sm">{t.title}</span>
                <span className="pv-id-tag" style={{ marginLeft: 6 }}>{t.displayId}</span>
              </div>
              <div className="pv-td"><span className="pv-proj-tag" style={{ color: t.projColor, background: t.projColor + "18" }}>{t.proj}</span></div>
              <div className="pv-td"><span className={"t-tag " + (TYPE_STYLE[t.type] ?? "tt-fe")}>{t.type}</span></div>
              <div className="pv-td">
                <span className="pv-prio-chip" style={{ color: PRIO_COLOR[t.prio], background: PRIO_COLOR[t.prio] + "18" }}>
                  {t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}
                </span>
              </div>
              <div className="pv-td"><span className={"pv-due" + (t.dueRed ? " red" : "")}>{t.due}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Home Canvas ──────────────────────────────────────────────────────────────

function HomeWorkSection() {
  const { items: myItems } = useMyItems();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const workItems = myItems.slice(0, 8).map(({ item }) => {
    const { label: due, red: dueRed } = fmtDue(item.dueDate);
    return {
      id:        item.id,
      prio:      apiPrio(item.priority),
      proj:      `${item.project.emoji} ${item.project.name}`,
      title:     item.title,
      due,
      dueRed,
    };
  });

  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <span className="pl-section-title">My work</span>
        <span className="pl-section-count">{workItems.length}</span>
        <button className="pl-section-link">All tasks <IChevR style={{ width: 12, height: 12 }} /></button>
      </div>
      <div className="pl-work-list">
        {workItems.length === 0 ? (
          <div style={{ padding: "16px 0", color: "var(--proj-text-3)", fontSize: 13 }}>No assigned items yet.</div>
        ) : workItems.map((t) => (
          <div key={t.id} className={"pl-work-row" + (checked[t.id] ? " done" : "")} onClick={() => setChecked(p => ({ ...p, [t.id]: !p[t.id] }))}>
            <div className="pl-work-prio" style={{ background: PRIO_COLOR[t.prio] }} />
            <div className={"pl-work-check" + (checked[t.id] ? " on" : "")}>
              {checked[t.id] && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div className="pl-work-content">
              <div className="pl-work-meta">
                <span className="pl-work-proj">{t.proj}</span>
                {t.dueRed && <span className="pl-work-due-red">{t.due}</span>}
              </div>
              <div className={"pl-work-title" + (checked[t.id] ? " struck" : "")}>{t.title}</div>
              {!t.dueRed && <div className="pl-work-due">{t.due}</div>}
            </div>
            <IChevR style={{ width: 13, height: 13, color: "var(--proj-text-4)", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeCanvas({ view, onOpen, onNewProject }: { view: string; onOpen: (id: string) => void; onNewProject: () => void }) {
  const [stats, setStats] = useState<ApiMyStats | null>(null);
  useEffect(() => {
    meApi.stats().then(setStats).catch(() => {});
  }, []);
  return (
    <div className="pl-canvas">
      <StatsRow stats={stats} />
      <MyProjectsSection view={view} onOpen={onOpen} onNewProject={onNewProject} />
      <div className="pl-two-col">
        <HomeWorkSection />
        <ActivitySection />
      </div>
    </div>
  );
}

// ─── Shell wrapper (used by each sub-page) ────────────────────────────────────

// ─── Quick-add task modal (for My Work / My Tasks views) ─────────────────────

function QuickAddModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="sb-modal-backdrop" onClick={onClose}>
      <div className="sb-modal" onClick={e => e.stopPropagation()}>
        <div className="sb-modal-head">
          <span className="sb-modal-title">Add task</span>
          <button className="sb-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sb-modal-body">
          <div className="sb-modal-row">
            <label>Task name</label>
            <input
              className="sb-modal-input"
              placeholder="What needs to be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim()); if (e.key === "Escape") onClose(); }}
              autoFocus
            />
          </div>
        </div>
        <div className="sb-modal-foot">
          <button className="sb-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="sb-modal-confirm" onClick={() => { if (title.trim()) onConfirm(title.trim()); }}>Add</button>
        </div>
      </div>
    </div>
  );
}

export function ProjectsListPage({ view }: { view: CanvasView }) {
  const router   = useRouter();
  const addProject = useProjectStore(s => s.addProject);
  const [gridView, setGridView]   = useState<"grid" | "list">("grid");
  const [showNewProj, setNewProj] = useState(false);
  const [showAddTask, setAddTask] = useState(false);

  async function handleProjectCreated(data: Omit<Project, "id">) {
    try {
      const p = await addProject(data);
      router.push(`/projects/${projectSlug(p)}`);
    } catch {
      // API failed silently
    }
  }

  const projects = useProjectStore(s => s.projects);
  const navProject = (idOrSlug: string) => {
    const p = projects.find(x => x.id === idOrSlug) ?? projects.find(x => x.key === idOrSlug);
    router.push(`/projects/${p ? projectSlug(p) : idOrSlug}`);
  };

  return (
    <div className="proj-shell" data-theme="light">
      <OGSidebar />
      <ProjectsListSidebar />
      <div className="proj-workspace">
        <ProjectsTopbar
          view={gridView}
          onView={v => setGridView(v as "grid" | "list")}
          canvasView={view}
          onNewProject={() => setNewProj(true)}
          onAddTask={() => setAddTask(true)}
        />
        {view === "overview"  && <HomeCanvas view={gridView} onOpen={navProject} onNewProject={() => setNewProj(true)} />}
        {view === "my-work"   && <MyWorkView onOpenProject={navProject} onAddTask={() => setAddTask(true)} />}
        {view === "my-tasks"  && <MyTasksView onAddTask={() => setAddTask(true)} />}
        {view === "assigned"  && <AssignedView />}
      </div>
      {showNewProj && <NewProjectModal onClose={() => setNewProj(false)} onCreated={handleProjectCreated} />}
      {showAddTask && <QuickAddModal onClose={() => setAddTask(false)} onConfirm={() => setAddTask(false)} />}
    </div>
  );
}
