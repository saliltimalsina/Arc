"use client";

import { useState, useRef, useEffect, Fragment, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import "../projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar from "@/components/ProjectsListSidebar";
import dynamic from "next/dynamic";
const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });
import { useProjectStore, findProjectBySlug, type Project } from "@/lib/projectStore";
import { useAuthStore } from "@/lib/authStore";
import { projectsApi, itemsApi, sprintsApi, commentsApi, itemActivityApi, goalsApi, usersApi, getToken, type ApiItem, type ApiGoal, type ApiUserSearchResult, type ApiComment, type ApiItemActivity, type ApiActivityEvent } from "@/lib/api";
import { pushToast } from "@/hooks/useToast";
import { NotificationsBell } from "@/components/NotificationsBell";
import { userColor, userInitials } from "@/lib/userColor";
import EmptyState from "@/components/EmptyState";
import DatePicker from "@/components/DatePicker";
import { Table, TableResizableContainer, Tooltip } from "@heroui/react";
import { useRouter } from "next/navigation";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

type IconProps = React.SVGProps<SVGSVGElement>;
function mkIcon(d: React.ReactNode) {
  return function Icon(p: IconProps) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}

const ISearch   = mkIcon(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
const ICheck    = mkIcon(<><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></>);
const IBell     = mkIcon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
const IPlus     = mkIcon(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IChevDown = mkIcon(<path d="m6 9 6 6 6-6"/>);
const IChevR    = mkIcon(<path d="m9 6 6 6-6 6"/>);
const IChevL    = mkIcon(<path d="m15 6-6 6 6 6"/>);
const IFilter   = mkIcon(<><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></>);
const IClock    = mkIcon(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>);
const IFlag     = mkIcon(<><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>);
const IAlert    = mkIcon(<><path d="m12 4 9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></>);
const IClose    = mkIcon(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);

const IMoreH    = mkIcon(<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>);
const IUsers    = mkIcon(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);
const IBoxes    = mkIcon(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
const IPencil   = mkIcon(<><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></>);
const ITrash    = mkIcon(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>);

// ─── Create Story Modal ───────────────────────────────────────────────────────

const PRIORITY_OPTS  = ["Highest", "High", "Medium", "Low", "Lowest"];
const ESTIMATE_OPTS  = [1, 2, 3, 5, 8, 13, 21];
const STATUS_OPTS   = ["To Do", "In Progress", "In Review", "Done"];
const WORK_TYPE_OPTS = ["Story", "Task", "Bug", "Epic", "Sub-task"];

const ESTIMATE_PTS: Record<string, number> = { "1": 1, "2": 2, "3": 3, "5": 5, "8": 8, "13": 13, "21": 21 };

function CreateStoryPanel({ open, onClose, projectName, onCreated, allSprints, owners }: {
  open: boolean; onClose: () => void; projectName?: string;
  onCreated?: (item: { summary: string; workType: string; status: string; sprint: string; points?: number; priority?: string; assigneeId?: string }) => void;
  allSprints?: { id: string; name: string; active: boolean }[];
  owners?: Owner[];
}) {
  const currentUser = useAuthStore(s => s.user);
  const [summary, setSummary]       = useState("");
  const [priority, setPriority]     = useState("Medium");
  const [status, setStatus]         = useState("To Do");
  const [workType, setWorkType]     = useState("Story");
  const [assignee, setAssignee]     = useState("Automatic");
  const [sprint, setSprint]         = useState("");
  const [estimate, setEstimate]     = useState("");
  const [description, setDesc]      = useState("");
  const [createAnother, setAnother] = useState(false);
  const [summaryErr, setSummaryErr] = useState(false);

  function handleCreate() {
    if (!summary.trim()) { setSummaryErr(true); return; }
    const points = estimate ? ESTIMATE_PTS[estimate] : undefined;
    const apiPrio = ({ "Highest": "urgent", "High": "high", "Medium": "medium", "Low": "low", "Lowest": "trivial" } as Record<string, string>)[priority] ?? "medium";
    const matchedOwner = assignee === "Automatic" ? null : (owners ?? []).find(o => o.name === assignee);
    onCreated?.({ summary: summary.trim(), workType, status, sprint, points, priority: apiPrio, assigneeId: matchedOwner?.id });
    if (createAnother) {
      setSummary(""); setDesc(""); setSummaryErr(false);
    } else {
      handleClose();
    }
  }

  function handleClose() { setSummaryErr(false); onClose(); }

  return (
    <>
      <div className={"tp-backdrop" + (open ? " open" : "")} onClick={handleClose} />
      <aside className={"cs-panel" + (open ? " open" : "")}>

        {/* Header */}
        <div className="cs-panel-head">
          <div className="cs-panel-crumb">
            <span>{projectName ?? "Project"}</span>
            <IChevR style={{ width: 11, height: 11 }} />
            <span className="cs-panel-crumb-cur">Create Story</span>
          </div>
          <div className="cs-panel-head-right">
            <button className="proj-icon-btn" onClick={handleClose} title="Close"><IClose /></button>
          </div>
        </div>

        {/* Body: main + sidebar */}
        <div className="cs-panel-body">

          {/* ── Main content ── */}
          <div className="cs-panel-main">
            <p className="cs-required-note">Required fields marked <span className="cs-asterisk">*</span></p>

            <div className="cs-field-row">
              <div className="cs-field">
                <label className="cs-label">Work type <span className="cs-asterisk">*</span></label>
                <select className="cs-select" value={workType} onChange={e => setWorkType(e.target.value)}>
                  {WORK_TYPE_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="cs-field">
                <label className="cs-label">Status</label>
                <select className="cs-select" value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
                <span className="cs-hint">Initial status upon creation</span>
              </div>
            </div>

            <div className="cs-field">
              <label className="cs-label">Summary <span className="cs-asterisk">*</span></label>
              <input
                className={"cs-input" + (summaryErr ? " cs-input-err" : "")}
                placeholder="Enter a summary…"
                value={summary}
                onChange={e => { setSummary(e.target.value); setSummaryErr(false); }}
                autoFocus={open}
              />
              {summaryErr && <span className="cs-err-msg">Summary is required</span>}
            </div>

            <div className="cs-field">
              <label className="cs-label">Description</label>
              <textarea
                className="cs-textarea"
                placeholder="Describe the story…"
                rows={6}
                value={description}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

          </div>

          {/* ── Right sidebar ── */}
          <div className="cs-panel-side">

            <div className="cs-side-row">
              <div className="cs-side-label">Reporter <span className="cs-asterisk">*</span></div>
              <div className="cs-reporter-row">
                <div className="cs-av" suppressHydrationWarning style={{ background: userColor(currentUser?.id) }}>
                  {currentUser ? userInitials(currentUser.name) : "?"}
                </div>
                <span>{currentUser?.name ?? "You"}</span>
              </div>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Priority</div>
              <select className="cs-select" value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITY_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Assignee</div>
              <select className="cs-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Automatic</option>
                {(owners ?? []).map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
              </select>
              <button className="cs-assign-me" onClick={() => setAssignee(owners?.[0]?.name ?? "")}>Assign to me</button>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Sprint</div>
              <select className="cs-select" value={sprint} onChange={e => setSprint(e.target.value)}>
                <option value="">Select sprint</option>
                {(allSprints ?? []).filter(s => !s.id.startsWith("temp-")).map(s => (
                  <option key={s.id} value={s.active ? `${s.name} (active)` : s.name}>
                    {s.name}{s.active ? " (active)" : ""}
                  </option>
                ))}
                <option value="Backlog">Backlog</option>
              </select>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Estimation</div>
              <div className="cs-estimate-row">
                {ESTIMATE_OPTS.map(e => (
                  <button key={e} className={"cs-est-btn" + (estimate === String(e) ? " active" : "")} onClick={() => setEstimate(estimate === String(e) ? "" : String(e))}>{e}</button>
                ))}
              </div>
              <span className="cs-hint">Fibonacci points</span>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="cs-panel-footer">
          <label className="cs-another">
            <input type="checkbox" checked={createAnother} onChange={e => setAnother(e.target.checked)} />
            <span>Create another</span>
          </label>
          <div className="cs-footer-actions">
            <button className="cs-btn-cancel" onClick={handleClose}>Cancel</button>
            <button className="cs-btn-create" onClick={handleCreate}>Create</button>
          </div>
        </div>

      </aside>
    </>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function daysUntil(iso?: string): string {
  if (!iso) return "";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "ends today" : `ends in ${diff}d`;
}

function ProjectTopbar({ onOpenPanel, project, activeSprint }: {
  onOpenPanel: () => void;
  project: Project | undefined;
  activeSprint?: { name: string; endIso?: string };
}) {
  const sprintLabel = activeSprint
    ? `${activeSprint.name}${activeSprint.endIso ? ` · ${daysUntil(activeSprint.endIso)}` : ""}`
    : "";
  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        <span>Projects</span>
        <IChevR />
        <strong>{project?.name ?? "Project"}</strong>
      </div>
      {sprintLabel && (
        <div className="proj-sprint-chip">
          <span className="proj-sprint-pip" />
          {sprintLabel}
        </div>
      )}
      <div className="proj-topbar-right">
        <div className="proj-search-box">
          <ISearch />
          <span>Search or run a command</span>
          <span className="kbd">⌘K</span>
        </div>
        <NotificationsBell iconClassName="proj-icon-btn"><IBell /></NotificationsBell>
        <button className="proj-btn-primary" onClick={onOpenPanel}>
          <IPlus />
          Create
        </button>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

const OverviewTab = memo(function OverviewTab({ onOpenPanel, onOpenCreate, onSwitchToBoard, project, activeSprint, projectId, updateProjectLocal, allSprints, backlog, milestones, setMilestones }: {
  onOpenPanel: () => void; onOpenCreate: () => void; onSwitchToBoard: () => void;
  project: Project | undefined;
  activeSprint?: { name: string; endIso?: string };
  projectId: string;
  updateProjectLocal: (id: string, data: Partial<Project>) => void;
  allSprints: BLSprintData[];
  backlog: BLItem[];
  milestones: import("@/lib/api").ApiMilestone[];
  setMilestones: React.Dispatch<React.SetStateAction<import("@/lib/api").ApiMilestone[]>>;
}) {
  const [editingName, setEditingName]   = useState(false);
  const [editingDesc, setEditingDesc]   = useState(false);
  const [nameVal, setNameVal]           = useState("");
  const [descVal, setDescVal]           = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [activity, setActivity] = useState<ApiActivityEvent[]>([]);
  useEffect(() => {
    let cancelled = false;
    projectsApi.activity(projectId).then(ev => { if (!cancelled) setActivity(ev); }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Derived health stats ──────────────────────────────────────────────────
  const allItems = [...allSprints.flatMap(s => s.items), ...backlog];
  const totalItems = allItems.length;
  const doneItems  = allItems.filter(i => i.status === "done").length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const activeSprintData = [...allSprints].reverse().find(s => s.active);
  const sprintStats = (() => {
    if (!activeSprintData) return { label: "No sprint", pct: 0, cls: "hb-low" };
    const spItems = activeSprintData.items;
    const spDone  = spItems.filter(i => i.status === "done").length;
    const itemPct = spItems.length > 0 ? spDone / spItems.length : 0;
    const now = Date.now();
    const start = activeSprintData.startIso ? new Date(activeSprintData.startIso).getTime() : now;
    const end   = activeSprintData.endIso   ? new Date(activeSprintData.endIso).getTime()   : now;
    const timePct = end > start ? Math.min((now - start) / (end - start), 1) : 0;
    const gap = itemPct - timePct;
    if (gap >= -0.1)  return { label: "On track", pct: Math.round(itemPct * 100), cls: "hb-sprint" };
    if (gap >= -0.25) return { label: "At risk",  pct: Math.round(itemPct * 100), cls: "hb-budget" };
    return               { label: "Behind",   pct: Math.round(itemPct * 100), cls: "hb-risk" };
  })();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCount = allItems.filter(i => {
    if (i.status === "done" || !i.dueDate) return false;
    return new Date(i.dueDate) < today;
  }).length;
  const riskStats = (() => {
    if (overdueCount === 0) return { label: "Low",    pct: 15,  cls: "hb-low"    };
    if (overdueCount <= 3)  return { label: "Medium", pct: 50,  cls: "hb-budget" };
    return                         { label: "High",   pct: 85,  cls: "hb-risk"   };
  })();

  function startEditName() {
    setNameVal(project?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  }

  function startEditDesc() {
    setDescVal(project?.description ?? "");
    setEditingDesc(true);
    setTimeout(() => descRef.current?.focus(), 0);
  }

  async function saveName() {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === project?.name) { setEditingName(false); return; }
    updateProjectLocal(projectId, { name: trimmed });
    setEditingName(false);
    try {
      await projectsApi.update(projectId, { name: trimmed });
    } catch (err) {
      console.error("Failed to update project name:", err);
      updateProjectLocal(projectId, { name: project?.name ?? "" });
      pushToast("Failed to save name", "error");
    }
  }

  async function saveDesc() {
    const trimmed = descVal.trim();
    setEditingDesc(false);
    if (trimmed === (project?.description ?? "")) return;
    updateProjectLocal(projectId, { description: trimmed });
    try {
      await projectsApi.update(projectId, { description: trimmed });
    } catch (err) {
      console.error("Failed to update project description:", err);
      updateProjectLocal(projectId, { description: project?.description });
      pushToast("Failed to save description", "error");
    }
  }

  // ── Milestone handlers ────────────────────────────────────────────────────
  const [_addingMilestone, setAddingMilestone] = useState(false);
  const [newMsName, setNewMsName]             = useState("");
  const [newMsDate, setNewMsDate]             = useState("");
  const [editingMsId, setEditingMsId]         = useState<string | null>(null);
  const [editMsName, setEditMsName]           = useState("");
  const [editMsDate, setEditMsDate]           = useState("");

  async function _addMilestone() {
    if (!newMsName.trim() || !newMsDate) return;
    setAddingMilestone(false);
    const optimistic = { id: `tmp-${Date.now()}`, projectId, name: newMsName.trim(), date: newMsDate, position: milestones.length };
    setMilestones(ms => [...ms, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setNewMsName(""); setNewMsDate("");
    try {
      const created = await projectsApi.milestones.create(projectId, { name: optimistic.name, date: optimistic.date });
      setMilestones(ms => ms.map(m => m.id === optimistic.id ? created : m));
    } catch (err) {
      console.error("Failed to create milestone:", err);
      setMilestones(ms => ms.filter(m => m.id !== optimistic.id));
      pushToast("Failed to add milestone", "error");
    }
  }

  function _startEditMs(m: import("@/lib/api").ApiMilestone) {
    setEditingMsId(m.id);
    setEditMsName(m.name);
    setEditMsDate(m.date.slice(0, 10));
  }

  async function _saveEditMs() {
    if (!editingMsId) return;
    const prev = milestones.find(m => m.id === editingMsId);
    setEditingMsId(null);
    if (!editMsName.trim() || !editMsDate || !prev) return;
    setMilestones(ms => ms.map(m => m.id === editingMsId ? { ...m, name: editMsName.trim(), date: editMsDate } : m).sort((a, b) => a.date.localeCompare(b.date)));
    try {
      await projectsApi.milestones.update(projectId, editingMsId, { name: editMsName.trim(), date: editMsDate });
    } catch (err) {
      console.error("Failed to update milestone:", err);
      setMilestones(ms => ms.map(m => m.id === editingMsId ? prev : m));
      pushToast("Failed to update milestone", "error");
    }
  }

  async function _deleteMilestone(msId: string) {
    const prev = milestones.find(m => m.id === msId);
    setMilestones(ms => ms.filter(m => m.id !== msId));
    try {
      await projectsApi.milestones.delete(projectId, msId);
    } catch (err) {
      console.error("Failed to delete milestone:", err);
      if (prev) setMilestones(ms => [...ms, prev].sort((a, b) => a.date.localeCompare(b.date)));
      pushToast("Failed to delete milestone", "error");
    }
  }

  // ── Milestone timeline math ───────────────────────────────────────────────
  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  const now    = new Date();
  const msCompleted = sorted.filter(m => new Date(m.date) <= now).length;
  const _msPct = sorted.length > 0 ? Math.round((msCompleted / sorted.length) * 100) : 0;
  const timelineStart = sorted.length > 0 ? new Date(sorted[0].date).getTime() : Date.now();
  const timelineEnd   = sorted.length > 0 ? new Date(sorted[sorted.length - 1].date).getTime() : Date.now() + 1;
  const _nowPct = Math.min(100, Math.max(0, ((now.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100));

  function _msPctPos(dateStr: string) {
    if (sorted.length < 2) return 50;
    return Math.min(100, Math.max(0, ((new Date(dateStr).getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100));
  }

  function _fmtMsDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="pane active">
      <div className="proj-wrap">
        {/* Hero */}
        <div className="proj-hero">
          <div className="proj-hero-top">
            <div className="proj-hero-icon">{project?.emoji ?? "📦"}</div>
            <div className="proj-hero-titles">
              <div className="proj-hero-badges">
                {project?.client !== "Internal"
                  ? <span className="proj-badge pb-client">Client Project</span>
                  : <span className="proj-badge pb-sprint">Internal</span>
                }
                <span className="proj-badge pb-active"><span className="proj-badge-dot" />Active</span>
                {activeSprint && <span className="proj-badge pb-sprint">{activeSprint.name}</span>}
              </div>
              {editingName ? (
                <input
                  ref={nameRef}
                  className="proj-hero-title-input"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                />
              ) : (
                <h1 className="proj-hero-title proj-hero-title--editable" onClick={startEditName} title="Click to edit">
                  {project?.name ?? "New Project"}
                </h1>
              )}
              {editingDesc ? (
                <textarea
                  ref={descRef}
                  className="proj-hero-sub-input"
                  value={descVal}
                  onChange={e => setDescVal(e.target.value)}
                  onBlur={saveDesc}
                  onKeyDown={e => { if (e.key === "Escape") setEditingDesc(false); }}
                  rows={2}
                />
              ) : (
                <p className="proj-hero-sub proj-hero-sub--editable" onClick={startEditDesc} title="Click to edit">
                  {project?.description ?? "Your project is ready. Head to the board or backlog to get started."}
                </p>
              )}
            </div>
          </div>

          <div className="health-strip">
            <div className="health-cell">
              <div className="health-label">Progress</div>
              <div className="health-value">{progressPct}<span className="hsmall">%</span></div>
              <div className="health-bar"><div className="hb-progress" style={{ width: `${progressPct}%` }} /></div>
            </div>
            <div className="health-cell">
              <div className="health-label">Sprint</div>
              <div className="health-value">{sprintStats.label}</div>
              <div className="health-bar"><div className={sprintStats.cls} style={{ width: `${sprintStats.pct}%` }} /></div>
            </div>
            <div className="health-cell">
              <div className="health-label">Risk</div>
              <div className="health-value">{riskStats.label}</div>
              <div className="health-bar"><div className={riskStats.cls} style={{ width: `${riskStats.pct}%` }} /></div>
            </div>
          </div>
        </div>

        {/* Context banner */}
        {(() => {
          if (!activeSprintData) return null;
          const endIso = activeSprintData.endIso;
          if (!endIso) return null;
          const daysLeft = Math.ceil((new Date(endIso).getTime() - Date.now()) / 86_400_000);
          const msg = daysLeft < 0
            ? `Sprint ended ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} ago. Complete it or extend.`
            : daysLeft === 0
              ? "Sprint ends today. Wrap up remaining items."
              : `Sprint ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`;
          return (
            <div className="ctx-banner">
              <IAlert />
              <div className="ctx-banner-text"><strong>{activeSprintData.name}.</strong> {msg}</div>
              <button className="ctx-banner-cta" onClick={onSwitchToBoard}>Open board →</button>
            </div>
          );
        })()}

        {/* Needs Attention + Work Snapshot */}
        {(() => {
          const inReview  = allItems.filter(i => i.status === "in-review").length;
          const notStarted = activeSprintData
            ? activeSprintData.items.filter(i => i.status === "todo").length
            : 0;
          const attentionItems: { color: string; Icon: React.FC<IconProps>; title: string; sub: React.ReactNode }[] = [];
          if (overdueCount > 0) attentionItems.push({ color: "ai-red",    Icon: IAlert, title: `${overdueCount} task${overdueCount !== 1 ? "s" : ""} overdue`, sub: "Review and move or reassign" });
          if (inReview > 0)     attentionItems.push({ color: "ai-orange", Icon: ICheck, title: `${inReview} item${inReview !== 1 ? "s" : ""} in review`, sub: "Action needed to unblock progress" });
          if (notStarted > 0 && activeSprintData) attentionItems.push({ color: "ai-yellow", Icon: IClock, title: `${notStarted} item${notStarted !== 1 ? "s" : ""} not started in sprint`, sub: "Plan to move or drop before sprint ends" });

          const openCount    = allItems.filter(i => i.status !== "done").length;
          const closedCount  = allItems.filter(i => i.status === "done").length;

          return (
            <div className="sec-grid-2">
              <div className="ov-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-title"><span className="ov-kicker">01</span>Needs attention</div>
                </div>
                <div className="action-list">
                  {attentionItems.length === 0 ? (
                    <div className="ov-empty">
                      <div className="ov-empty-ico" style={{ background: "rgb(23 201 100 / 0.14)", color: "#17C964" }}><ICheck /></div>
                      <div className="ov-empty-title">All clear</div>
                      <div className="ov-empty-sub">No overdue items, no blocked work, no review backlog.</div>
                    </div>
                  ) : attentionItems.map(({ color, Icon, title, sub }) => (
                    <div key={title} className="action-item" onClick={onOpenPanel}>
                      <div className={"action-icon " + color}><Icon /></div>
                      <div className="action-text">
                        <div className="action-title">{title}</div>
                        <div className="action-sub">{sub}</div>
                      </div>
                      <span className="action-arrow"><IChevR /></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ov-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-title"><span className="ov-kicker">02</span>Work snapshot</div>
                  <span className="ov-panel-link" style={{ cursor: "pointer" }} onClick={onSwitchToBoard}>Sprint view <IChevR /></span>
                </div>
                <div className="snap-stats">
                  {[
                    { lbl: "Open tasks", val: String(openCount),   delta: totalItems > 0 ? `${Math.round(openCount/totalItems*100)}% remaining` : "—" },
                    { lbl: "Closed",     val: String(closedCount), delta: totalItems > 0 ? `${progressPct}% complete` : "—" },
                    { lbl: "In review",  val: String(inReview),    delta: inReview > 0 ? "need action" : "queue empty" },
                  ].map(({ lbl, val, delta }) => (
                    <div key={lbl} className="snap-stat">
                      <div className="lbl">{lbl}</div>
                      <div className="val">{val}</div>
                      <div className="delta">{delta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Team Pulse + Up Next */}
        {(() => {
          const bugs       = allItems.filter(i => i.type === "bug" && i.status !== "done");
          const inReview   = allItems.filter(i => i.status === "in-review");
          const overdueItems = allItems.filter(i => {
            if (i.status === "done" || !i.dueDate) return false;
            return new Date(i.dueDate) < today;
          });

          const upNextItems = allItems
            .filter(i => i.status !== "done")
            .sort((a, b) => {
              if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
              if (a.dueDate) return -1;
              if (b.dueDate) return 1;
              const prioOrder: Record<string, number> = { "tp-highest": 0, "tp-high": 1, "tp-med": 2, "tp-low": 3, "tp-lowest": 4 };
              return (prioOrder[a.priority ?? "tp-low"] ?? 3) - (prioOrder[b.priority ?? "tp-low"] ?? 3);
            })
            .slice(0, 5);

          return (
            <div className="sec-grid-3">
              <div className="ov-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-title"><span className="ov-kicker">03</span>Team pulse</div>
                </div>
                <div className="pulse-body">
                  {[
                    { key: "Sprint progress", val: sprintStats.pct + "%",           dot: sprintStats.cls === "hb-sprint" ? "pd-good" : sprintStats.cls === "hb-budget" ? "pd-mid" : "pd-bad" },
                    { key: "Overdue items",   val: String(overdueItems.length),     dot: overdueItems.length === 0 ? "pd-good" : overdueItems.length <= 2 ? "pd-mid" : "pd-bad" },
                    { key: "Review queue",    val: `${inReview.length} open`,       dot: inReview.length === 0 ? "pd-good" : inReview.length <= 3 ? "pd-mid" : "pd-bad" },
                    { key: "Bugs open",       val: String(bugs.length),             dot: bugs.length === 0 ? "pd-good" : bugs.length <= 2 ? "pd-mid" : "pd-bad" },
                    { key: "Total items",     val: String(totalItems),              dot: "pd-good" },
                    { key: "Completion",      val: progressPct + "%",              dot: progressPct >= 70 ? "pd-good" : progressPct >= 40 ? "pd-mid" : "pd-bad" },
                  ].map(({ key, val, dot }) => (
                    <div key={key} className="pulse-row">
                      <span className="pulse-key">{key}</span>
                      <span className="pulse-val"><span className={"pulse-dot " + dot} />{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ov-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-title"><span className="ov-kicker">04</span>Up next</div>
                </div>
                <div className="upnext-list">
                  {upNextItems.length === 0 ? (
                    <div className="ov-empty">
                      <div className="ov-empty-ico"><IBoxes /></div>
                      <div className="ov-empty-title">Nothing queued</div>
                      <div className="ov-empty-sub">Add items to the sprint or backlog and they'll line up here.</div>
                      <button className="ov-panel-link" style={{ marginTop: 4 }} onClick={onOpenCreate}><IPlus />New item</button>
                    </div>
                  ) : upNextItems.map(item => {
                    const prio = item.priority === "tp-high" ? "up-high" : item.priority === "tp-med" ? "up-med" : "up-low";
                    const dueLabel = item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : item.status === "in-review" ? "In review" : "No due date";
                    return (
                      <div key={item.id} className="upnext-row" onClick={onOpenPanel}>
                        <div className={"upnext-prio " + prio} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="upnext-title">{item.title}</div>
                          <div className="upnext-meta"><span>{item.displayId}</span><span>{dueLabel}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ov-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-title"><span className="ov-kicker">05</span>Recent activity</div>
                </div>
                <div className="act-list">
                  {activity.length === 0 && (
                    <div className="ov-empty">
                      <div className="ov-empty-ico"><IClock /></div>
                      <div className="ov-empty-title">No activity yet</div>
                      <div className="ov-empty-sub">Comments, completions, and sprint events will appear here as your team works.</div>
                    </div>
                  )}
                  {activity.slice(0, 6).map(ev => {
                    const ago = (() => {
                      const diff = Date.now() - new Date(ev.at).getTime();
                      const m = Math.floor(diff / 60000);
                      if (m < 1)  return "just now";
                      if (m < 60) return `${m}m ago`;
                      const h = Math.floor(m / 60);
                      if (h < 24) return `${h}h ago`;
                      return `${Math.floor(h / 24)}d ago`;
                    })();
                    if (ev.type === "item_created") {
                      const dot = ev.itemType === "bug" ? "act-dot-bug" : ev.itemType === "story" ? "act-dot-story" : "act-dot-task";
                      return (
                        <div key={ev.id} className="act-row">
                          <div className={"act-dot " + dot} />
                          <div className="act-body">
                            <span className="act-text">
                              <span className="act-item-title">{ev.title}</span> created
                              {ev.actor && <> by <span className="act-actor">{ev.actor}</span></>}
                            </span>
                            <span className="act-time">{ago}</span>
                          </div>
                        </div>
                      );
                    }
                    if (ev.type === "comment") {
                      const hasImg = /<(img|video)\b/i.test(ev.body ?? "");
                      const text = (ev.body ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
                      const preview = text || (hasImg ? "[image]" : "");
                      const truncated = preview.length > 140 ? preview.slice(0, 140) + "…" : preview;
                      return (
                        <div key={ev.id} className="act-row">
                          <div className="act-dot act-dot-comment" />
                          <div className="act-body">
                            <span className="act-text">
                              <span className="act-actor">{ev.actor}</span> commented on <span className="act-item-title">{ev.itemTitle}</span>
                            </span>
                            {truncated && <span className="act-quote">{truncated}{hasImg && text ? " · [image]" : ""}</span>}
                            <span className="act-time">{ago}</span>
                          </div>
                        </div>
                      );
                    }
                    // sprint_started | sprint_completed
                    return (
                      <div key={ev.id} className="act-row">
                        <div className={"act-dot " + (ev.type === "sprint_started" ? "act-dot-sprint-start" : "act-dot-sprint-end")} />
                        <div className="act-body">
                          <span className="act-text">
                            <span className="act-item-title">{ev.name}</span>{" "}
                            {ev.type === "sprint_started" ? "started" : "completed"}
                          </span>
                          <span className="act-time">{ago}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
});

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

// ─── Sprint Story Detail Panel ────────────────────────────────────────────────

// shortItemId and deriveProjectKey were dead code — removed.
// displayId is derived server-side using the item.number field (see apiItemToBL).

type Owner = { id: string; initials: string; name: string; color: string };

// Shared sidebar used by SprintStoryPanel and SubtaskDetailPanel
function PanelSidebar({
  itemId, projectId, allSprints, owners,
  status, onStatusChange, onAfterStatusChange,
  priority, onPriorityChange,
  ownerName, onOwnerChange,
  reporterId, onReporterChange,
  sprint, onSprintChange,
  pts, onPtsChange,
  dueDate, onDueDateChange,
  extraRows,
}: {
  itemId: string;
  projectId?: string;
  allSprints: BLSprintData[];
  owners: Owner[];
  status: BLStatus;
  onStatusChange: (s: BLStatus) => void;
  onAfterStatusChange?: (s: BLStatus) => void;
  priority: string;
  onPriorityChange: (p: string) => void;
  ownerName: string;
  onOwnerChange: (name: string) => void;
  reporterId?: string;
  onReporterChange?: (id: string) => void;
  sprint: string;
  onSprintChange: (name: string) => void;
  pts: number;
  onPtsChange: (v: number) => void;
  dueDate: string;
  onDueDateChange: (d: string) => void;
  extraRows?: React.ReactNode;
}) {
  const [openField, setOpenField] = useState<"status"|"priority"|"owner"|"reporter"|"sprint"|"pts"|null>(null);
  const owner = ownerName ? owners.find(o => o.name === ownerName) ?? null : null;
  const ownerDisplay = owner ?? { id: "", initials: "?", name: "Unassigned", color: "var(--proj-surface-3)" };

  return (
    <div className="tp-side" onClick={() => setOpenField(null)}>
      {/* Status */}
      <div className="tp-side-row">
        <div className="tp-side-label">Status</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <button className="sb-status-pill"
            style={{ color: PANEL_STATUS_COLORS[status], borderColor: PANEL_STATUS_COLORS[status] + "55", background: PANEL_STATUS_COLORS[status] + "14" }}
            onClick={() => setOpenField(openField === "status" ? null : "status")}>
            {PANEL_STATUS_LABELS[status]} <IChevDown style={{ width: 10, height: 10 }} />
          </button>
          {openField === "status" && (
            <div className="sb-status-drop">
              {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
                <button key={s} className={"sb-status-opt" + (s === status ? " active" : "")}
                  style={{ color: PANEL_STATUS_COLORS[s] }}
                  onClick={() => {
                    onStatusChange(s); onAfterStatusChange?.(s); setOpenField(null);
                    if (projectId) {
                      itemsApi.update(projectId, itemId, { status: BL_STATUS_TO_API[s] })
                        .catch(e => console.error("Failed to save status", e));
                    }
                  }}>
                  {PANEL_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Priority */}
      <div className="tp-side-row">
        <div className="tp-side-label">Priority</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <button className="sb-status-pill"
            style={{ color: PANEL_PRIO_COLORS[priority], borderColor: PANEL_PRIO_COLORS[priority] + "55", background: PANEL_PRIO_COLORS[priority] + "14", display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => setOpenField(openField === "priority" ? null : "priority")}>
            {prioIcon(priority, PANEL_PRIO_COLORS[priority], 10)}
            {priority} <IChevDown style={{ width: 10, height: 10 }} />
          </button>
          {openField === "priority" && (
            <div className="sb-status-drop">
              {PRIORITY_OPTS.map(p => (
                <button key={p} className={"sb-status-opt" + (p === priority ? " active" : "")}
                  style={{ color: PANEL_PRIO_COLORS[p], display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => {
                    onPriorityChange(p); setOpenField(null);
                    if (projectId) {
                      itemsApi.update(projectId, itemId, { priority: PRIO_TO_API[p] })
                        .catch(e => console.error("Failed to save priority", e));
                    }
                  }}>
                  {prioIcon(p, PANEL_PRIO_COLORS[p], 12)}
                  <span>{p}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Reporter */}
      <div className="tp-side-row">
        <div className="tp-side-label">Reporter</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <button className="sb-text-trigger"
            onClick={() => setOpenField(openField === "reporter" ? null : "reporter")}>
            {(() => {
              const r = owners.find(o => o.id === reporterId) ?? null;
              return r
                ? <><div style={{ width: 18, height: 18, borderRadius: "50%", background: r.color, display: "grid", placeItems: "center", fontSize: 9, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{r.initials}</div>{r.name}</>
                : <span className="sb-tt-muted">Unassigned</span>;
            })()}
            <IChevDown style={{ width: 10, height: 10, opacity: 0.5 }} />
          </button>
          {openField === "reporter" && (
            <div className="sb-status-drop" style={{ width: 180 }}>
              {owners.map(o => (
                <button key={"r-" + o.id} className={"sb-status-opt" + (o.id === reporterId ? " active" : "")}
                  style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
                  onClick={() => {
                    onReporterChange?.(o.id); setOpenField(null);
                    if (projectId) {
                      itemsApi.update(projectId, itemId, { reporterId: o.id })
                        .catch(e => console.error("Failed to save reporter", e));
                    }
                  }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: o.color, display: "grid", placeItems: "center", fontSize: 8, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{o.initials}</div>
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="tp-side-row">
        <div className="tp-side-label">Assignee</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <button className="sb-text-trigger"
            onClick={() => setOpenField(openField === "owner" ? null : "owner")}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: ownerDisplay.color, display: "grid", placeItems: "center", fontSize: 9, color: owner ? "#fff" : "var(--proj-text-4)", fontWeight: 700, flexShrink: 0, border: owner ? "none" : "1px dashed var(--proj-line-strong)" }}>{ownerDisplay.initials}</div>
            {owner ? owner.name : <span className="sb-tt-muted">Unassigned</span>} <IChevDown style={{ width: 10, height: 10, opacity: 0.5 }} />
          </button>
          {openField === "owner" && (
            <div className="sb-status-drop" style={{ width: 180 }}>
              <button className={"sb-status-opt" + (!ownerName ? " active" : "")}
                style={{ color: "var(--proj-text-3)", display: "flex", alignItems: "center", gap: 7 }}
                onClick={() => {
                  onOwnerChange(""); setOpenField(null);
                  if (projectId) itemsApi.setAssignee(projectId, itemId, null).catch(e => console.error("Failed to save assignee", e));
                }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--proj-surface-3)", display: "grid", placeItems: "center", fontSize: 8, color: "var(--proj-text-4)", fontWeight: 700, flexShrink: 0, border: "1px dashed var(--proj-line-strong)" }}>?</div>
                Unassigned
              </button>
              {owners.map(o => (
                <button key={o.name} className={"sb-status-opt" + (o.name === ownerName ? " active" : "")}
                  style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
                  onClick={() => {
                    onOwnerChange(o.name); setOpenField(null);
                    if (projectId) {
                      itemsApi.setAssignee(projectId, itemId, o.id)
                        .catch(e => console.error("Failed to save assignee", e));
                    }
                  }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: o.color, display: "grid", placeItems: "center", fontSize: 8, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{o.initials}</div>
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Sprint */}
      <div className="tp-side-row">
        <div className="tp-side-label">Sprint</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <button className="sb-text-trigger"
            onClick={() => setOpenField(openField === "sprint" ? null : "sprint")}>
            {sprint || <span className="sb-tt-muted">Backlog</span>} <IChevDown style={{ width: 10, height: 10, opacity: 0.5 }} />
          </button>
          {openField === "sprint" && (
            <div className="sb-status-drop" style={{ width: 160 }}>
              {allSprints.map(s => (
                <button key={s.id} className={"sb-status-opt" + (s.name === sprint ? " active" : "")}
                  style={{ color: "var(--proj-text)" }}
                  onClick={() => {
                    onSprintChange(s.name); setOpenField(null);
                    if (projectId) {
                      itemsApi.update(projectId, itemId, { sprintId: s.id })
                        .catch(e => console.error("Failed to update sprint", e));
                    }
                  }}>
                  {s.name}{s.active ? " (active)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Story pts */}
      <div className="tp-side-row">
        <div className="tp-side-label">Story pts</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          {openField === "pts"
            ? <div className="fib-picker" onMouseLeave={() => setOpenField(null)}>
                {ESTIMATE_OPTS.map(v => (
                  <button key={v} className={"fib-chip" + (pts === v ? " active" : "")}
                    onClick={() => {
                      onPtsChange(v as number); setOpenField(null);
                      if (projectId) {
                        itemsApi.update(projectId, itemId, { points: v as number })
                          .catch(e => console.error("Failed to save pts", e));
                      }
                    }}>{v}</button>
                ))}
                <button className="fib-chip" onClick={() => {
                  onPtsChange(0); setOpenField(null);
                  if (projectId) itemsApi.update(projectId, itemId, { points: 0 }).catch(() => {});
                }}>—</button>
              </div>
            : <button className="sb-text-trigger"
                onClick={() => setOpenField("pts")}>
                {pts ? `${pts} pts` : <span className="sb-tt-muted">— pts</span>} <IChevDown style={{ width: 10, height: 10, opacity: 0.5 }} />
              </button>
          }
        </div>
      </div>
      {/* Due date */}
      <div className="tp-side-row">
        <div className="tp-side-label">Due date</div>
        <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
          <input type="date" className="sb-date-input"
            value={dueDate}
            onChange={e => {
              onDueDateChange(e.target.value);
              if (projectId) {
                itemsApi.update(projectId, itemId, { dueDate: e.target.value || null })
                  .catch(err => console.error("Failed to save due date", err));
              }
            }}
          />
        </div>
      </div>
      {extraRows}
    </div>
  );
}

type ActivityTab = "comments" | "history";

const ACTIVITY_FIELD_LABEL: Record<string, string> = {
  title: "Title",
  description: "Description",
  type: "Type",
  status: "Status",
  priority: "Priority",
  points: "Story points",
  dueDate: "Due date",
  sprintId: "Sprint",
};

function activityDisplayValue(field: string, raw: string | null): string {
  if (raw === null || raw === undefined || raw === "") return "None";
  if (field === "dueDate") return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (field === "priority") {
    return ({ urgent: "Highest", high: "High", medium: "Medium", low: "Low", trivial: "Lowest" } as Record<string, string>)[raw] ?? raw;
  }
  return raw;
}

function relTime(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Module-level cache: skip refetching comments/activity for an item within 30s of open
const _itemActivityCache = new Map<string, { comments: ApiComment[]; activities: ApiItemActivity[]; fetchedAt: number }>();

function ActivitySection({ projectId, itemId, owners }: { projectId?: string; itemId?: string; owners?: Owner[] }) {
  const mentionSource = useCallback((query: string) => {
    const q = query.toLowerCase();
    return (owners ?? [])
      .filter(o => !q || o.name.toLowerCase().includes(q))
      .map(o => ({ id: o.id, name: o.name, initials: o.initials, color: o.color }));
  }, [owners]);
  const [tab, setTab] = useState<ActivityTab>("comments");
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [activities, setActivities] = useState<ApiItemActivity[]>([]);
  const [commentHtml, setCommentHtml] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [sending, setSending] = useState(false);
  const hasContent = commentHtml.replace(/<[^>]+>/g, "").trim().length > 0
    || /<(img|video|iframe)\b/i.test(commentHtml);
  const reload = useCallback(() => {
    if (!projectId || !itemId) return;
    const cache = _itemActivityCache.get(itemId);
    if (cache && Date.now() - cache.fetchedAt < 30_000) {
      setComments(cache.comments);
      setActivities(cache.activities);
      return;
    }
    Promise.all([
      commentsApi.list(projectId, itemId).catch(() => null),
      itemActivityApi.list(projectId, itemId).catch(() => null),
    ]).then(([c, a]) => {
      if (c) setComments(c);
      if (a) setActivities(a);
      _itemActivityCache.set(itemId, {
        comments: c ?? [],
        activities: a ?? [],
        fetchedAt: Date.now(),
      });
    });
  }, [projectId, itemId]);
  useEffect(() => { reload(); }, [reload]);

  const submitComment = async () => {
    if (!projectId || !itemId || !hasContent) return;
    setSending(true);
    try {
      const created = await commentsApi.create(projectId, itemId, commentHtml);
      setComments(p => [...p, created]);
      // Invalidate cache so reopen shows the fresh list immediately
      _itemActivityCache.delete(itemId);
      setCommentHtml("");
      setInitialContent("");
      setComposerOpen(false);
      setEditorKey(k => k + 1);
    } finally {
      setSending(false);
    }
  };

  const cancelComment = () => {
    setCommentHtml("");
    setInitialContent("");
    setComposerOpen(false);
    setEditorKey(k => k + 1);
  };


  type Entry = { kind: "comment"; data: ApiComment; at: string } | { kind: "history"; data: ApiItemActivity; at: string };
  const all: Entry[] = [
    ...comments.map(c => ({ kind: "comment" as const, data: c, at: c.createdAt })),
    ...activities.map(a => ({ kind: "history" as const, data: a, at: a.createdAt })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const filtered = tab === "comments"
    ? all.filter(e => e.kind === "comment")
    : all.filter(e => e.kind === "history");

  return (
    <div className="act-sec">
      <div className="act-sec-head">
        <span className="tp-subsec-label">Activity</span>
      </div>
      <div className="act-tabs">
        {(["comments", "history"] as ActivityTab[]).map(t => (
          <button
            key={t}
            className={"act-tab" + (tab === t ? " active" : "")}
            onClick={() => setTab(t)}
          >
            {t === "comments" ? "Comments" : "History"}
          </button>
        ))}
      </div>

          {tab === "comments" && (
            composerOpen ? (
              <div className="act-comment-box">
                <RichEditor
                  key={editorKey}
                  content={initialContent}
                  placeholder="Add a comment…"
                  onChange={html => setCommentHtml(html)}
                  minHeight={80}
                  mentionSource={mentionSource}
                  attachmentOwner={itemId ? { ownerType: "item", ownerId: itemId } : undefined}
                />
                <div className="act-comment-actions">
                  <button className="act-comment-cancel" onClick={cancelComment} disabled={sending}>Cancel</button>
                  <button className="act-comment-submit" onClick={submitComment} disabled={!hasContent || sending}>
                    {sending ? "Posting…" : "Comment"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="act-comment-rest" onClick={() => setComposerOpen(true)}>
                <div className="act-comment-rest-prompt">Add a comment…</div>
              </div>
            )
          )}

          {filtered.length === 0 ? (
            <div className="act-empty">{tab === "history" ? "No history yet." : "No comments yet."}</div>
          ) : (
            <div className="act-list">
              {filtered.map(e => {
                if (e.kind === "comment") {
                  const c = e.data;
                  return (
                    <div key={"c-" + c.id} id={`comment-${c.id}`} className="act-item">
                      <div className="act-avatar" style={{ background: userColor(c.author.id) }}>{userInitials(c.author.name)}</div>
                      <div className="act-item-body">
                        <div className="act-item-head">
                          <b>{c.author.name}</b>
                          <span className="act-item-action">commented</span>
                          <span className="act-item-time">{relTime(c.createdAt)}</span>
                        </div>
                        <div className="act-comment-body"><RichEditor editable={false} content={c.body} /></div>
                      </div>
                    </div>
                  );
                }
                const a = e.data;
                return (
                  <div key={"h-" + a.id} className="act-item">
                    <div className="act-avatar" style={{ background: userColor(a.user.id) }}>{userInitials(a.user.name)}</div>
                    <div className="act-item-body">
                      <div className="act-item-head">
                        <b>{a.user.name}</b>
                        <span className="act-item-action">changed the {ACTIVITY_FIELD_LABEL[a.field] ?? a.field}</span>
                        <span className="act-item-time">{relTime(a.createdAt)}</span>
                      </div>
                      <div className="act-history-row">
                        <span className="act-history-chip">{activityDisplayValue(a.field, a.fromValue)}</span>
                        <span className="act-arrow">→</span>
                        <span className="act-history-chip">{activityDisplayValue(a.field, a.toValue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}

function SprintStoryPanel({
  story, childItems: children, sprintName, allSprints, color, onClose, onClone, onDelete, onStatusChange, onSubtaskCreated, onItemChange, onOpenSubtask, projectName, projectId, projectKey, owners, availableStories,
}: {
  story: BLItem | null;
  childItems: BLItem[];
  sprintName: string;
  allSprints: BLSprintData[];
  color: string;
  onClose: () => void;
  onClone?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onStatusChange?: (itemId: string, status: BLStatus) => void;
  onSubtaskCreated?: (subtask: BLItem) => void;
  onItemChange?: (itemId: string, changes: Partial<BLItem>) => void;
  onOpenSubtask?: (item: BLItem) => void;
  projectName?: string;
  projectId?: string;
  projectKey?: string;
  owners: Owner[];
  availableStories?: BLItem[];
}) {
  const [_editing, _setEditing]       = useState(false);
  const [deleteMode, setDeleteMode]   = useState<"cascade" | "reassign">("cascade");
  const [reassignTarget, setReassignTarget] = useState<string>("");
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState(() => story?.description ? `<p>${story.description}</p>` : "");
  const mentionSource = useCallback((query: string) => {
    const q = query.toLowerCase();
    return owners
      .filter(o => !q || o.name.toLowerCase().includes(q))
      .map(o => ({ id: o.id, name: o.name, initials: o.initials, color: o.color }));
  }, [owners]);
  const [openStatus, setOpenStatus]   = useState<string | null>(null);
  const [storyStatus, setStoryStatus] = useState<BLStatus>(story?.status ?? "todo");
  const [ownerName, setOwnerName]     = useState(story?.assigneeName ?? "");
  const [reporterId, setReporterId]   = useState<string>(story?.reporter?.id ?? "");
  const [sprint, setSprint]           = useState(sprintName);
  const [pts, setPts]                 = useState<number>(story ? ((story.pts ?? 0) + children.reduce((a, c) => a + (c.pts ?? 0), 0)) : 0);
  const BL_PRIO_TO_LABEL: Record<string, string> = { "tp-highest": "Highest", "tp-high": "High", "tp-med": "Medium", "tp-low": "Low", "tp-lowest": "Lowest" };
  const [priority, setPriority]       = useState(BL_PRIO_TO_LABEL[story?.priority ?? ""] ?? "Medium");
  const [dueDate, setDueDate]         = useState(story?.dueDate ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localChildren, setLocalChildren] = useState<BLItem[]>(children);
  const [rowDensity, setRowDensity] = useState<"compact"|"normal"|"relaxed">("normal");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openChildPrio, setOpenChildPrio] = useState<string | null>(null);
  const [openChildAssignee, setOpenChildAssignee] = useState<string | null>(null);
  async function saveChildTitle(child: BLItem, newTitle: string) {
    const trimmed = newTitle.trim();
    setEditingChildId(null);
    if (!trimmed || trimmed === child.title) return;
    setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, title: trimmed } : c));
    onItemChange?.(child.id, { title: trimmed });
    if (projectId) {
      try { await itemsApi.update(projectId, child.id, { title: trimmed }); }
      catch(err) {
        console.error("update subtask title failed", err);
        setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, title: child.title } : c));
        onItemChange?.(child.id, { title: child.title });
      }
    }
  }

  if (!story) return null;

  const done  = children.filter(c => c.status === "done").length;
  const total = children.length;
  const prog  = total > 0 ? Math.round(done / total * 100) : 0;

  const _STATUS_COLORS = PANEL_STATUS_COLORS;
  const _STATUS_LABELS = PANEL_STATUS_LABELS;
  const _TYPE_LABEL    = PANEL_TYPE_LABEL;
  const _PRIO_COLORS   = PANEL_PRIO_COLORS;

  return (
    <>
      <div className="tp-backdrop open" style={{ animation: "fadeIn 0.2s ease" }} onClick={onClose} />
      <aside className="task-panel task-panel--wide open panel-animate" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span style={{ color: "var(--proj-text-3)", fontSize: 12 }}>{sprintName}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span className="tp-crumb-id" style={{ color: color }}>
              {story?.displayId ?? story?.id.slice(-6)}
            </span>
          </div>
          <div className="tp-head-actions">
            <PanelHeaderActions
              onClose={onClose}
              onClone={onClone}
              onDelete={onDelete && (async () => {
                if (children.length > 0 && deleteMode === "reassign" && projectId) {
                  for (const c of children) {
                    try {
                      await itemsApi.update(projectId, c.id, { parentId: reassignTarget || null });
                      onItemChange?.(c.id, { parentStoryId: reassignTarget || undefined });
                    } catch (e) { console.error("reparent failed", e); }
                  }
                }
                await onDelete();
              })}
              kind="story"
              deleteExtras={children.length > 0 ? (
                <div className="story-del-extras">
                  <div className="story-del-extras-label">This story has {children.length} subtask{children.length !== 1 ? "s" : ""}. What should happen to them?</div>
                  <label className="story-del-opt">
                    <input type="radio" name="story-del-mode" checked={deleteMode === "cascade"} onChange={() => setDeleteMode("cascade")} />
                    <span>Delete all subtasks too</span>
                  </label>
                  <label className="story-del-opt">
                    <input type="radio" name="story-del-mode" checked={deleteMode === "reassign"} onChange={() => setDeleteMode("reassign")} />
                    <span>Move subtasks to:</span>
                  </label>
                  {deleteMode === "reassign" && (
                    <select className="story-del-target" value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}>
                      <option value="">No parent (orphan)</option>
                      {(availableStories ?? []).filter(s => s.id !== story?.id).map(s => (
                        <option key={s.id} value={s.id}>{s.displayId ? `${s.displayId} — ` : ""}{s.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : undefined}
            />
          </div>
        </div>

        <div className="tp-body">
          <div className="tp-main">

            {/* Story type chip */}
            <div className="tp-status-row">
              <div className="tp-mini-chip" style={{ background: color + "18", color, border: `1px solid ${color}40` }}>
                <IFlag style={{ width: 10, height: 10, marginRight: 4 }} />
                Story
              </div>
            </div>

            {/* Title — click to edit */}
            {titleEditing
              ? <input
                  className="cs-input tp-title-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (story && projectId && title.trim()) {
                      itemsApi.update(projectId, story.id, { title: title.trim() }).catch(e => console.error(e));
                      onItemChange?.(story.id, { title: title.trim() });
                    }
                    setTitleEditing(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setTitle(story.title); setTitleEditing(false); }
                  }}
                />
              : <h2 className="tp-title tp-title-click" onClick={() => { setTitle(title || story.title); setTitleEditing(true); }}>
                  {title || story.title}
                </h2>
            }

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--proj-text-3)", marginBottom: 6 }}>
                <span>Progress</span>
                <span>{done} / {total} tasks · {prog}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--proj-surface-3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: prog + "%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
              </div>
            </div>

            {/* Description — click to edit */}
            <div className="tp-sec-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Description</span>
              {descEditing && (
                <button className="proj-btn-primary" style={{ fontSize: 10.5, padding: "3px 10px" }}
                  onClick={() => {
                    if (story && projectId) {
                      const raw = desc.replace(/<[^>]+>/g, "").trim();
                      itemsApi.update(projectId, story.id, { description: raw }).catch(e => console.error(e));
                      onItemChange?.(story.id, { description: raw });
                    }
                    setDescEditing(false);
                  }}>Save</button>
              )}
            </div>
            <div
              className={"tp-desc-area" + (descEditing ? " tp-desc-editing" : "")}
              onClick={() => !descEditing && setDescEditing(true)}
              title={descEditing ? undefined : "Click to edit description"}
            >
              <RichEditor content={desc} editable={descEditing} onChange={setDesc} minHeight={descEditing ? 120 : undefined} mentionSource={mentionSource} />
              {!descEditing && !desc.replace(/<[^>]+>/g,"").trim() && (
                <div className="tp-desc-placeholder">Click to add a description…</div>
              )}
            </div>

            {/* Sub-tasks table */}
            <div className="tp-subsec-hd">
              <span className="tp-subsec-label">
                Sub-tasks
                <span className="tp-subsec-count">{localChildren.filter(c=>c.status==="done").length}/{localChildren.length}</span>
              </span>
              <div className="tp-subsec-actions">
                <div className="stc-density">
                  {(["compact","normal","relaxed"] as const).map(d => (
                    <button key={d} className={"stc-density-btn"+(rowDensity===d?" active":"")} onClick={()=>setRowDensity(d)}>
                      {d==="compact"?"S":d==="normal"?"M":"L"}
                    </button>
                  ))}
                </div>
                <button className="proj-btn-ghost" style={{ fontSize: 10.5, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => { setAddingSubtask(true); setNewSubtaskTitle(""); }}>
                  <IPlus style={{ width: 10, height: 10 }} /> Add
                </button>
              </div>
            </div>

            <div className="stc-wrap" data-density={rowDensity} onClick={e => e.stopPropagation()}>
              <TableResizableContainer>
                <Table className="stc-root">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Sub-tasks" selectionMode="none">
                      <Table.Header>
                        <Table.Column isRowHeader defaultWidth={250} minWidth={120} className="stc-col">
                          Work<Table.ColumnResizer />
                        </Table.Column>
                        <Table.Column defaultWidth={120} minWidth={90} maxWidth={180} className="stc-col">
                          Priority<Table.ColumnResizer />
                        </Table.Column>
                        <Table.Column defaultWidth={96} minWidth={70} maxWidth={140} className="stc-col">
                          Assignee<Table.ColumnResizer />
                        </Table.Column>
                        <Table.Column defaultWidth={96} minWidth={70} maxWidth={140} className="stc-col">
                          Status
                        </Table.Column>
                      </Table.Header>
                      <Table.Body renderEmptyState={() => (
                        <div className="stc-empty">{addingSubtask ? "" : "No subtasks yet — click Add"}</div>
                      )}>
                        {localChildren.map(child => {
                          const isDone = child.status === "done";
                          const pc = child.priority === "tp-high" ? "#F97316" : child.priority === "tp-med" ? "#F5A524" : "#9A9FAB";
                          const _pl = child.priority === "tp-high" ? "High" : child.priority === "tp-med" ? "Medium" : "Low";
                          const _prioIcon = child.priority === "tp-high"
                            ? <svg width="11" height="11" viewBox="0 0 12 12" fill={pc}><path d="M6 1L10 7H2L6 1Z"/></svg>
                            : child.priority === "tp-med"
                            ? <svg width="11" height="7" viewBox="0 0 12 8"><rect y="0" width="12" height="2.5" rx="1" fill={pc}/><rect y="5" width="12" height="2.5" rx="1" fill={pc}/></svg>
                            : <svg width="11" height="11" viewBox="0 0 12 12" fill={pc}><path d="M6 11L2 5H10L6 11Z"/></svg>;
                          const displayId = child.displayId ?? child.id.slice(-6);
                          return (
                            <Table.Row key={child.id} id={child.id} className={isDone ? "stc-row-done" : ""}>
                              <Table.Cell className="stc-cell">
                                <div className="stc-work-cell">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                                    <rect x="8" y="8" width="13" height="13" rx="2"/><path d="M3 16V5a2 2 0 0 1 2-2h11"/>
                                  </svg>
                                  <button className="stc-id" onClick={() => onOpenSubtask?.(child)}>{displayId}</button>
                                  {editingChildId === child.id ? (
                                    <input
                                      className="stc-title-input"
                                      value={editingTitle}
                                      autoFocus
                                      onChange={e => setEditingTitle(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") { e.preventDefault(); saveChildTitle(child, editingTitle); }
                                        if (e.key === "Escape") { setEditingChildId(null); }
                                      }}
                                      onBlur={() => saveChildTitle(child, editingTitle)}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  ) : (
                                    <>
                                      <span className={"stc-name"+(isDone?" stc-name-done":"")} onClick={() => onOpenSubtask?.(child)}>{child.title}</span>
                                      <button className="stc-edit-btn" title="Edit title"
                                        onClick={e => { e.stopPropagation(); setEditingChildId(child.id); setEditingTitle(child.title); }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </Table.Cell>
                              <Table.Cell className="stc-cell">
                                <PortalPrioPill
                                  priority={child.priority}
                                  itemId={child.id}
                                  openFor={openChildPrio}
                                  onOpen={setOpenChildPrio}
                                  onChange={(key, api) => {
                                    setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, priority: key } : c));
                                    onItemChange?.(child.id, { priority: key });
                                    if (projectId) itemsApi.update(projectId, child.id, { priority: api }).catch(console.error);
                                  }}
                                />
                              </Table.Cell>
                              <Table.Cell className="stc-cell">
                                <PortalAssigneePill
                                  assigneeName={child.assignees?.[0]?.name}
                                  assigneeColor={child.assignees?.[0]?.color}
                                  assigneeInitials={child.assignees?.[0]?.initials}
                                  itemId={child.id}
                                  openFor={openChildAssignee}
                                  onOpen={setOpenChildAssignee}
                                  owners={owners}
                                  onChange={o => {
                                    const changes = { assigneeName: o.name || undefined, assignees: o.id ? [o] : [] };
                                    setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, ...changes } : c));
                                    onItemChange?.(child.id, changes);
                                    if (projectId) {
                                      itemsApi.setAssignee(projectId, child.id, o.id || null).catch(console.error);
                                    }
                                  }}
                                />
                              </Table.Cell>
                              <Table.Cell className="stc-cell">
                                <PortalStatusPill status={child.status} itemId={child.id}
                                  openFor={openStatus} onOpen={setOpenStatus}
                                  onChange={s => { onStatusChange?.(child.id, s); setOpenStatus(null); setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, status: s } : c)); }} />
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </TableResizableContainer>

              {addingSubtask && (
                <div className="subtask-add-row">
                  <div className="subtask-add-inner">
                    <input
                      className="subtask-add-input"
                      placeholder="Subtask title…"
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      autoFocus
                      onKeyDown={async e => {
                        if (e.key === "Enter") {
                          if (!newSubtaskTitle.trim() || !projectId) return;
                          const tmp: BLItem = { id: `tmp-${Date.now()}`, displayId: "...", title: newSubtaskTitle.trim(), type: "task", status: "todo", priority: "tp-med", parentStoryId: story.id };
                          setLocalChildren(prev => [...prev, tmp]);
                          setNewSubtaskTitle(""); setAddingSubtask(false);
                          try {
                            const created = await itemsApi.create(projectId, { title: tmp.title, type: "task", parentId: story.id });
                            const blItem = apiItemToBL(created, story.id, projectKey);
                            setLocalChildren(prev => prev.map(c => c.id === tmp.id ? blItem : c));
                            onSubtaskCreated?.(blItem);
                          } catch(err) {
                            console.error("create subtask failed", err);
                            setLocalChildren(prev => prev.filter(c => c.id !== tmp.id));
                          }
                        }
                        if (e.key === "Escape") { setAddingSubtask(false); setNewSubtaskTitle(""); }
                      }}
                    />
                    <button
                      className="subtask-add-confirm"
                      disabled={!newSubtaskTitle.trim()}
                      onClick={async () => {
                        if (!newSubtaskTitle.trim() || !projectId) return;
                        const tmp: BLItem = { id: `tmp-${Date.now()}`, displayId: "...", title: newSubtaskTitle.trim(), type: "task", status: "todo", priority: "tp-med", parentStoryId: story.id };
                        setLocalChildren(prev => [...prev, tmp]);
                        setNewSubtaskTitle(""); setAddingSubtask(false);
                        try {
                          const created = await itemsApi.create(projectId, { title: tmp.title, type: "task", parentId: story.id });
                          const blItem = apiItemToBL(created, story.id, projectKey);
                          setLocalChildren(prev => prev.map(c => c.id === tmp.id ? blItem : c));
                          onSubtaskCreated?.(blItem);
                        } catch(err) {
                          console.error("create subtask failed", err);
                          setLocalChildren(prev => prev.filter(c => c.id !== tmp.id));
                        }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      Add
                    </button>
                    <button className="subtask-add-cancel" onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(""); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <ActivitySection projectId={projectId} itemId={story?.id} owners={owners} />

          </div>

          {/* Sidebar */}
          <PanelSidebar
            itemId={story.id}
            projectId={projectId}
            allSprints={allSprints}
            owners={owners}
            status={storyStatus}
            onStatusChange={s => { setStoryStatus(s); onItemChange?.(story.id, { status: s }); }}
            priority={priority}
            onPriorityChange={p => {
              setPriority(p);
              const blKey = ({ "Highest": "tp-highest", "High": "tp-high", "Medium": "tp-med", "Low": "tp-low", "Lowest": "tp-lowest" } as const)[p as "Highest"|"High"|"Medium"|"Low"|"Lowest"];
              if (blKey) onItemChange?.(story.id, { priority: blKey });
            }}
            ownerName={ownerName}
            onOwnerChange={name => {
              setOwnerName(name);
              const o = owners.find(x => x.name === name);
              onItemChange?.(story.id, {
                assigneeName: name || undefined,
                assignees: o ? [{ id: o.id, name: o.name, initials: o.initials, color: o.color }] : [],
              });
            }}
            reporterId={reporterId}
            onReporterChange={id => {
              setReporterId(id);
              const r = owners.find(o => o.id === id);
              onItemChange?.(story.id, { reporter: r ? { id: r.id, name: r.name, initials: r.initials, color: r.color } : null });
            }}
            sprint={sprint}
            onSprintChange={name => setSprint(name)}
            pts={pts}
            onPtsChange={v => { setPts(v); onItemChange?.(story.id, { pts: v }); }}
            dueDate={dueDate}
            onDueDateChange={d => { setDueDate(d); onItemChange?.(story.id, { dueDate: d }); }}
            extraRows={
              <>
                <div className="tp-side-row">
                  <div className="tp-side-label">Tasks</div>
                  <div className="tp-side-val">{done} done / {total} total</div>
                </div>
                <div className="tp-sep" />
                <div className="tp-side-row">
                  <div className="tp-side-label">Breakdown</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => {
                      const count = children.filter(c => c.status === s).length;
                      if (!count) return null;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: PANEL_STATUS_COLORS[s], flexShrink: 0 }} />
                          <span style={{ flex: 1, color: "var(--proj-text-2)" }}>{PANEL_STATUS_LABELS[s]}</span>
                          <span style={{ fontWeight: 600, color: "var(--proj-text)" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            }
          />
        </div>
      </aside>
    </>
  );
}

// ─── Subtask Detail Panel ─────────────────────────────────────────────────────

function SubtaskDetailPanel({
  item, parentTitle, sprintName, allSprints, color, onClose, onClone, onDelete, onStatusChange, onItemChange, projectName, projectId, owners,
}: {
  item: BLItem;
  parentTitle: string;
  sprintName: string;
  allSprints: BLSprintData[];
  color: string;
  onClose: () => void;
  onClone?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onStatusChange?: (itemId: string, status: BLStatus) => void;
  onItemChange?: (itemId: string, changes: Partial<BLItem>) => void;
  projectName?: string;
  projectId?: string;
  owners: Owner[];
}) {
  const [desc, setDesc]               = useState(() => item.description ? `<p>${item.description}</p>` : "");
  const [descEditing, setDescEditing] = useState(false);
  const [storyStatus, setStoryStatus] = useState<BLStatus>(item.status);
  const [ownerName, setOwnerName]     = useState(item.assigneeName ?? "");
  const [reporterId, setReporterId]   = useState<string>(item.reporter?.id ?? "");
  const mentionSource = useCallback((query: string) => {
    const q = query.toLowerCase();
    return owners
      .filter(o => !q || o.name.toLowerCase().includes(q))
      .map(o => ({ id: o.id, name: o.name, initials: o.initials, color: o.color }));
  }, [owners]);
  const [sprint, setSprint]           = useState(sprintName);
  const [pts, setPts]                 = useState<number>(item.pts ?? 0);
  const [priority, setPriority]       = useState(() => {
    const m: Record<string, string> = { "tp-highest": "Highest", "tp-high": "High", "tp-med": "Medium", "tp-low": "Low", "tp-lowest": "Lowest" };
    return m[item.priority ?? ""] ?? "Medium";
  });
  const [dueDate, setDueDate]         = useState(item.dueDate ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [title, setTitle]             = useState(item.title);

  return (
    <aside className="task-panel task-panel--wide open panel-animate" style={{ zIndex: 202 }} onClick={e => e.stopPropagation()}>
      <div className="tp-head">
        <div className="tp-crumb">
          <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
          <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
          <span style={{ color: "var(--proj-text-3)", fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parentTitle}</span>
          <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
          <span className="tp-crumb-id" style={{ color }}>{item.displayId}</span>
        </div>
        <div className="tp-head-actions">
          <PanelHeaderActions onClose={onClose} onClone={onClone} onDelete={onDelete} kind="subtask" />
        </div>
      </div>

      <div className="tp-body">
        <div className="tp-main">

          {/* Type chip */}
          <div className="tp-status-row">
            <div className="tp-mini-chip" style={{ background: color + "18", color, border: `1px solid ${color}40` }}>
              <ICheck style={{ width: 10, height: 10, marginRight: 4 }} />
              {PANEL_TYPE_LABEL[item.type]}
            </div>
          </div>

          {titleEditing
            ? <input
                className="cs-input tp-title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                onBlur={() => {
                  if (projectId && title.trim()) {
                    itemsApi.update(projectId, item.id, { title: title.trim() }).catch(e => console.error(e));
                    onItemChange?.(item.id, { title: title.trim() });
                  }
                  setTitleEditing(false);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") { setTitle(item.title); setTitleEditing(false); }
                }}
              />
            : <h2 className="tp-title tp-title-click" onClick={() => { setTitle(title || item.title); setTitleEditing(true); }}>
                {title || item.title}
              </h2>
          }

          <div className="tp-sec-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Description</span>
            {descEditing && (
              <button className="proj-btn-primary" style={{ fontSize: 10.5, padding: "3px 10px" }}
                onClick={() => {
                  if (projectId) {
                    const raw = desc.replace(/<[^>]+>/g, "").trim();
                    itemsApi.update(projectId, item.id, { description: raw }).catch(e => console.error(e));
                    onItemChange?.(item.id, { description: raw });
                  }
                  setDescEditing(false);
                }}>Save</button>
            )}
          </div>
          <div
            className={"tp-desc-area" + (descEditing ? " tp-desc-editing" : "")}
            onClick={() => !descEditing && setDescEditing(true)}
            title={descEditing ? undefined : "Click to edit description"}
          >
            <RichEditor content={desc} editable={descEditing} onChange={setDesc} minHeight={descEditing ? 140 : undefined} mentionSource={mentionSource} />
            {!descEditing && !desc.replace(/<[^>]+>/g,"").trim() && (
              <div className="tp-desc-placeholder">Click to add a description…</div>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <PanelSidebar
          itemId={item.id}
          projectId={projectId}
          allSprints={allSprints}
          owners={owners}
          status={storyStatus}
          onStatusChange={s => { setStoryStatus(s); onItemChange?.(item.id, { status: s }); }}
          onAfterStatusChange={s => onStatusChange?.(item.id, s)}
          priority={priority}
          onPriorityChange={p => {
            setPriority(p);
            const blKey = ({ "Highest": "tp-highest", "High": "tp-high", "Medium": "tp-med", "Low": "tp-low", "Lowest": "tp-lowest" } as const)[p as "Highest"|"High"|"Medium"|"Low"|"Lowest"];
            if (blKey) onItemChange?.(item.id, { priority: blKey });
          }}
          ownerName={ownerName}
          onOwnerChange={name => {
            setOwnerName(name);
            const o = owners.find(x => x.name === name);
            onItemChange?.(item.id, {
              assigneeName: name || undefined,
              assignees: o ? [{ id: o.id, name: o.name, initials: o.initials, color: o.color }] : [],
            });
          }}
          reporterId={reporterId}
          onReporterChange={id => {
            setReporterId(id);
            const r = owners.find(o => o.id === id);
            onItemChange?.(item.id, { reporter: r ? { id: r.id, name: r.name, initials: r.initials, color: r.color } : null });
          }}
          sprint={sprint}
          onSprintChange={name => setSprint(name)}
          pts={pts}
          onPtsChange={v => { setPts(v); onItemChange?.(item.id, { pts: v }); }}
          dueDate={dueDate}
          onDueDateChange={d => { setDueDate(d); onItemChange?.(item.id, { dueDate: d }); }}
        />
      </div>
    </aside>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

const SPRINT_STORY_COLORS = ["var(--blue)", "var(--purple)", "var(--orange)", "var(--green)", "var(--amber)"];

const BoardTab = memo(function BoardTab({ onOpenPanel, onOpenCreate, onOpenCard, onOpenStory, activeSprint, allSprints, onSprintStatusChange, onCompleteSprint, onSubtaskCreated, onItemChange, projectName, projectId, projectKey, owners }: {
  onOpenPanel: () => void;
  onOpenCreate: () => void;
  onOpenCard?: (c: CardPreview) => void;
  onOpenStory?: (story: BLItem, color: string) => void;
  activeSprint?: BLSprintData;
  allSprints: BLSprintData[];
  onSprintStatusChange?: (itemId: string, status: BLStatus) => void;
  onCompleteSprint?: (sprintId: string) => void;
  onSubtaskCreated?: (sprintId: string, subtask: BLItem) => void;
  onItemChange?: (itemId: string, changes: Partial<BLItem>) => void;
  projectName?: string;
  projectId?: string;
  projectKey?: string;
  owners: Owner[];
}) {
  const [collapsed, setCollapsed]             = useState<Record<string, boolean>>({});
  const [openStoryStatus, setOpenStoryStatus] = useState<string | null>(null);
  const [sprintDragId,   setSprintDragId]   = useState<string | null>(null);
  const [sprintDragOver, setSprintDragOver] = useState<string | null>(null);
  const [search, setSearch]                  = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen]   = useState(false);
  const [quickAdd, setQuickAdd]               = useState<{ storyId: string; status: BLStatus } | null>(null);
  const [quickAddTitle, setQuickAddTitle]     = useState("");
  const [quickAddSaving, setQuickAddSaving]   = useState(false);

  async function commitQuickAdd() {
    if (!quickAdd || !projectId) return;
    const title = quickAddTitle.trim();
    if (!title) { setQuickAdd(null); setQuickAddTitle(""); return; }
    setQuickAddSaving(true);
    try {
      const data: { title: string; type: string; status: string; parentId?: string; sprintId?: string } = {
        title, type: "task", status: COL_STATUS[quickAdd.status] ?? "To Do",
      };
      if (quickAdd.storyId !== "__orphan__") data.parentId = quickAdd.storyId;
      if (activeSprint?.id) data.sprintId = activeSprint.id;
      const created = await itemsApi.create(projectId, data);
      if (activeSprint?.id) {
        const parentId = quickAdd.storyId === "__orphan__" ? undefined : quickAdd.storyId;
        onSubtaskCreated?.(activeSprint.id, apiItemToBL(created, parentId, projectKey));
      }
      setQuickAdd(null);
      setQuickAddTitle("");
    } catch (e) {
      console.error(e);
    } finally {
      setQuickAddSaving(false);
    }
  }
  function cancelQuickAdd() { setQuickAdd(null); setQuickAddTitle(""); }
  const q = search.trim().toLowerCase();
  const assigneeFilterOn = selectedAssignees.size > 0 || includeUnassigned;
  const filterActive = !!q || assigneeFilterOn;
  const matchItem = (i: BLItem) => {
    if (q) {
      const titleHit = i.title.toLowerCase().includes(q);
      const idHit = i.displayId?.toLowerCase().includes(q) ?? false;
      if (!titleHit && !idHit) return false;
    }
    if (assigneeFilterOn) {
      const assignees = i.assignees ?? [];
      const memberHit = assignees.some(a => selectedAssignees.has(a.id));
      const unassignedHit = includeUnassigned && assignees.length === 0;
      if (!memberHit && !unassignedHit) return false;
    }
    return true;
  };
  const toggleAssignee = (id: string) => setSelectedAssignees(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  useEffect(() => {
    if (!assigneeMenuOpen) return;
    const close = () => setAssigneeMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [assigneeMenuOpen]);
  const highlight = (text: string): React.ReactNode => {
    if (!q || !text) return text;
    const lower = text.toLowerCase();
    const parts: React.ReactNode[] = [];
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(q, i);
      if (idx === -1) { parts.push(text.slice(i)); break; }
      if (idx > i) parts.push(text.slice(i, idx));
      parts.push(<mark key={idx} className="board-search-hit">{text.slice(idx, idx + q.length)}</mark>);
      i = idx + q.length;
    }
    return <>{parts}</>;
  };

  function renderBoardCard(card: ReturnType<typeof blItemToCard>, colStatus = "To Do") {
    const dragging = sprintDragId === card.id;
    return (
      <div key={card.id}
        className={"t-card " + card.prio + (dragging ? " dragging" : "")}
        draggable
        onDragStart={() => setSprintDragId(card.id)}
        onDragEnd={() => { setSprintDragId(null); setSprintDragOver(null); }}
        onClick={() => onOpenCard ? onOpenCard({
          id: card.id, displayId: card.displayId, title: card.title, prio: card.prio, status: colStatus,
          pts: card.pts, dueDate: card.dueDate, description: card.description,
          assignees: card.assignees, reporter: card.reporter, blSubtasks: card.blSubtasks,
          sprintId: card.sprintId, parentStoryId: card.parentStoryId,
        }) : onOpenPanel()}
      >
        <div className="t-meta-row">
          <span className="t-id">{highlight(card.displayId)}</span>
          {card.prio && (() => {
            const pl = PRIO_LABEL[card.prio] ?? "Medium";
            const pc = PANEL_PRIO_COLORS[pl] ?? "#9A9FAB";
            return (
              <span title={pl} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 4, background: pc + "14", marginLeft: "auto" }}>
                {prioIcon(pl, pc, 12)}
              </span>
            );
          })()}
        </div>
        <div className="t-title">{highlight(card.title)}</div>
        {card.sub && (
          <div className="t-sub">
            <span>{card.sub.done}/{card.sub.total} subtasks</span>
            <div className="t-sub-bar"><div style={{ width: `${(card.sub.done/card.sub.total)*100}%` }} /></div>
          </div>
        )}
        <div className="t-foot">
          <div className="t-foot-people">
            {card.avs.length > 0 ? card.avs.slice(0, 2).map(av => (
              <div key={av.initials} className="pav pav-sm" title="Assignee" style={{ background: av.color, fontSize: 9 }}>{av.initials}</div>
            )) : (
              <div className="pav pav-sm" title="Unassigned" style={{ background: "var(--proj-surface-3)", color: "var(--proj-text-4)", fontSize: 9, border: "1px dashed var(--proj-line-strong)" }}>?</div>
            )}
          </div>
          {card.dueText && card.dueText !== "—" && (
            <div className={"t-due " + card.due}>{card.dueText}</div>
          )}
        </div>
      </div>
    );
  }

  function renderStoryKanban(
    children: BLItem[],
    groupId: string,
    onCardDrop?: (itemId: string, newStatus: BLStatus) => void,
  ) {
    const cols = [
      { name: "TO DO",       pill: "kp-todo", status: "todo"        as BLStatus, items: children.filter(c => c.status === "todo") },
      { name: "IN PROGRESS", pill: "kp-prog", status: "in-progress" as BLStatus, items: children.filter(c => c.status === "in-progress") },
      { name: "REVIEW",      pill: "kp-rev",  status: "in-review"   as BLStatus, items: children.filter(c => c.status === "in-review") },
      { name: "DONE",        pill: "kp-done", status: "done"        as BLStatus, items: children.filter(c => c.status === "done") },
    ];
    return (
      <div className="story-cols">
        {cols.map((col, ci) => {
          const colKey = `${groupId}-${ci}`;
          return (
            <div key={col.name} className="k-col">
              <div className="k-col-head">
                <span className={"k-pill " + col.pill} />
                <span className="k-col-name">{col.name}</span>
                <span className="k-col-count">{col.items.length}</span>
                <button className="k-col-add" onClick={e => {
                  e.stopPropagation();
                  setQuickAdd({ storyId: groupId, status: col.status });
                  setQuickAddTitle("");
                }}><IPlus /></button>
              </div>
              <div
                className={"k-col-body" + (sprintDragOver === colKey ? " drag-over" : "")}
                onDragOver={e => { e.preventDefault(); setSprintDragOver(colKey); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSprintDragOver(null); }}
                onDrop={() => {
                  if (sprintDragId && onCardDrop) onCardDrop(sprintDragId, col.status);
                  setSprintDragOver(null);
                  setSprintDragId(null);
                }}
              >
                {quickAdd && quickAdd.storyId === groupId && quickAdd.status === col.status && (
                  <div className="qa-card" onClick={e => e.stopPropagation()}>
                    <textarea
                      className="qa-input"
                      placeholder="Task title"
                      autoFocus
                      value={quickAddTitle}
                      onChange={e => setQuickAddTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitQuickAdd(); }
                        if (e.key === "Escape") cancelQuickAdd();
                      }}
                      disabled={quickAddSaving}
                    />
                    <div className="qa-actions">
                      <button className="qa-btn qa-btn-confirm" onClick={commitQuickAdd} disabled={!quickAddTitle.trim() || quickAddSaving} aria-label="Add">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button className="qa-btn qa-btn-cancel" onClick={cancelQuickAdd} disabled={quickAddSaving} aria-label="Cancel">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                )}
                {col.items.map(item => renderBoardCard(blItemToCard(item), COL_STATUS[col.status] ?? "To Do"))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pane active" onClick={() => setOpenStoryStatus(null)}>
      <div className="board-shell">
        <div className="board-bar">
          <span className="board-bar-title">{activeSprint ? `${activeSprint.name} — Board` : "Board"}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <div className="board-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search stories or task #"
                className="board-search-input"
              />
              {search && (
                <button className="board-search-clear" onClick={() => setSearch("")} aria-label="Clear">×</button>
              )}
            </div>
            <div className="board-assignee-filter" onClick={e => e.stopPropagation()}>
              {owners.slice(0, 5).map(o => {
                const on = selectedAssignees.has(o.id);
                return (
                  <button key={o.id}
                    className={"baf-av" + (on ? " on" : "")}
                    title={o.name + (on ? " (filtering)" : "")}
                    onClick={() => toggleAssignee(o.id)}
                    style={{ background: o.color, fontSize: 9 }}
                  >
                    {o.initials}
                  </button>
                );
              })}
              <button
                className={"baf-av baf-un" + (includeUnassigned ? " on" : "")}
                title={"Unassigned" + (includeUnassigned ? " (filtering)" : "")}
                onClick={() => setIncludeUnassigned(v => !v)}
              >?</button>
              {(owners.length > 5 || assigneeFilterOn) && (
                <button className={"baf-more" + (assigneeFilterOn ? " active" : "")} onClick={() => setAssigneeMenuOpen(v => !v)}>
                  {owners.length > 5 ? `+${owners.length - 5}` : <IChevDown style={{ width: 10, height: 10 }} />}
                </button>
              )}
              {assigneeMenuOpen && (
                <div className="baf-menu" onClick={e => e.stopPropagation()}>
                  {owners.map(o => {
                    const on = selectedAssignees.has(o.id);
                    return (
                      <label key={o.id} className="baf-menu-opt">
                        <input type="checkbox" checked={on} onChange={() => toggleAssignee(o.id)} />
                        <div className="pav pav-sm" style={{ background: o.color, fontSize: 9 }}>{o.initials}</div>
                        <span>{o.name}</span>
                      </label>
                    );
                  })}
                  <label className="baf-menu-opt">
                    <input type="checkbox" checked={includeUnassigned} onChange={() => setIncludeUnassigned(v => !v)} />
                    <div className="pav pav-sm" style={{ background: "var(--proj-surface-3)", color: "var(--proj-text-4)", fontSize: 9 }}>?</div>
                    <span>Unassigned</span>
                  </label>
                  {assigneeFilterOn && (
                    <button className="baf-menu-clear" onClick={() => { setSelectedAssignees(new Set()); setIncludeUnassigned(false); }}>
                      Clear assignee filter
                    </button>
                  )}
                </div>
              )}
            </div>
            <button className="filter-chip" onClick={() => {
              const allKeys = activeSprint
                ? activeSprint.items.filter(i => i.type === "story").map(i => i.id)
                : [];
              const anyOpen = allKeys.some(k => !collapsed[k]);
              setCollapsed(anyOpen ? Object.fromEntries(allKeys.map(k => [k, true])) : {});
            }}>
              {(() => {
                const allKeys = activeSprint
                  ? activeSprint.items.filter(i => i.type === "story").map(i => i.id)
                  : [];
                return allKeys.some(k => !collapsed[k]) ? "Collapse all" : "Expand all";
              })()}
            </button>
            {activeSprint
              ? <button className="sb-close-btn" onClick={() => onCompleteSprint?.(activeSprint.id)}>Complete sprint</button>
              : <button className="proj-btn-primary" onClick={onOpenCreate}><IPlus /> Add task</button>
            }
          </div>
        </div>
        <div className="board-body">

          {/* ── Active sprint: story-grouped view ── */}
          {activeSprint && activeSprint.items.length > 0 && (() => {
            const allStories = activeSprint.items.filter(i => i.type === "story");
            const allTasks   = activeSprint.items.filter(i => i.type !== "story");
            const done     = allTasks.filter(i => i.status === "done").length;
            const total    = allTasks.length;
            const _prog    = total > 0 ? Math.round(done / total * 100) : 0;
            const _pts     = activeSprint.items.reduce((a, i) => a + (i.pts ?? 0), 0);

            const stories = filterActive
              ? allStories.filter(s => matchItem(s) || allTasks.some(t => t.parentStoryId === s.id && matchItem(t)))
              : allStories;
            const orphans = filterActive
              ? allTasks.filter(i => !i.parentStoryId && matchItem(i))
              : allTasks.filter(i => !i.parentStoryId);
            const noResults = filterActive && stories.length === 0 && orphans.length === 0;

            return (
              <>
                {noResults && (
                  <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--proj-text-3)", fontSize: 13.5 }}>
                    No stories or tasks match current filters.
                  </div>
                )}
                {/* One story-group per story */}
                {stories.map((story, si) => {
                  const allChildren = allTasks.filter(i => i.parentStoryId === story.id);
                  const children = filterActive && !matchItem(story)
                    ? allChildren.filter(matchItem)
                    : allChildren;
                  const sDone    = allChildren.filter(c => c.status === "done").length;
                  const sTotal   = allChildren.length;
                  const sProg    = sTotal > 0 ? Math.round(sDone / sTotal * 100) : 0;
                  const color    = SPRINT_STORY_COLORS[si % SPRINT_STORY_COLORS.length];
                  const isCol    = filterActive ? false : !!collapsed[story.id];
                  return (
                    <div key={story.id}
                      className={"story-group" + (isCol ? " collapsed" : "")}
                      style={{ "--sg-color": color } as React.CSSProperties}
                    >
                      <div className="story-header" onClick={() => setCollapsed(p => ({ ...p, [story.id]: !p[story.id] }))}>
                        <div className="story-toggle">
                          <IChevDown />
                        </div>
                        <IFlag style={{ width: 13, height: 13, color: "#9353D3", flexShrink: 0 }} />
                        {story.displayId && (
                          <span className="t-id" style={{ flexShrink: 0 }}>{highlight(story.displayId)}</span>
                        )}
                        <span className="story-name" style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); onOpenStory?.(story, color); }}>{highlight(story.title)}</span>
                        {story.priority && (() => {
                          const pl = PRIO_LABEL[story.priority] ?? "Medium";
                          const pc = PANEL_PRIO_COLORS[pl] ?? "#9A9FAB";
                          return (
                            <span title={pl} className="sb-row-prio" style={{ background: pc + "14", flexShrink: 0 }}>
                              {prioIcon(pl, pc, 11)}
                            </span>
                          );
                        })()}
                        <div className="story-mini-prog"><div style={{ width: sProg + "%" }} /></div>
                        <span className="story-frac">{sDone} / {sTotal}</span>
                        <div onClick={e => e.stopPropagation()} style={{ marginLeft: "auto" }}>
                          <BLStatusPill
                            status={story.status} itemId={story.id}
                            openFor={openStoryStatus} onOpen={setOpenStoryStatus}
                            onChange={s => onSprintStatusChange?.(story.id, s)}
                          />
                        </div>
                        {(story.assignees ?? []).length > 0 ? (
                          <div className="pavs" style={{ flexShrink: 0 }}>
                            {(story.assignees ?? []).slice(0, 3).map(a => (
                              <div key={a.id} className="pav pav-sm" style={{ background: a.color, fontSize: 9 }}>{a.initials}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="pav pav-sm" style={{ background: "var(--proj-surface-3)", color: "var(--proj-text-4)", fontSize: 9, flexShrink: 0 }}>?</div>
                        )}
                      </div>
                      {!isCol && renderStoryKanban(children, story.id, (id, s) => onSprintStatusChange?.(id, s))}
                    </div>
                  );
                })}

                {/* Orphan tasks — no parent story */}
                {orphans.length > 0 && (
                  <div className="story-group" style={{ "--sg-color": "var(--proj-text-4)" } as React.CSSProperties}>
                    <div className="story-header" onClick={() => setCollapsed(p => ({ ...p, __orphan__: !p.__orphan__ }))}>
                      <div className="story-toggle"><IChevDown /></div>
                      <span className="story-name" style={{ color: "var(--proj-text-3)" }}>No story</span>
                      <span className="story-frac">{orphans.length} item{orphans.length !== 1 ? "s" : ""}</span>
                    </div>
                    {!collapsed.__orphan__ && renderStoryKanban(orphans, "__orphan__", (id, s) => onSprintStatusChange?.(id, s))}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Empty state when no active sprint ── */}
          {!activeSprint && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
              {/* Story row */}
              <div className="story-group" style={{ "--sg-color": "var(--purple)" } as React.CSSProperties}>
                <div className="story-header" style={{ cursor: "default" }}>
                  <IFlag style={{ width: 13, height: 13, color: "#9353D3", flexShrink: 0 }} />
                  <button className="board-create-row" onClick={onOpenCreate}>
                    <IPlus style={{ width: 13, height: 13 }} /> Create story
                  </button>
                </div>
              </div>
              {/* Task row */}
              <div className="story-group" style={{ "--sg-color": "var(--blue)" } as React.CSSProperties}>
                <div className="story-header" style={{ cursor: "default" }}>
                  <ICheck style={{ width: 13, height: 13, color: "#338EF7", flexShrink: 0 }} />
                  <button className="board-create-row" onClick={onOpenCreate}>
                    <IPlus style={{ width: 13, height: 13 }} /> Create task
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── BACKLOG TAB ──────────────────────────────────────────────────────────────

type BLStatus = "todo" | "in-progress" | "in-review" | "done";
type BLType   = "task" | "story" | "bug";
type CardPreview = {
  id: string; displayId: string; title: string; prio: string; status: string;
  pts?: number; dueDate?: string; description?: string;
  assignees?: { id: string; name: string; initials: string; color: string }[];
  reporter?: { id: string; name: string; initials: string; color: string } | null;
  blSubtasks?: { id: string; displayId: string; title: string; status: BLStatus; pts?: number }[];
  sprintId?: string; parentStoryId?: string;
};
const PRIO_LABEL: Record<string, string> = { "tp-highest": "Highest", "tp-high": "High", "tp-med": "Medium", "tp-low": "Low", "tp-lowest": "Lowest" };
const COL_STATUS: Record<string, string> = {
  "TODO": "To Do", "IN PROGRESS": "In Progress", "REVIEW": "In Review", "DONE": "Done",
  "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done",
};

const BL_STATUS_TO_API: Record<string, string> = {
  "todo": "To Do", "in-progress": "In Progress",
  "in-review": "In Review", "done": "Done",
};

const PRIO_TO_API: Record<string, string> = {
  "Highest": "urgent", "High": "high", "Medium": "medium", "Low": "low", "Lowest": "trivial",
};

// ── Shared status/priority color maps (used by SprintStoryPanel, SubtaskDetailPanel, TaskPanel) ──
const PANEL_STATUS_COLORS: Record<string, string> = {
  "todo": "#9A9FAB", "in-progress": "#338EF7", "in-review": "#F5A524", "done": "#17C964",
  "To Do": "#9A9FAB", "In Progress": "#338EF7", "In Review": "#F5A524", "Done": "#17C964",
};
const PANEL_STATUS_LABELS: Record<string, string> = {
  "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done",
};
const PANEL_PRIO_COLORS: Record<string, string> = {
  "Highest": "#E5484D", "High": "#F97316", "Medium": "#F5A524", "Low": "#338EF7", "Lowest": "#06B6D4",
};

function prioIcon(label: string, color: string, size = 12) {
  const l = (label || "").toLowerCase();
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (l === "highest") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
        <polyline points="4 6 8 3 12 6" />
        <polyline points="4 11 8 8 12 11" />
      </svg>
    );
  }
  if (l === "high" || l === "tp-high") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
        <polyline points="4 9 8 5 12 9" />
      </svg>
    );
  }
  if (l === "low" || l === "tp-low") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
        <polyline points="4 7 8 11 12 7" />
      </svg>
    );
  }
  if (l === "lowest") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
        <polyline points="4 5 8 8 12 5" />
        <polyline points="4 10 8 13 12 10" />
      </svg>
    );
  }
  // Medium → two horizontal bars
  return (
    <svg width={size} height={Math.round(size * 0.8)} viewBox="0 0 12 10">
      <rect y="2" width="12" height="2" rx="1" fill={color} />
      <rect y="6" width="12" height="2" rx="1" fill={color} />
    </svg>
  );
}
const PANEL_TYPE_LABEL: Record<string, string> = { task: "Task", story: "Story", bug: "Bug" };

interface BLItem {
  id: string; displayId: string; title: string; type: BLType; status: BLStatus;
  due?: string; dueDate?: string; pts?: number; hasSubtasks?: boolean;
  parentStoryId?: string;
  priority?: "tp-highest" | "tp-high" | "tp-med" | "tp-low" | "tp-lowest";
  description?: string;
  assigneeName?: string;
  assignees?: { id: string; name: string; initials: string; color: string }[];
  reporter?: { id: string; name: string; initials: string; color: string } | null;
  subtasksDone?: number;
  subtasksTotal?: number;
  blSubtasks?: { id: string; displayId: string; title: string; status: BLStatus; pts?: number }[];
  sprintId?: string;
}
interface BLSprintData {
  id: string; name: string; startDate?: string; endDate?: string;
  startIso?: string; endIso?: string;
  active: boolean; items: BLItem[];
  status?: string;
}

const BL_STATUS_CFG: Record<BLStatus, { label: string; color: string }> = {
  "todo":        { label: "To Do",       color: "#9A9FAB" },
  "in-progress": { label: "In Progress", color: "#338EF7" },
  "in-review":   { label: "In Review",   color: "#F5A524" },
  "done":        { label: "Done",        color: "#17C964" },
};


const API_STATUS_TO_BL: Record<string, BLStatus> = {
  "To Do": "todo", "In Progress": "in-progress",
  "In Review": "in-review", "Done": "done",
};

const API_PRIO_TO_BL: Record<string, "tp-highest" | "tp-highest" | "tp-high" | "tp-med" | "tp-low" | "tp-lowest" | "tp-lowest"> = {
  "urgent": "tp-highest", "high": "tp-high", "medium": "tp-med", "low": "tp-low", "trivial": "tp-lowest",
};

const AV_COLORS_CYCLE = ["#338EF7","#F97316","#9353D3","#17C964","#F31260","#F5A524"];
function nameToInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function apiItemToBL(item: ApiItem, parentId?: string, projectKey?: string): BLItem {
  const dueDate = item.dueDate ? String(item.dueDate).slice(0, 10) : undefined;
  const due = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : undefined;
  const assignees = (item.assignees ?? []).map((a) => ({
    id: a.user.id,
    name: a.user.name,
    initials: userInitials(a.user.name),
    color: userColor(a.user.id),
  }));
  const blSubtasks = (item.subtasks ?? []).map(sub => ({
    id: sub.id,
    displayId: projectKey && sub.number > 0 ? `${projectKey}-${sub.number}` : sub.id.slice(-6),
    title: sub.title,
    status: (API_STATUS_TO_BL[sub.status] ?? "todo") as BLStatus,
    pts: sub.points ?? undefined,
  }));
  const displayId = projectKey && item.number > 0 ? `${projectKey}-${item.number}` : item.id.slice(-6);
  return {
    id: item.id,
    displayId,
    title: item.title,
    type: (item.type === "bug" ? "bug" : item.type === "story" ? "story" : "task") as BLType,
    status: API_STATUS_TO_BL[item.status] ?? "todo",
    pts: item.points ?? undefined,
    hasSubtasks: (item.subtasks?.length ?? 0) > 0,
    priority: API_PRIO_TO_BL[item.priority] ?? "tp-med",
    parentStoryId: parentId,
    dueDate,
    due,
    description: item.description ?? undefined,
    assigneeName: item.assignees?.[0]?.user?.name,
    assignees,
    reporter: item.reporter ? { id: item.reporter.id, name: item.reporter.name, initials: userInitials(item.reporter.name), color: userColor(item.reporter.id) } : null,
    subtasksDone: blSubtasks.filter(s => s.status === "done").length,
    subtasksTotal: blSubtasks.length,
    blSubtasks,
    sprintId: item.sprintId ?? undefined,
  };
}

function BLTypeIcon({ type }: { type: BLType }) {
  const s: React.CSSProperties = { width: 14, height: 14, flexShrink: 0 };
  if (type === "task")  return <ICheck  style={{ ...s, color: "#338EF7" }} />;
  if (type === "story") return <IFlag   style={{ ...s, color: "#9353D3" }} />;
  return                       <IAlert  style={{ ...s, color: "#F31260" }} />;
}

function BLStatusPill({ status, itemId, openFor, onOpen, onChange }: {
  status: BLStatus; itemId: string;
  openFor: string | null; onOpen: (id: string | null) => void;
  onChange: (s: BLStatus) => void;
}) {
  const cfg = BL_STATUS_CFG[status];
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isOpen = openFor === itemId;
  useEffect(() => {
    if (isOpen && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, [isOpen]);
  return (
    <div className="sb-status-wrap">
      <button
        ref={btnRef}
        className="sb-status-pill"
        style={{ color: cfg.color, borderColor: cfg.color + "55", background: cfg.color + "14" }}
        onClick={e => { e.stopPropagation(); onOpen(isOpen ? null : itemId); }}
      >
        {cfg.label} <IChevDown style={{ width: 10, height: 10 }} />
      </button>
      {isOpen && rect && createPortal(
        <div
          className="sb-status-drop"
          style={{ position: "fixed", top: rect.bottom + 4, left: Math.max(8, rect.right - 160), right: "auto", width: 160, zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
            <button key={s}
              className={"sb-status-opt" + (s === status ? " active" : "")}
              style={{ color: BL_STATUS_CFG[s].color }}
              onClick={() => { onChange(s); onOpen(null); }}
            >
              {BL_STATUS_CFG[s].label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function PortalStatusPill({ status, itemId, openFor, onOpen, onChange }: {
  status: BLStatus; itemId: string;
  openFor: string | null; onOpen: (id: string | null) => void;
  onChange: (s: BLStatus) => void;
}) {
  const cfg = BL_STATUS_CFG[status];
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isOpen = openFor === itemId;

  useEffect(() => {
    if (isOpen && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, [isOpen]);

  return (
    <div className="sb-status-wrap">
      <button
        ref={btnRef}
        className="sb-status-pill"
        style={{ color: cfg.color, borderColor: cfg.color + "55", background: cfg.color + "14" }}
        onClick={e => { e.stopPropagation(); onOpen(isOpen ? null : itemId); }}
      >
        {cfg.label} <IChevDown style={{ width: 10, height: 10 }} />
      </button>
      {isOpen && rect && createPortal(
        <div
          className="sb-status-drop"
          style={{ position: "fixed", top: rect.bottom + 4, left: Math.max(8, rect.right - 160), right: "auto", width: 160, zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
            <button key={s}
              className={"sb-status-opt" + (s === status ? " active" : "")}
              style={{ color: BL_STATUS_CFG[s].color }}
              onClick={() => { onChange(s); onOpen(null); }}
            >
              {BL_STATUS_CFG[s].label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

const TABLE_PRIO_OPTS: { key: "tp-highest"|"tp-high"|"tp-med"|"tp-low"|"tp-lowest"; label: string; color: string; api: string }[] = [
  { key: "tp-highest", label: "Highest", color: "#E5484D", api: "urgent"  },
  { key: "tp-high",    label: "High",    color: "#F97316", api: "high"    },
  { key: "tp-med",     label: "Medium",  color: "#F5A524", api: "medium"  },
  { key: "tp-low",     label: "Low",     color: "#338EF7", api: "low"     },
  { key: "tp-lowest",  label: "Lowest",  color: "#06B6D4", api: "trivial" },
];

function PortalPrioPill({ priority, itemId, openFor, onOpen, onChange }: {
  priority: "tp-highest"|"tp-high"|"tp-med"|"tp-low"|"tp-lowest"|undefined;
  itemId: string;
  openFor: string | null; onOpen: (id: string | null) => void;
  onChange: (key: "tp-highest"|"tp-high"|"tp-med"|"tp-low"|"tp-lowest", api: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isOpen = openFor === itemId;
  const cfg = TABLE_PRIO_OPTS.find(p => p.key === priority) ?? TABLE_PRIO_OPTS[1];
  useEffect(() => {
    if (isOpen && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, [isOpen]);
  return (
    <div className="sb-status-wrap">
      <button ref={btnRef} className="sb-status-pill"
        style={{ color: cfg.color, borderColor: cfg.color + "55", background: cfg.color + "14", display: "flex", alignItems: "center", gap: 5 }}
        onClick={e => { e.stopPropagation(); onOpen(isOpen ? null : itemId); }}>
        {prioIcon(cfg.label, cfg.color, 11)}
        <span>{cfg.label}</span>
        <IChevDown style={{ width: 10, height: 10 }} />
      </button>
      {isOpen && rect && createPortal(
        <div className="sb-status-drop"
          style={{ position: "fixed", top: rect.bottom + 4, left: Math.max(8, rect.right - 160), right: "auto", width: 160, zIndex: 9999 }}
          onClick={e => e.stopPropagation()}>
          {TABLE_PRIO_OPTS.map(p => (
            <button key={p.key} className={"sb-status-opt" + (p.key === priority ? " active" : "")}
              style={{ color: p.color, display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => { onChange(p.key, p.api); onOpen(null); }}>
              {prioIcon(p.label, p.color, 12)}
              <span>{p.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function PortalAssigneePill({ assigneeName, assigneeColor, assigneeInitials, itemId, openFor, onOpen, onChange, owners }: {
  assigneeName?: string; assigneeColor?: string; assigneeInitials?: string;
  itemId: string;
  openFor: string | null; onOpen: (id: string | null) => void;
  onChange: (owner: { id: string; name: string; initials: string; color: string }) => void;
  owners: { id: string; name: string; initials: string; color: string }[];
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isOpen = openFor === itemId;
  useEffect(() => {
    if (isOpen && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, [isOpen]);
  return (
    <div className="sb-status-wrap">
      <button ref={btnRef} className="stc-assignee-btn"
        onClick={e => { e.stopPropagation(); onOpen(isOpen ? null : itemId); }}>
        {assigneeName
          ? <div style={{ width: 16, height: 16, borderRadius: "50%", background: assigneeColor, display: "grid", placeItems: "center", fontSize: 7, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{assigneeInitials}</div>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ background: "var(--proj-surface-3)", borderRadius: "50%", padding: 2, flexShrink: 0 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        }
        <span className="stc-assignee-name">{assigneeName ?? "Unassigned"}</span>
        <IChevDown style={{ width: 9, height: 9, opacity: 0.6 }} />
      </button>
      {isOpen && rect && createPortal(
        <div className="sb-status-drop"
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, zIndex: 9999, width: 180 }}
          onClick={e => e.stopPropagation()}>
          <button className={"sb-status-opt" + (!assigneeName ? " active" : "")}
            style={{ color: "var(--proj-text-3)", display: "flex", alignItems: "center", gap: 7 }}
            onClick={() => { onChange({ id: "", name: "", initials: "", color: "" }); onOpen(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ background: "var(--proj-surface-3)", borderRadius: "50%", padding: 2 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Unassigned
          </button>
          {owners.map(o => (
            <button key={o.id} className={"sb-status-opt" + (o.name === assigneeName ? " active" : "")}
              style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
              onClick={() => { onChange(o); onOpen(null); }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: o.color, display: "grid", placeItems: "center", fontSize: 7, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{o.initials}</div>
              {o.name}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

const BL_TYPE_TAG: Record<BLType, string> = { task: "tt-fe", story: "tt-be", bug: "tt-bug" };
function blItemToCard(item: BLItem) {
  return {
    id: item.id, displayId: item.displayId, title: item.title,
    prio: (item.priority ?? "tp-low") as "tp-highest" | "tp-high" | "tp-med" | "tp-low" | "tp-lowest",
    tags: [BL_TYPE_TAG[item.type]],
    sub: item.subtasksTotal && item.subtasksTotal > 0
      ? { done: item.subtasksDone ?? 0, total: item.subtasksTotal }
      : null as { done: number; total: number } | null,
    avs: (item.assignees ?? []) as { initials: string; color: string }[],
    due: item.due === "Today" ? "today-due" : "" as string,
    dueText: item.due ?? "—",
    // Extra for TaskPanel
    pts: item.pts,
    dueDate: item.dueDate,
    description: item.description,
    assignees: item.assignees,
    reporter: item.reporter,
    blSubtasks: item.blSubtasks,
    sprintId: item.sprintId,
    parentStoryId: item.parentStoryId,
  };
}

function BLItemRow({ item, openStatus, onOpenStatus, onStatusChange, dragging, onDragStart, onDragEnd, onOpenPanel,
  isChild, childCount, expanded, onToggle,
}: {
  item: BLItem;
  openStatus: string | null; onOpenStatus: (id: string | null) => void;
  onStatusChange: (id: string, s: BLStatus) => void;
  dragging: boolean; onDragStart: () => void; onDragEnd: () => void;
  onOpenPanel: () => void;
  isChild?: boolean;
  childCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const hasToggle = item.type === "story" && onToggle !== undefined;
  const prioLabel = PRIO_LABEL[item.priority ?? ""] ?? "Medium";
  const prioColor = PANEL_PRIO_COLORS[prioLabel] ?? "#9A9FAB";
  const avatarEl = (item.assignees ?? []).length > 0
    ? <div className="pav pav-sm" style={{ background: item.assignees![0].color, fontSize: 9 }}>{item.assignees![0].initials}</div>
    : <div className="pav pav-sm" style={{ background: "var(--proj-surface-3)", color: "var(--proj-text-4)", fontSize: 9 }}>?</div>;

  if (item.type === "story") {
    const sTotal = childCount ?? item.subtasksTotal ?? 0;
    const sDone  = item.subtasksDone ?? 0;
    const sProg  = sTotal > 0 ? Math.round(sDone / sTotal * 100) : 0;
    return (
      <div
        className={"sb-row sb-row-story " + (dragging ? "sb-row-dragging " : "") + (isChild ? "sb-row-child " : "")}
        draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      >
        {hasToggle ? (
          <button className="sb-row-toggle" onClick={e => { e.stopPropagation(); onToggle!(); }}>
            {expanded ? <IChevDown style={{ width: 11, height: 11 }} /> : <IChevR style={{ width: 11, height: 11 }} />}
          </button>
        ) : (
          <span className="sb-row-toggle-spacer" />
        )}
        <BLTypeIcon type="story" />
        <span className="sb-row-id">{item.displayId}</span>
        <span className="sb-row-title" onClick={onOpenPanel}>{item.title}</span>
        <span className="sb-row-prio" title={prioLabel} style={{ background: prioColor + "14" }}>
          {prioIcon(prioLabel, prioColor, 11)}
        </span>
        <div className="story-mini-prog"><div style={{ width: sProg + "%" }} /></div>
        <span className="story-frac">{sDone} / {sTotal}</span>
        <div onClick={e => e.stopPropagation()} style={{ marginLeft: "auto" }}>
          <BLStatusPill status={item.status} itemId={item.id} openFor={openStatus}
            onOpen={onOpenStatus} onChange={s => onStatusChange(item.id, s)} />
        </div>
        {avatarEl}
      </div>
    );
  }

  return (
    <div
      className={"sb-row " + (dragging ? "sb-row-dragging " : "") + (isChild ? "sb-row-child " : "")}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <span className="sb-row-toggle-spacer" />
      <BLTypeIcon type={item.type} />
      <span className="sb-row-id">{item.displayId}</span>
      <span className="sb-row-title" onClick={onOpenPanel}>{item.title}</span>
      <span className="sb-row-prio" title={prioLabel} style={{ background: prioColor + "14" }}>
        {prioIcon(prioLabel, prioColor, 11)}
      </span>
      <span className="sb-row-spacer" />
      <BLStatusPill status={item.status} itemId={item.id} openFor={openStatus}
        onOpen={onOpenStatus} onChange={s => onStatusChange(item.id, s)} />
      {item.due && (
        <span className="sb-row-due">{item.due}</span>
      )}
      {item.pts != null && <span className="sb-row-pts">{item.pts}</span>}
      {avatarEl}
    </div>
  );
}

function BLInlineCreate({ onConfirm, onCancel }: {
  onConfirm: (title: string, type: BLType) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]         = useState("");
  const [type, setType]           = useState<BLType>("task");
  const [showTypeMenu, setMenu]   = useState(false);

  function submit() {
    if (title.trim()) onConfirm(title.trim(), type);
    else onCancel();
  }

  return (
    <div className="sb-inline-create">
      <div className="sb-ic-type" onClick={e => { e.stopPropagation(); setMenu(v => !v); }}>
        <BLTypeIcon type={type} />
        <IChevDown style={{ width: 9, height: 9, color: "var(--proj-text-4)" }} />
        {showTypeMenu && (
          <div className="sb-ic-type-menu">
            {(["task", "story", "bug"] as BLType[]).map(t => (
              <button key={t} className="sb-ic-type-opt"
                onClick={e => { e.stopPropagation(); setType(t); setMenu(false); }}>
                <BLTypeIcon type={t} />{t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className="sb-ic-input"
        placeholder="What needs to be done?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        autoFocus
      />
      <button className="sb-ic-submit" onClick={submit}>Create <kbd>↵</kbd></button>
      <button className="sb-ic-cancel" onClick={onCancel}>×</button>
    </div>
  );
}

type BLFilters = {
  status:   "all" | "open" | "in-progress" | "in-review" | "done";
  type:     "all" | "task" | "story" | "bug";
  assigneeId: string;
  dateRange: "all" | "7d" | "30d" | "90d";
};

const BacklogTab = memo(function BacklogTab({ onOpenPanel, onOpenItem, sprints, setSprints, backlog, setBacklog, onCompleteSprint, projectId, projectKey, owners, currentUserId }: {
  onOpenPanel: () => void;
  onOpenItem?: (item: BLItem) => void;
  sprints: BLSprintData[]; setSprints: React.Dispatch<React.SetStateAction<BLSprintData[]>>;
  backlog: BLItem[];       setBacklog: React.Dispatch<React.SetStateAction<BLItem[]>>;
  onCompleteSprint: (sprintId: string) => void;
  projectId: string;
  projectKey: string;
  owners?: Owner[];
  currentUserId?: string;
}) {
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({});
  const [expandedStories, setExpanded]    = useState<Record<string, boolean>>({});
  const [search, setSearch]               = useState("");
  const [filters, setFilters]             = useState<BLFilters>({ status: "all", type: "all", assigneeId: "all", dateRange: "all" });
  const [openFilter, setOpenFilter]       = useState<keyof BLFilters | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [openStatus, setOpenStatus]       = useState<string | null>(null);
  const [createIn, setCreateIn]           = useState<string | null>(null);
  const [dragOver, setDragOver]           = useState<string | null>(null);
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [addDatesFor, setAddDatesFor] = useState<{ sprintId: string; start: string; end: string } | null>(null);
  const [sprintMenuOpen, setSprintMenuOpen] = useState<string | null>(null);
  const [backlogMenuOpen, setBacklogMenuOpen] = useState(false);
  const [editSprintFor, setEditSprintFor]   = useState<{ sprintId: string; name: string; goal: string } | null>(null);
  const [deleteSprintFor, setDeleteSprintFor] = useState<{ sprintId: string; name: string; itemCount: number } | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [startFor, setStartFor]       = useState<{ sprintId: string; name: string; start: string; end: string; goal: string } | null>(null);
  const [sprintDuration, setSprintDuration] = useState<"1" | "2" | "3" | "4" | "custom">("2");
  const [durationOpen, setDurationOpen] = useState(false);
  const dragSrc = useRef<{ section: string; idx: number } | null>(null);

  function toggle(id: string) { setCollapsed(p => ({ ...p, [id]: !p[id] })); }

  function setStatus(sectionId: string, itemId: string, s: BLStatus) {
    if (sectionId === "backlog" || sectionId === "archive") {
      setBacklog(p => p.map(i => i.id === itemId ? { ...i, status: s } : i));
    } else {
      setSprints(p => p.map(sp => sp.id !== sectionId ? sp
        : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status: s } : i) }));
    }
    itemsApi.update(projectId, itemId, { status: BL_STATUS_TO_API[s] }).catch(e => console.error("API error", e));
  }

  function reopenItem(itemId: string) {
    setStatus("archive", itemId, "todo");
    const parent = backlog.find(i => i.id === itemId);
    if (parent && parent.type === "story") {
      backlog.filter(c => c.parentStoryId === itemId && c.status === "done").forEach(c => {
        setStatus("archive", c.id, "todo");
      });
    }
  }

  function addItem(sectionId: string, title: string, type: BLType) {
    if (sectionId !== "backlog" && sectionId.startsWith("temp-")) {
      pushToast("Sprint is still saving, please wait a moment", "error");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const item: BLItem = { id: tempId, displayId: "...", title, type, status: "todo" };
    if (sectionId === "backlog") setBacklog(p => [...p, item]);
    else setSprints(p => p.map(sp => sp.id !== sectionId ? sp : { ...sp, items: [...sp.items, item] }));
    setCreateIn(null);
    const sprintId = sectionId === "backlog" ? undefined : sectionId;
    itemsApi.create(projectId, { title, type, sprintId })
      .then(created => {
        const full = apiItemToBL(created, undefined, projectKey);
        if (sectionId === "backlog") {
          setBacklog(p => p.map(i => i.id === tempId ? full : i));
        } else {
          setSprints(p => p.map(sp => sp.id !== sectionId ? sp : {
            ...sp, items: sp.items.map(i => i.id === tempId ? full : i),
          }));
        }
      })
      .catch(e => {
        console.error("API error creating item:", e);
        if (sectionId === "backlog") {
          setBacklog(p => p.filter(i => i.id !== tempId));
        } else {
          setSprints(p => p.map(sp => sp.id !== sectionId ? sp : {
            ...sp, items: sp.items.filter(i => i.id !== tempId),
          }));
        }
        pushToast(`Failed to save item: ${(e as Error).message ?? "unknown error"}`, "error");
      });
  }

  function onDragStart(section: string, idx: number, itemId: string) {
    dragSrc.current = { section, idx };
    setDraggingId(itemId);
  }
  function onDragEnd() { dragSrc.current = null; setDraggingId(null); setDragOver(null); }

  function onDrop(toSection: string) {
    const src = dragSrc.current;
    if (!src || src.section === toSection) { setDragOver(null); return; }
    let item: BLItem | undefined;
    let children: BLItem[] = [];
    if (src.section === "backlog") {
      item = backlog[src.idx];
      if (item) children = backlog.filter(b => b.parentStoryId === item!.id);
      setBacklog(p => p.filter(b => b.id !== item!.id && b.parentStoryId !== item!.id));
    } else {
      const srcSprint = sprints.find(s => s.id === src.section);
      item = srcSprint?.items[src.idx];
      if (item && srcSprint) children = srcSprint.items.filter(b => b.parentStoryId === item!.id);
      setSprints(p => p.map(s => s.id !== src.section ? s
        : { ...s, items: s.items.filter(b => b.id !== item!.id && b.parentStoryId !== item!.id) }));
    }
    if (!item) return;
    const moving = [item, ...children];
    if (toSection === "backlog") {
      setBacklog(p => [...p, ...moving.map(m => ({ ...m, sprintId: undefined }))]);
    } else {
      setSprints(p => p.map(s => s.id !== toSection ? s : { ...s, items: [...s.items, ...moving.map(m => ({ ...m, sprintId: toSection }))] }));
    }
    setDragOver(null);
    const sprintId = toSection === "backlog" ? null : toSection;
    moving.forEach(m => {
      itemsApi.update(projectId, m.id, { sprintId }).catch(e => console.error("API error", e));
    });
  }

  function saveDates(sprintId: string, start: string, end: string) {
    const fmt = (d: string) => {
      if (!d) return undefined;
      const [, m, day] = d.split("-");
      const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[Number(m)]} ${Number(day)}`;
    };
    setSprints(p => p.map(s => s.id !== sprintId ? s
      : { ...s, startIso: start || undefined, endIso: end || undefined, startDate: fmt(start), endDate: fmt(end) }));
    sprintsApi.update(projectId, sprintId, {
      startDate: start || undefined,
      endDate: end || undefined,
    }).catch(e => console.error("API error", e));
    setAddDatesFor(null);
  }

  function doStartSprint(sprintId: string) {
    if (!startFor) return;
    if (sprintId.startsWith("temp-")) {
      pushToast("Sprint is still saving, please wait a moment and try again", "error");
      return;
    }
    const fmt = (d: string) => {
      if (!d) return undefined;
      const [, m, day] = d.split("-");
      const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[Number(m)]} ${Number(day)}`;
    };
    // Deactivate other active sprints in DB before activating the new one
    const prevActiveSprints = sprints.filter(s => s.active && s.id !== sprintId);
    prevActiveSprints.forEach(s => {
      sprintsApi.update(projectId, s.id, { status: "planned" }).catch(e => console.error("Failed to deactivate sprint", e));
    });
    setSprints(p => p.map(s => {
      if (s.id === sprintId) return {
        ...s, active: true,
        name: startFor.name || s.name,
        startIso:  startFor.start || s.startIso,
        endIso:    startFor.end   || s.endIso,
        startDate: startFor.start ? fmt(startFor.start) : s.startDate,
        endDate:   startFor.end   ? fmt(startFor.end)   : s.endDate,
      };
      if (s.active) return { ...s, active: false };
      return s;
    }));
    sprintsApi.update(projectId, sprintId, {
      status: "active",
      name:      startFor.name  || undefined,
      goal:      startFor.goal  || undefined,
      startDate: startFor.start || undefined,
      endDate:   startFor.end   || undefined,
    }).catch(e => {
      console.error("Failed to start sprint", e);
      setSprints(p => p.map(s => s.id === sprintId ? { ...s, active: false } : s));
      pushToast("Failed to start sprint — please try again", "error");
    });
    setStartFor(null);
  }

  function createSprint() {
    const n = sprints.length + 1;
    const name = `Sprint ${n}`;
    const tempId = `temp-sprint-${Date.now()}`;
    setSprints(p => [...p, { id: tempId, name, active: false, items: [] }]);
    sprintsApi.create(projectId, { name })
      .then(created => {
        setSprints(p => p.map(s => s.id === tempId ? { ...s, id: created.id, name: created.name } : s));
      })
      .catch(e => console.error("API error", e));
  }

  function filterItems(items: BLItem[]) {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 86_400_000;
    const dateCutoff = filters.dateRange === "7d" ? now - 7 * dayMs
                     : filters.dateRange === "30d" ? now - 30 * dayMs
                     : filters.dateRange === "90d" ? now - 90 * dayMs
                     : null;
    return items.filter(i => {
      if (q && !(i.title.toLowerCase().includes(q) || i.displayId.toLowerCase().includes(q))) return false;
      if (filters.status !== "all") {
        if (filters.status === "open" && i.status === "done") return false;
        if (filters.status !== "open" && i.status !== filters.status) return false;
      }
      if (filters.type !== "all" && i.type !== filters.type) return false;
      if (filters.assigneeId !== "all") {
        const targetId = filters.assigneeId === "me" ? (currentUserId ?? "") : filters.assigneeId;
        if (!targetId || !(i.assignees ?? []).some(a => a.id === targetId)) return false;
      }
      if (dateCutoff && i.dueDate && new Date(i.dueDate).getTime() < dateCutoff) return false;
      return true;
    });
  }

  const activeFilterCount = (filters.status !== "all" ? 1 : 0) + (filters.type !== "all" ? 1 : 0) + (filters.assigneeId !== "all" ? 1 : 0) + (filters.dateRange !== "all" ? 1 : 0);

  function renderTreeItems(items: BLItem[], sectionId: string) {
    const childIdSet = new Set(items.filter(i => i.parentStoryId).map(i => i.id));
    const rows: React.ReactNode[] = [];

    const indexMap = new Map(items.map((item, idx) => [item.id, idx]));

    items.forEach((item, idx) => {
      if (childIdSet.has(item.id)) return; // rendered under parent

      if (item.type === "story") {
        const children   = items.filter(c => c.parentStoryId === item.id);
        const isExp      = expandedStories[item.id] !== false; // default expanded
        rows.push(
          <BLItemRow key={item.id} item={item}
            openStatus={openStatus} onOpenStatus={setOpenStatus}
            onStatusChange={(id, s) => setStatus(sectionId, id, s)}
            dragging={draggingId === item.id}
            onDragStart={() => onDragStart(sectionId, idx, item.id)}
            onDragEnd={onDragEnd}
            onOpenPanel={() => onOpenItem ? onOpenItem(item) : onOpenPanel()}
            childCount={children.length}
            expanded={isExp}
            onToggle={() => setExpanded(p => ({ ...p, [item.id]: !isExp }))}
          />
        );
        if (isExp) {
          children.forEach(child => {
            rows.push(
              <BLItemRow key={child.id} item={child}
                openStatus={openStatus} onOpenStatus={setOpenStatus}
                onStatusChange={(id, s) => setStatus(sectionId, id, s)}
                dragging={draggingId === child.id}
                onDragStart={() => onDragStart(sectionId, indexMap.get(child.id) ?? 0, child.id)}
                onDragEnd={onDragEnd}
                onOpenPanel={() => onOpenItem ? onOpenItem(child) : onOpenPanel()}
                isChild
              />
            );
          });
        }
      } else {
        rows.push(
          <BLItemRow key={item.id} item={item}
            openStatus={openStatus} onOpenStatus={setOpenStatus}
            onStatusChange={(id, s) => setStatus(sectionId, id, s)}
            dragging={draggingId === item.id}
            onDragStart={() => onDragStart(sectionId, idx, item.id)}
            onDragEnd={onDragEnd}
            onOpenPanel={() => onOpenItem ? onOpenItem(item) : onOpenPanel()}
          />
        );
      }
    });

    return rows;
  }
  function stats(items: BLItem[]) {
    return {
      todo: items.filter(i => i.status === "todo").length,
      inp:  items.filter(i => i.status === "in-progress" || i.status === "in-review").length,
      done: items.filter(i => i.status === "done").length,
    };
  }
  function estOf(items: BLItem[]) {
    return {
      done:  items.filter(i => i.status === "done").reduce((a, i) => a + (i.pts ?? 0), 0),
      total: items.reduce((a, i) => a + (i.pts ?? 0), 0),
    };
  }

  const blFiltered = filterItems(backlog).filter(i => i.status !== "done");
  const blStats    = stats(backlog);
  const blEst      = estOf(backlog);

  return (
    <div className="pane active" onClick={() => setOpenStatus(null)}>
      <div className="sb-wrap">

        {/* Toolbar */}
        <div className="sb-toolbar">
          <div className="sb-search">
            <ISearch style={{ width: 13, height: 13, color: "var(--proj-text-4)", flexShrink: 0 }} />
            <input className="sb-search-input" placeholder="Search backlog"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="filter-chip" onClick={() => {
            const allKeys = [...sprints.map(s => s.id), "backlog"];
            const anyOpen = allKeys.some(k => !collapsed[k]);
            setCollapsed(anyOpen ? Object.fromEntries(allKeys.map(k => [k, true])) : {});
          }}>
            {[...sprints.map(s => s.id), "backlog"].some(k => !collapsed[k]) ? "Collapse all" : "Expand all"}
          </button>

          {/* Status filter */}
          <div className="fc-wrap" onClick={e => e.stopPropagation()}>
            <button className={"filter-chip" + (filters.status !== "all" ? " active" : "")} onClick={() => setOpenFilter(openFilter === "status" ? null : "status")}>
              Status{filters.status !== "all" ? ": " + filters.status : ""}
            </button>
            {openFilter === "status" && (
              <div className="fc-pop">
                {(["all","open","in-progress","in-review","done"] as const).map(s => (
                  <button key={s} className={"fc-opt" + (filters.status === s ? " active" : "")}
                    onClick={() => { setFilters(f => ({ ...f, status: s })); setOpenFilter(null); }}>
                    {s === "all" ? "All" : s === "open" ? "Open" : s === "in-progress" ? "In Progress" : s === "in-review" ? "In Review" : "Done"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type filter */}
          <div className="fc-wrap" onClick={e => e.stopPropagation()}>
            <button className={"filter-chip" + (filters.type !== "all" ? " active" : "")} onClick={() => setOpenFilter(openFilter === "type" ? null : "type")}>
              Type{filters.type !== "all" ? ": " + filters.type : ""}
            </button>
            {openFilter === "type" && (
              <div className="fc-pop">
                {(["all","task","story","bug"] as const).map(t => (
                  <button key={t} className={"fc-opt" + (filters.type === t ? " active" : "")}
                    onClick={() => { setFilters(f => ({ ...f, type: t })); setOpenFilter(null); }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee filter */}
          <div className="fc-wrap" onClick={e => e.stopPropagation()}>
            <button className={"filter-chip" + (filters.assigneeId !== "all" ? " active" : "")} onClick={() => setOpenFilter(openFilter === "assigneeId" ? null : "assigneeId")}>
              <IUsers style={{ width: 12, height: 12 }} /> Assignee{filters.assigneeId !== "all" ? ": " + (filters.assigneeId === "me" ? "Me" : (owners?.find(o => o.id === filters.assigneeId)?.name ?? "Selected")) : ""}
            </button>
            {openFilter === "assigneeId" && (
              <div className="fc-pop">
                <button className={"fc-opt" + (filters.assigneeId === "all" ? " active" : "")}
                  onClick={() => { setFilters(f => ({ ...f, assigneeId: "all" })); setOpenFilter(null); }}>All</button>
                {currentUserId && (
                  <button className={"fc-opt" + (filters.assigneeId === "me" ? " active" : "")}
                    onClick={() => { setFilters(f => ({ ...f, assigneeId: "me" })); setOpenFilter(null); }}>Me</button>
                )}
                {(owners ?? []).map(o => (
                  <button key={o.id} className={"fc-opt" + (filters.assigneeId === o.id ? " active" : "")}
                    onClick={() => { setFilters(f => ({ ...f, assigneeId: o.id })); setOpenFilter(null); }}>
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="fc-wrap" onClick={e => e.stopPropagation()}>
            <button className={"filter-chip" + (filters.dateRange !== "all" ? " active" : "")} onClick={() => setOpenFilter(openFilter === "dateRange" ? null : "dateRange")}>
              Due{filters.dateRange !== "all" ? ": " + filters.dateRange : ""}
            </button>
            {openFilter === "dateRange" && (
              <div className="fc-pop">
                {(["all","7d","30d","90d"] as const).map(r => (
                  <button key={r} className={"fc-opt" + (filters.dateRange === r ? " active" : "")}
                    onClick={() => { setFilters(f => ({ ...f, dateRange: r })); setOpenFilter(null); }}>
                    {r === "all" ? "Any" : "Last " + r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button className="filter-chip filter-chip-clear" onClick={() => setFilters({ status: "all", type: "all", assigneeId: "all", dateRange: "all" })}>
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Sprint sections */}
        {sprints.filter(s => s.status !== "completed").map(sprint => {
          const isCol   = collapsed[sprint.id];
          const fItems  = filterItems(sprint.items);
          const st      = stats(sprint.items);
          const est     = estOf(sprint.items);
          const isOver  = dragOver === sprint.id;

          return (
            <div key={sprint.id} className="sb-section">
              <div className="sb-section-head">
                <div className="sb-head-left">
                  <button className="sb-chevron" onClick={() => toggle(sprint.id)}>
                    {isCol ? <IChevR style={{ width: 14, height: 14 }} /> : <IChevDown style={{ width: 14, height: 14 }} />}
                  </button>
                  <span className="sb-sprint-name">{sprint.name}</span>
                  {sprint.active && <span className="sb-active-badge">Active</span>}
                  <button className="sb-add-dates-btn" onClick={e => {
                    e.stopPropagation();
                    setAddDatesFor({ sprintId: sprint.id, start: sprint.startIso ?? "", end: sprint.endIso ?? "" });
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {sprint.startDate && sprint.endDate ? `${sprint.startDate} – ${sprint.endDate}` : "Add dates"}
                  </button>
                </div>
                <div className="sb-head-right">
                  <div className="sb-stat-group" title={`${st.todo} to do · ${st.inp} in progress · ${st.done} done`}>
                    <span className="sb-stat-badge sb-stat-todo">{st.todo}</span>
                    <span className="sb-stat-badge sb-stat-inp">{st.inp}</span>
                    <span className="sb-stat-badge sb-stat-done">{st.done}</span>
                  </div>
                  {!sprint.active
                    ? <button className="sb-start-btn" onClick={() => {
                        const today = new Date();
                        const isoStart = today.toISOString().slice(0, 10);
                        const endD = new Date(today); endD.setDate(endD.getDate() + 14);
                        const isoEnd = endD.toISOString().slice(0, 10);
                        setStartFor({ sprintId: sprint.id, name: sprint.name, start: isoStart, end: isoEnd, goal: "" });
                        setSprintDuration("2");
                      }}>Start sprint</button>
                    : <button className="sb-close-btn" onClick={() => onCompleteSprint(sprint.id)}>Complete sprint</button>
                  }
                  <div className="fc-wrap" onClick={e => e.stopPropagation()}>
                    <button className="sb-more-btn" onClick={() => setSprintMenuOpen(sprintMenuOpen === sprint.id ? null : sprint.id)}>
                      <IMoreH style={{ width: 14, height: 14 }} />
                    </button>
                    {sprintMenuOpen === sprint.id && (
                      <div className="fc-pop" style={{ right: 0, left: "auto", minWidth: 140 }}>
                        <button className="fc-opt" onClick={() => {
                          setSprintMenuOpen(null);
                          setEditSprintFor({ sprintId: sprint.id, name: sprint.name, goal: "" });
                        }}>Edit sprint</button>
                        <button className="fc-opt" style={{ color: "var(--red)" }} onClick={() => {
                          setSprintMenuOpen(null);
                          setDeleteSprintFor({ sprintId: sprint.id, name: sprint.name, itemCount: sprint.items.length });
                        }}>Delete sprint</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isCol && (
                <>
                  <div
                    className={"sb-items" + (isOver ? " sb-drag-over" : "")}
                    onDragOver={e => { e.preventDefault(); setDragOver(sprint.id); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                    onDrop={() => onDrop(sprint.id)}
                  >
                    {fItems.length === 0
                      ? <EmptyState compact variant="sprint" title="Sprint is empty" description="Drag items from the backlog here to plan this sprint." />
                      : renderTreeItems(fItems, sprint.id)
                    }
                  </div>
                  {createIn === sprint.id
                    ? <BLInlineCreate onConfirm={(t, ty) => addItem(sprint.id, t, ty)} onCancel={() => setCreateIn(null)} />
                    : <button className="sb-create-row" onClick={() => setCreateIn(sprint.id)}><IPlus style={{ width: 12, height: 12 }} /> Create</button>
                  }
                  <div className="sb-section-footer">
                    <span>{fItems.length} of {sprint.items.length} work item{sprint.items.length !== 1 ? "s" : ""} visible</span>
                    <span className="sb-footer-sep" />
                    <span>Estimate: <strong>{est.done}</strong> of <strong>{est.total}</strong></span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Backlog section */}
        <div className="sb-section">
          <div className="sb-section-head">
            <div className="sb-head-left">
              <button className="sb-chevron" onClick={() => toggle("backlog")}>
                {collapsed["backlog"] ? <IChevR style={{ width: 14, height: 14 }} /> : <IChevDown style={{ width: 14, height: 14 }} />}
              </button>
              <span className="sb-sprint-name">Backlog</span>
              <span className="sb-item-count">({backlog.length} work item{backlog.length !== 1 ? "s" : ""})</span>
            </div>
            <div className="sb-head-right">
              <span className="sb-stat-badge sb-stat-todo">{blStats.todo}</span>
              <span className="sb-stat-badge sb-stat-inp">{blStats.inp}</span>
              <span className="sb-stat-badge sb-stat-done">{blStats.done}</span>
              <button className="sb-create-sprint-btn" onClick={createSprint}>Create sprint</button>
              <div className="fc-wrap" onClick={e => e.stopPropagation()}>
                <button className="sb-more-btn" onClick={() => setBacklogMenuOpen(v => !v)}>
                  <IMoreH style={{ width: 14, height: 14 }} />
                </button>
                {backlogMenuOpen && (() => {
                  const movable = backlog.filter(i => i.status !== "done");
                  return (
                    <div className="fc-pop" style={{ right: 0, left: "auto", minWidth: 200 }}>
                      <div style={{ padding: "8px 10px 4px", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--proj-text-4)" }}>
                        Move all open items to
                      </div>
                      {sprints.filter(s => s.status !== "completed").length === 0 ? (
                        <div className="fc-opt" style={{ color: "var(--proj-text-4)", cursor: "default" }}>No sprints yet</div>
                      ) : sprints.filter(s => s.status !== "completed").map(sp => (
                        <button key={sp.id} className="fc-opt"
                          onClick={() => {
                            setBacklogMenuOpen(false);
                            if (movable.length === 0) return;
                            setBacklog(p => p.filter(i => i.status === "done"));
                            setSprints(p => p.map(s => s.id === sp.id ? { ...s, items: [...s.items, ...movable.map(i => ({ ...i, sprintId: sp.id })) ] } : s));
                            movable.forEach(it => itemsApi.update(projectId, it.id, { sprintId: sp.id }).catch(e => console.error("API error", e)));
                          }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sp.active ? "var(--green)" : "var(--proj-text-4)" }} />
                            {sp.name}{sp.active ? " (active)" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {!collapsed["backlog"] && (
            <>
              <div
                className={"sb-items" + (dragOver === "backlog" ? " sb-drag-over" : "")}
                onDragOver={e => { e.preventDefault(); setDragOver("backlog"); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                onDrop={() => onDrop("backlog")}
              >
                {renderTreeItems(blFiltered, "backlog")}
                {backlog.length === 0 && (
                  <EmptyState compact variant="backlog" title="Backlog is empty" description="Add work items here to plan your upcoming sprints." />
                )}
              </div>
              {createIn === "backlog"
                ? <BLInlineCreate onConfirm={(t, ty) => addItem("backlog", t, ty)} onCancel={() => setCreateIn(null)} />
                : <button className="sb-create-row" onClick={() => setCreateIn("backlog")}><IPlus style={{ width: 12, height: 12 }} /> Create</button>
              }
              <div className="sb-section-footer">
                <span>{blFiltered.length} of {backlog.length} work item{backlog.length !== 1 ? "s" : ""} visible</span>
                <span className="sb-footer-sep" />
                <span>Estimate: <strong>{blEst.done}</strong> of <strong>{blEst.total}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Archive (done items) */}
        {(() => {
          const archiveItems = backlog.filter(i => i.status === "done");
          if (archiveItems.length === 0) return null;
          const archiveFiltered = filterItems(archiveItems);
          return (
            <div className="sb-section sb-completed-section">
              <div className="sb-section-head" onClick={() => setShowCompleted(v => !v)} style={{ cursor: "pointer" }}>
                <div className="sb-head-left">
                  <button className="sb-chevron">
                    {showCompleted ? <IChevDown style={{ width: 14, height: 14 }} /> : <IChevR style={{ width: 14, height: 14 }} />}
                  </button>
                  <span className="sb-sprint-name">Archive</span>
                  <span className="sb-item-count">({archiveItems.length} done item{archiveItems.length !== 1 ? "s" : ""})</span>
                </div>
              </div>
              {showCompleted && (
                <div className="sb-items">
                  {archiveFiltered.map(item => (
                    <div key={item.id} className="sb-archive-row" onClick={() => onOpenItem?.(item)}>
                      <BLTypeIcon type={item.type} />
                      <span className="sb-archive-id">{item.displayId}</span>
                      <span className="sb-archive-title">{item.title}</span>
                      <button
                        className="sb-archive-reopen"
                        onClick={e => { e.stopPropagation(); reopenItem(item.id); }}
                        title="Move back to backlog"
                      >
                        Reopen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* Add Dates modal */}
      {editSprintFor && (
        <div className="sb-modal-backdrop" onClick={() => setEditSprintFor(null)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Edit sprint</span>
              <button className="sb-modal-close" onClick={() => setEditSprintFor(null)}><IClose style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="sb-modal-body">
              <div className="sb-modal-row">
                <label>Sprint name</label>
                <input className="sb-modal-input" autoFocus value={editSprintFor.name}
                  onChange={e => setEditSprintFor(p => p ? { ...p, name: e.target.value } : null)} />
              </div>
              <div className="sb-modal-row">
                <label>Sprint goal <span style={{ color: "var(--proj-text-4)", fontWeight: 400 }}>(optional)</span></label>
                <textarea className="sb-modal-textarea" placeholder="What do you want to achieve this sprint?"
                  value={editSprintFor.goal}
                  onChange={e => setEditSprintFor(p => p ? { ...p, goal: e.target.value } : null)} />
              </div>
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" onClick={() => setEditSprintFor(null)}>Cancel</button>
              <button className="sb-modal-confirm" onClick={() => {
                if (!editSprintFor) return;
                const trimmed = editSprintFor.name.trim();
                if (!trimmed) return;
                setSprints(p => p.map(s => s.id === editSprintFor.sprintId ? { ...s, name: trimmed } : s));
                sprintsApi.update(projectId, editSprintFor.sprintId, { name: trimmed, goal: editSprintFor.goal || undefined })
                  .catch(e => console.error("Failed to update sprint", e));
                setEditSprintFor(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteSprintFor && (
        <div className="sb-modal-backdrop" onClick={() => !deletingSprint && setDeleteSprintFor(null)}>
          <div className="sb-modal del-proj-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Delete {deleteSprintFor.name}?</span>
              {!deletingSprint && (
                <button className="sb-modal-close" onClick={() => setDeleteSprintFor(null)}><IClose style={{ width: 16, height: 16 }} /></button>
              )}
            </div>
            <div className="sb-modal-body">
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--proj-text-2)", lineHeight: 1.55 }}>
                This will permanently delete <strong>{deleteSprintFor.name}</strong>.
                {deleteSprintFor.itemCount > 0 && (
                  <> {deleteSprintFor.itemCount} work item{deleteSprintFor.itemCount === 1 ? "" : "s"} will be moved back to the backlog.</>
                )}
              </p>
              <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--proj-text-4)" }}>This cannot be undone.</p>
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" disabled={deletingSprint} onClick={() => setDeleteSprintFor(null)}>Cancel</button>
              <button className="sb-modal-confirm" style={{ background: "var(--red)" }} disabled={deletingSprint}
                onClick={async () => {
                  if (!deleteSprintFor) return;
                  setDeletingSprint(true);
                  const sid = deleteSprintFor.sprintId;
                  const sprintItems = sprints.find(s => s.id === sid)?.items ?? [];
                  setSprints(p => p.filter(s => s.id !== sid));
                  setBacklog(p => [...p, ...sprintItems.map(i => ({ ...i, sprintId: undefined }))]);
                  try {
                    await sprintsApi.delete(projectId, sid);
                  } catch (e) {
                    console.error("Failed to delete sprint", e);
                  } finally {
                    setDeletingSprint(false);
                    setDeleteSprintFor(null);
                  }
                }}>{deletingSprint ? "Deleting…" : "Delete sprint"}</button>
            </div>
          </div>
        </div>
      )}

      {addDatesFor && (
        <div className="sb-modal-backdrop" onClick={() => setAddDatesFor(null)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Set sprint dates</span>
              <button className="sb-modal-close" onClick={() => setAddDatesFor(null)}><IClose style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="sb-modal-body">
              <div className="sb-modal-row">
                <label>Start date</label>
                <DatePicker value={addDatesFor.start}
                  onChange={start => setAddDatesFor(p => p ? { ...p, start } : null)} />
              </div>
              <div className="sb-modal-row">
                <label>End date</label>
                <DatePicker value={addDatesFor.end}
                  onChange={end => setAddDatesFor(p => p ? { ...p, end } : null)} />
              </div>
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" onClick={() => setAddDatesFor(null)}>Cancel</button>
              <button className="sb-modal-confirm" onClick={() => saveDates(addDatesFor.sprintId, addDatesFor.start, addDatesFor.end)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Start Sprint modal */}
      {startFor && (
        <div className="sb-modal-backdrop" onClick={() => setStartFor(null)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Start sprint</span>
              <button className="sb-modal-close" onClick={() => setStartFor(null)}><IClose style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="sb-modal-body">
              <div className="sb-modal-row">
                <label>Sprint name</label>
                <input className="sb-modal-input" value={startFor.name}
                  onChange={e => setStartFor(p => p ? { ...p, name: e.target.value } : null)} />
              </div>
              <div className="sb-modal-row">
                <label>Start date</label>
                <DatePicker value={startFor.start} onChange={start => {
                  setStartFor(p => {
                    if (!p) return p;
                    if (sprintDuration === "custom") return { ...p, start };
                    const weeks = parseInt(sprintDuration, 10);
                    const d = new Date(start);
                    d.setDate(d.getDate() + weeks * 7);
                    return { ...p, start, end: d.toISOString().slice(0, 10) };
                  });
                }} />
              </div>
              <div className="sb-modal-row">
                <label>Duration</label>
                <div className="fc-wrap" onClick={e => e.stopPropagation()}>
                  <button type="button" className="filter-chip filter-chip-full"
                    onClick={() => setDurationOpen(v => !v)}>
                    {sprintDuration === "custom" ? "Custom" : `${sprintDuration} week${sprintDuration === "1" ? "" : "s"}`}
                    <IChevDown style={{ width: 12, height: 12, marginLeft: 6 }} />
                  </button>
                  {durationOpen && (
                    <div className="fc-pop">
                      {(["1", "2", "3", "4", "custom"] as const).map(v => (
                        <button type="button" key={v}
                          className={"fc-opt" + (sprintDuration === v ? " active" : "")}
                          onClick={() => {
                            setSprintDuration(v); setDurationOpen(false);
                            if (v !== "custom") {
                              setStartFor(p => {
                                if (!p) return p;
                                const weeks = parseInt(v, 10);
                                const d = new Date(p.start || new Date().toISOString().slice(0, 10));
                                d.setDate(d.getDate() + weeks * 7);
                                return { ...p, end: d.toISOString().slice(0, 10) };
                              });
                            }
                          }}>
                          {v === "custom" ? "Custom" : `${v} week${v === "1" ? "" : "s"}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="sb-modal-row">
                <label>End date</label>
                <div style={sprintDuration !== "custom" ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
                  <DatePicker value={startFor.end} onChange={end => setStartFor(p => p ? { ...p, end } : null)} />
                </div>
              </div>
              <div className="sb-modal-row">
                <label>Sprint goal <span style={{ color: "var(--proj-text-4)", fontWeight: 400 }}>(optional)</span></label>
                <textarea className="sb-modal-textarea" placeholder="What do you want to achieve this sprint?"
                  value={startFor.goal}
                  onChange={e => setStartFor(p => p ? { ...p, goal: e.target.value } : null)} />
              </div>
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" onClick={() => setStartFor(null)}>Cancel</button>
              <button className="sb-modal-confirm" onClick={() => doStartSprint(startFor.sprintId)}>Start sprint</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────

const _TL_MONTHS = ["FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN"];

const GOAL_SWATCHES = [
  "#338EF7","#9353D3","#F97316","#17C964","#F5A524","#F31260","#06B6D4","#10B981",
];

const GOAL_EMOJIS = ["🎯","🚀","💡","🔑","💰","👋","💸","⚡","🌟","🛠️","📦","🎨"];

function goalBarStyle(color: string) {
  return { background: color, borderColor: color };
}

const TimelineTab = memo(function TimelineTab({ projectName, allSprints, goals, setGoals, projectId }: {
  projectName?: string;
  allSprints: BLSprintData[];
  goals: ApiGoal[];
  setGoals: React.Dispatch<React.SetStateAction<ApiGoal[]>>;
  projectId: string;
}) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  // ── Dynamic window from actual data ──────────────────────────────────────
  const sprintsWithDates = allSprints.filter(s => s.startIso && s.endIso);

  const allTs: number[] = [
    ...goals.flatMap(g => [new Date(g.startDate).getTime(), new Date(g.endDate).getTime()]),
    ...sprintsWithDates.flatMap(s => [new Date(s.startIso!).getTime(), new Date(s.endIso!).getTime()]),
  ];

  const PAD = 15 * 24 * 60 * 60 * 1000; // 15 days
  const winStart = allTs.length > 0
    ? Math.min(...allTs) - PAD
    : new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const winEnd = allTs.length > 0
    ? Math.max(...allTs) + PAD
    : new Date(now.getFullYear(), now.getMonth() + 3, 0).getTime();
  const winRange = winEnd - winStart;

  function datePct(d: string | Date): number {
    return Math.min(100, Math.max(0, ((new Date(d).getTime() - winStart) / winRange) * 100));
  }

  // Today fraction (0-1) for the now-line position
  const nowFrac = Math.min(1, Math.max(0, (now.getTime() - winStart) / winRange));

  // Build month label list for the dynamic window
  const dynMonths: { label: string; pct: number; isNow: boolean }[] = [];
  const mCur = new Date(winStart); mCur.setDate(1);
  while (mCur.getTime() <= winEnd) {
    const mStart  = mCur.getTime();
    const mEndDay = new Date(mCur.getFullYear(), mCur.getMonth() + 1, 0).getTime();
    const centerPct = ((Math.min(mEndDay, winEnd) + Math.max(mStart, winStart)) / 2 - winStart) / winRange * 100;
    dynMonths.push({
      label:  mCur.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      pct:    centerPct,
      isNow:  mCur.getFullYear() === now.getFullYear() && mCur.getMonth() === now.getMonth(),
    });
    mCur.setMonth(mCur.getMonth() + 1);
  }
  const nMonths = dynMonths.length;

  // ── Goal modal state ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [editGoalId, setEditGoalId]     = useState<string | null>(null);
  const [gName, setGName]               = useState("");
  const [gEmoji, setGEmoji]             = useState("🎯");
  const [gColor, setGColor]             = useState(GOAL_SWATCHES[0]);
  const [gStart, setGStart]             = useState("");
  const [gEnd, setGEnd]                 = useState("");
  const [saving, setSaving]             = useState(false);
  const [nameShake, setNameShake]       = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [endTrigger, setEndTrigger]     = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiPickerOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function openCreate() {
    setEditGoalId(null);
    setGName(""); setGEmoji("🎯");
    setGColor(GOAL_SWATCHES[goals.length % GOAL_SWATCHES.length]);
    setGStart(""); setGEnd("");
    setNameShake(false); setSubmitted(false); setEndTrigger(0);
    setModalOpen(true);
  }

  function openEdit(g: ApiGoal) {
    setEditGoalId(g.id);
    setGName(g.name); setGEmoji(g.emoji); setGColor(g.color);
    setGStart(String(g.startDate).slice(0, 10));
    setGEnd(String(g.endDate).slice(0, 10));
    setModalOpen(true);
  }

  async function saveGoal() {
    if (!gName.trim() || !gStart || !gEnd) {
      setSubmitted(true);
      if (!gName.trim()) {
        setNameShake(true);
        setTimeout(() => setNameShake(false), 420);
      }
      return;
    }
    setSaving(true);
    try {
      if (editGoalId) {
        const updated = await goalsApi.update(projectId, editGoalId, {
          name: gName.trim(), emoji: gEmoji, color: gColor,
          startDate: gStart, endDate: gEnd,
        });
        setGoals(prev => prev.map(g => g.id === editGoalId ? updated : g));
      } else {
        const created = await goalsApi.create(projectId, {
          name: gName.trim(), emoji: gEmoji, color: gColor,
          startDate: gStart, endDate: gEnd,
        });
        setGoals(prev => [...prev, created]);
      }
      setModalOpen(false);
    } catch (e) {
      console.error("save goal failed", e);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(goalId: string) {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    try { await goalsApi.delete(projectId, goalId); }
    catch (e) { console.error("delete goal failed", e); }
  }

  function scrollGantt(dir: number) {
    ganttRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }

  return (
    <div className="pane active">
      <div className="roadmap-wrap">
        {/* Toolbar */}
        <div className="rm-toolbar">
          <span className="rm-title">Roadmap — {projectName ?? "Project"}</span>
          <button className="filter-chip" onClick={() => scrollGantt(-1)}><IChevL style={{ width: 12, height: 12 }} /></button>
          <button className="filter-chip" onClick={() => scrollGantt(1)}><IChevR style={{ width: 12, height: 12 }} /></button>
          <button className="filter-chip">{nMonths} mo · {new Date(winStart).toLocaleDateString("en-US",{month:"short",year:"2-digit"})} – {new Date(winEnd).toLocaleDateString("en-US",{month:"short",year:"2-digit"})}</button>
          <button className="proj-btn-primary" style={{ marginLeft: "auto", padding: "5px 14px", fontSize: 12 }} onClick={openCreate}>
            <IPlus /> Goal
          </button>
        </div>

        {/* Gantt */}
        <div className="gantt" ref={ganttRef}>
          {/* Header */}
          <div className="gantt-head">
            <div className="gh-label">Goal / Initiative</div>
            <div className="gh-months">
              {dynMonths.map((m, i) => (
                <div key={i} className={"gh-m" + (m.isNow ? " gh-now" : "")}
                  style={{ left: `${m.pct.toFixed(2)}%` }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-body" style={{ "--tl-n": nMonths } as React.CSSProperties}>
            <div className="gantt-now-line" style={{ left: `calc(200px + (100% - 200px) * ${nowFrac.toFixed(4)})` }} />

            {/* Goal rows */}
            {goals.length === 0 ? (
              <div className="gantt-row gantt-empty-row">
                <div className="gr-label" style={{ color: "var(--proj-text-4)", fontSize: 12 }}>
                  No goals yet — click "+ Goal" to add one
                </div>
                <div className="gantt-track" />
              </div>
            ) : (
              goals.map((g) => {
                const startPct = datePct(g.startDate).toFixed(2);
                const width    = Math.max(datePct(g.endDate) - datePct(g.startDate), 1.5).toFixed(2);
                return (
                  <div key={g.id} className="gantt-row gantt-goal-row">
                    <div className="gr-label">
                      <span className="gr-dot" style={{ background: g.color }} />
                      <span style={{ fontSize: 14 }}>{g.emoji}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                      <div className="gr-row-actions">
                        <button className="gr-action-btn" onClick={() => openEdit(g)} title="Edit"><IPencil /></button>
                        <button className="gr-action-btn gr-action-del" onClick={() => deleteGoal(g.id)} title="Delete"><ITrash /></button>
                      </div>
                    </div>
                    <div className="gantt-track">
                      <div className="gantt-bar gantt-goal-bar" style={{ left: `${startPct}%`, width: `${width}%`, ...goalBarStyle(g.color) }}>
                        {g.name}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Sprints divider row */}
            <div className="gantt-section-row">
              <div className="gh-label" style={{ fontWeight: 700, fontSize: 11, color: "var(--proj-text-3)", letterSpacing: "0.06em" }}>SPRINTS</div>
              <div className="gantt-track" />
            </div>

            {/* Sprint chips row */}
            <div className="gantt-row gantt-sprint-row">
              <div className="gr-label" style={{ fontSize: 12, color: "var(--proj-text-3)" }}>
                {sprintsWithDates.length} sprint{sprintsWithDates.length !== 1 ? "s" : ""}
              </div>
              <div className="gantt-track gantt-sprint-track">
                {sprintsWithDates.length === 0 ? (
                  <span style={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", fontSize: 11, color: "var(--proj-text-4)" }}>
                    Add dates to sprints to show them here
                  </span>
                ) : (
                  sprintsWithDates.map((s, _idx) => {
                    const startPct = datePct(s.startIso!).toFixed(2);
                    const width    = Math.max(datePct(s.endIso!) - datePct(s.startIso!), 2).toFixed(2);
                    return (
                      <div key={s.id} className={"gantt-sprint-chip" + (s.active ? " gantt-sprint-chip-active" : "")}
                        style={{ left: `${startPct}%`, width: `${width}%` }}
                        title={`${s.name} · ${s.startIso} → ${s.endIso}`}>
                        {s.name}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rm-footnote">
          ▲ Vertical line = today · {goals.length} goal{goals.length !== 1 ? "s" : ""} · {sprintsWithDates.length} sprint{sprintsWithDates.length !== 1 ? "s" : ""} with dates
        </div>
      </div>

      {/* Goal drawer backdrop */}
      {modalOpen && <div className="goal-panel-backdrop" onClick={() => setModalOpen(false)} />}

      {/* Goal slide-in drawer */}
      <div className={"goal-panel" + (modalOpen ? " open" : "")}>
        {/* Header */}
        <div className="goal-panel-head">
          <div className="cs-panel-crumb">
            <span>{projectName ?? "Project"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            <span className="cs-panel-crumb-cur">{editGoalId ? "Edit Goal" : "Create Goal"}</span>
          </div>
          <button className="goal-panel-close" onClick={() => setModalOpen(false)}>
            <IClose style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div className="goal-panel-body">
          {/* Emoji + Name */}
          <div className="goal-panel-field">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div ref={emojiRef} className="goal-emoji-wrap">
                <button type="button" className="goal-emoji-display" onClick={() => setEmojiPickerOpen(o => !o)}>
                  {gEmoji}
                </button>
                {emojiPickerOpen && (
                  <div className="goal-emoji-picker">
                    {GOAL_EMOJIS.map(e => (
                      <button key={e} className={"goal-emoji-opt" + (gEmoji === e ? " goal-emoji-sel" : "")}
                        onClick={() => { setGEmoji(e); setEmojiPickerOpen(false); }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="goal-panel-label">GOAL NAME</div>
                <input
                  className={"ms-input" + (nameShake ? " goal-name-shake" : "")}
                  style={{ width: "100%", marginTop: 4, ...(nameShake ? { borderColor: "var(--red, #F31260)", outline: "2px solid rgb(243 18 96 / 0.2)" } : {}) }}
                  placeholder="e.g. Launch MVP, Auth & Sessions…"
                  value={gName}
                  onChange={e => { setGName(e.target.value); if (nameShake) setNameShake(false); if (submitted && e.target.value.trim()) setSubmitted(false); }}
                  autoFocus={modalOpen}
                  onKeyDown={e => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setModalOpen(false); }}
                />
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="goal-panel-field">
            <div className="goal-panel-label">COLOR</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              {GOAL_SWATCHES.map(c => (
                <button key={c} className={"goal-swatch" + (gColor === c ? " goal-swatch-sel" : "")}
                  style={{ background: c, color: c }} onClick={() => setGColor(c)} />
              ))}
              <label className="goal-swatch goal-swatch-picker" title="Custom color">
                <input type="color" value={gColor} onChange={e => setGColor(e.target.value)}
                  style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                <span style={{ fontSize: 11, pointerEvents: "none", color: "var(--proj-text-4)", fontWeight: 700 }}>+</span>
              </label>
              <span style={{ fontSize: 11, color: "var(--proj-text-4)", fontFamily: "var(--proj-mono)" }}>{gColor}</span>
            </div>
            {/* Color preview bar */}
            <div style={{ height: 4, borderRadius: 2, background: gColor, marginTop: 10, opacity: 0.7 }} />
          </div>

          {/* Dates — same row */}
          <div className="goal-panel-field">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div className="goal-panel-label" style={{ marginBottom: 8 }}>START DATE</div>
                <DatePicker
                  value={gStart}
                  onChange={v => { setGStart(v); if (v && !gEnd) setEndTrigger(t => t + 1); }}
                  placeholder="Pick start"
                  error={submitted && !gStart}
                />
              </div>
              <div>
                <div className="goal-panel-label" style={{ marginBottom: 8 }}>END DATE</div>
                <DatePicker
                  value={gEnd}
                  onChange={setGEnd}
                  placeholder="Pick end"
                  triggerOpen={endTrigger}
                  align="right"
                  error={submitted && !gEnd}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="goal-panel-foot">
          {editGoalId && (
            <button className="ms-del-btn" onClick={() => { deleteGoal(editGoalId); setModalOpen(false); }}>
              Delete
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="proj-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="proj-btn-primary" onClick={saveGoal} disabled={saving || !gName.trim() || !gStart || !gEnd}>
              {saving ? "Saving…" : editGoalId ? "Save changes" : "Create goal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────

type TeamMemberFull = Owner & { email: string; role: string; taskCount: number; inReviewCount: number; doneCount: number };

function AddMemberModal({
  projectId, existingIds, onAdded, onClose,
}: {
  projectId: string; existingIds: Set<string>;
  onAdded: (members: TeamMemberFull[]) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await usersApi.search(q)); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function add(u: ApiUserSearchResult) {
    setAdding(u.id); setErr("");
    try {
      const res = await projectsApi.members.add(projectId, u.email);
      const mapped: TeamMemberFull[] = (res?.members ?? []).map((m) => ({
        id: m.user.id,
        initials: userInitials(m.user.name),
        name: m.user.name,
        email: m.user.email,
        color: userColor(m.user.id),
        role: m.role,
        taskCount: 0,
        inReviewCount: 0,
        doneCount: 0,
      }));
      onAdded(mapped);
      setQ(""); setResults([]);
    } catch (e: any) {
      setErr(e.message ?? "Failed");
    } finally {
      setAdding(null);
    }
  }

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "grid", placeItems: "center", zIndex: 500,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--proj-surface)", borderRadius: 18, padding: 28,
        width: "min(460px,92vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--proj-text)", marginBottom: 16 }}>
          Add team member
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          border: "1px solid var(--proj-line-strong)", borderRadius: 10,
          padding: "9px 12px", background: "var(--proj-surface-2)",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--proj-text-3)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            autoFocus
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "var(--proj-text)", outline: "none" }}
            placeholder="Search by name or email…"
            value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
        {err && <p style={{ color: "#dc2828", fontSize: 13, margin: "8px 0 0" }}>{err}</p>}
        {q.trim().length >= 2 && (
          <div style={{ marginTop: 8, borderRadius: 10, border: "1px solid var(--proj-line)", overflow: "hidden" }}>
            {searching && <p style={{ padding: "12px 16px", fontSize: 13, color: "var(--proj-text-3)", margin: 0 }}>Searching…</p>}
            {!searching && results.length === 0 && (
              <p style={{ padding: "12px 16px", fontSize: 13, color: "var(--proj-text-3)", margin: 0 }}>
                No registered users found for "{q}"
              </p>
            )}
            {results.map(u => {
              const already = existingIds.has(u.id);
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--proj-line)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: userColor(u.id), display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>{userInitials(u.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--proj-text)" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--proj-text-3)" }}>{u.email}</div>
                  </div>
                  {already ? (
                    <span style={{ fontSize: 12, color: "var(--proj-text-4)" }}>Already added</span>
                  ) : (
                    <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 12 }}
                      disabled={adding === u.id} onClick={() => add(u)}>
                      {adding === u.id ? "Adding…" : "Add"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="proj-btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const TeamTab = memo(function TeamTab({ owners, projectId, myRole, currentUserId, onMembersUpdated }: {
  owners: TeamMemberFull[]; projectId: string; myRole: string;
  currentUserId?: string;
  onMembersUpdated: (members: TeamMemberFull[]) => void;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "makeOwner"; member: TeamMemberFull } | null>(null);
  const [busy, setBusy] = useState(false);
  const existingIds = new Set(owners.map(o => o.id));
  const canManage = ["owner", "admin"].includes(myRole);
  const isOwner = myRole === "owner";

  useEffect(() => {
    if (!menuOpenFor) return;
    const close = () => setMenuOpenFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenFor]);

  async function doConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "remove") {
        await projectsApi.members.remove(projectId, confirm.member.id);
        onMembersUpdated(owners.filter(o => o.id !== confirm.member.id));
      } else {
        const res = await projectsApi.members.updateRole(projectId, confirm.member.id, "owner");
        const updated: TeamMemberFull[] = (res?.members ?? []).map((m) => {
          const existing = owners.find(o => o.id === m.user.id);
          return {
            id: m.user.id,
            initials: existing?.initials ?? userInitials(m.user.name),
            name: m.user.name,
            email: m.user.email,
            color: existing?.color ?? userColor(m.user.id),
            role: m.role,
            taskCount: existing?.taskCount ?? 0,
            inReviewCount: existing?.inReviewCount ?? 0,
            doneCount: existing?.doneCount ?? 0,
          };
        });
        onMembersUpdated(updated);
      }
      setConfirm(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pane active">
      <div className="team-wrap">
        <div className="team-head">
          <span className="team-title">Team Members</span>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="team-stat-pill"><strong>{owners.length}</strong> members</span>
            {canManage && (
              <button className="proj-btn-ghost" onClick={() => setShowInvite(true)}>
                <IPlus /> Add member
              </button>
            )}
          </div>
        </div>
        {owners.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--proj-text-3)", fontSize: 14 }}>
            No members yet. Add colleagues using the button above.
          </div>
        ) : (
          <div className="team-grid">
            {owners.map((m) => {
              const taskPct = Math.min(m.taskCount * 8, 100);
              const loadClass = taskPct >= 80 ? "load-bad" : taskPct >= 55 ? "load-mid" : "load-good";
              const loadLabel = taskPct >= 80 ? "Overloaded" : taskPct >= 55 ? "Near capacity" : "Healthy";
              const isMe = currentUserId === m.id;
              const isTargetOwner = m.role === "owner";
              const canRemove = canManage && !isTargetOwner && !isMe;
              const canPromote = isOwner && !isTargetOwner && !isMe;
              const showMenu = canRemove || canPromote;
              return (
                <div key={m.id} className="member-card" style={{ position: "relative" }}>
                  {showMenu && (
                    <div style={{ position: "absolute", top: 10, right: 10 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="member-menu-btn"
                        onClick={() => setMenuOpenFor(menuOpenFor === m.id ? null : m.id)}
                        aria-label="Member actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                      </button>
                      {menuOpenFor === m.id && (
                        <div className="member-menu">
                          {canPromote && (
                            <button className="member-menu-opt" onClick={() => { setMenuOpenFor(null); setConfirm({ kind: "makeOwner", member: m }); }}>
                              Make owner
                            </button>
                          )}
                          {canRemove && (
                            <button className="member-menu-opt member-menu-opt-danger" onClick={() => { setMenuOpenFor(null); setConfirm({ kind: "remove", member: m }); }}>
                              Remove from project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="member-top">
                    <div className="pav pav-lg" style={{ background: m.color }}>{m.initials}</div>
                    <div>
                      <div className="member-name">{m.name}</div>
                      <div className="member-role" style={{ textTransform: "capitalize" }}>{m.role}</div>
                    </div>
                  </div>
                  <div className="member-stats">
                    <div className="ms">
                      <div className="ms-n">{m.taskCount}</div>
                      <div className="ms-l">Tasks</div>
                    </div>
                    <div className="ms">
                      <div className="ms-n" style={m.inReviewCount === 0 ? { color: "var(--proj-text-4)" } : undefined}>
                        {m.inReviewCount > 0 ? m.inReviewCount : "—"}
                      </div>
                      <div className="ms-l">Reviews</div>
                    </div>
                    <div className="ms">
                      <div className="ms-n" style={m.doneCount === 0 ? { color: "var(--proj-text-4)" } : undefined}>
                        {m.doneCount > 0 ? m.doneCount : "—"}
                      </div>
                      <div className="ms-l">Done</div>
                    </div>
                  </div>
                  <div className="member-load">
                    <div className="member-load-label">
                      <span>Workload</span>
                      <span className={loadClass === "load-bad" ? "bl-h" : ""}>{loadLabel}</span>
                    </div>
                    <div className="member-load-bar">
                      <div className={"load-fill " + loadClass} style={{ width: taskPct + "%" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showInvite && (
        <AddMemberModal
          projectId={projectId}
          existingIds={existingIds}
          onAdded={onMembersUpdated}
          onClose={() => setShowInvite(false)}
        />
      )}
      {confirm && createPortal(
        <div className="member-confirm-backdrop" onClick={() => !busy && setConfirm(null)}>
          <div className="member-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="member-confirm-title">
              {confirm.kind === "remove" ? "Remove member?" : "Transfer ownership?"}
            </h3>
            <p className="member-confirm-body">
              {confirm.kind === "remove"
                ? <>Remove <strong>{confirm.member.name}</strong> from this project? Their assigned tasks will be unassigned.</>
                : <>Make <strong>{confirm.member.name}</strong> the owner? You will be demoted to admin. This cannot be undone without their consent.</>}
            </p>
            <div className="member-confirm-actions">
              <button className="proj-btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button
                className={confirm.kind === "remove" ? "proj-btn-danger" : "proj-btn-primary"}
                onClick={doConfirm} disabled={busy}
              >
                {busy ? "Working…" : confirm.kind === "remove" ? "Remove" : "Transfer"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});

// ─── TASK PANEL ───────────────────────────────────────────────────────────────

function TaskPanel({ open, onClose, onClone, onDelete, projectName, card, projectId, allSprints, owners, onItemChange }: {
  open: boolean; onClose: () => void;
  onClone?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  projectName?: string; card?: CardPreview | null;
  projectId?: string; allSprints?: BLSprintData[]; owners?: Owner[];
  onItemChange?: (itemId: string, changes: Partial<BLItem>) => void;
}) {
  const mentionSource = useCallback((query: string) => {
    const q = query.toLowerCase();
    return (owners ?? [])
      .filter(o => !q || o.name.toLowerCase().includes(q))
      .map(o => ({ id: o.id, name: o.name, initials: o.initials, color: o.color }));
  }, [owners]);
  const currentUser = useAuthStore(s => s.user);
  const initStatus = card?.status ?? "To Do";
  const initPrio   = PRIO_LABEL[card?.prio ?? ""] || "Medium";
  const initSprint = allSprints?.find(s => s.id === card?.sprintId)?.name ?? "";

  const [checked, setChecked]     = useState<Record<string, boolean>>({});
  const [taskTitle, setTaskTitle] = useState(card?.title ?? "");
  const [taskStatus, setTaskStatus] = useState(initStatus);
  const [taskPrio, setTaskPrio]   = useState(initPrio);
  const [taskPts, setTaskPts]     = useState(card?.pts ?? 0);
  const [taskSprint, setTaskSprint] = useState(initSprint);
  const [taskDueDate, setTaskDueDate] = useState(card?.dueDate ?? "");
  const [taskDesc, setTaskDesc]   = useState(card?.description ?? "");
  const [comments, setComments]   = useState<ApiComment[]>([]);
  const [titleEditing, setTitleEditing] = useState(false);
  const [descEditing, setDescEditing]   = useState(false);
  const [ownerName, setOwnerName] = useState(card?.assignees?.[0]?.name ?? "");
  const [reporterId, setReporterId] = useState<string>(card?.reporter?.id ?? "");

  useEffect(() => {
    if (!open || !card) return;
    setTaskTitle(card.title ?? "");
    setTaskStatus(card.status ?? "To Do");
    setTaskPrio(PRIO_LABEL[card.prio ?? ""] || "Medium");
    setTaskPts(card.pts ?? 0);
    setTaskSprint(allSprints?.find(s => s.id === card.sprintId)?.name ?? "");
    setTaskDueDate(card.dueDate ?? "");
    setTaskDesc(card.description ?? "");
    setReporterId(card.reporter?.id ?? "");
    setChecked(
      Object.fromEntries((card.blSubtasks ?? []).map(s => [s.id, s.status === "done"]))
    );
    setOwnerName(card.assignees?.[0]?.name ?? "");
    setTitleEditing(false);
    setDescEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id]);

  useEffect(() => {
    if (!open || !card || !projectId) return;
    commentsApi.list(projectId, card.id)
      .then(list => setComments(list))
      .catch(e => console.error("Failed to load comments", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id, projectId]);

  function apiSave(patch: Parameters<typeof itemsApi.update>[2]) {
    if (card && projectId) {
      itemsApi.update(projectId, card.id, patch)
        .catch(e => console.error("Failed to save", e));
      if (onItemChange) {
        const blChanges: Partial<BLItem> = {};
        if (patch.title !== undefined)       blChanges.title = patch.title;
        if (patch.description !== undefined) blChanges.description = patch.description;
        if (patch.status !== undefined)      blChanges.status = (API_STATUS_TO_BL[patch.status] ?? "todo") as BLStatus;
        if (patch.priority !== undefined)    blChanges.priority = API_PRIO_TO_BL[patch.priority] ?? "tp-med";
        if (patch.points !== undefined)      blChanges.pts = patch.points;
        if (patch.dueDate !== undefined)     blChanges.dueDate = patch.dueDate ?? undefined;
        if (patch.sprintId !== undefined)    blChanges.sprintId = patch.sprintId ?? undefined;
        if (Object.keys(blChanges).length) onItemChange(card.id, blChanges);
      }
    }
  }

  const taskColor = "#338EF7";
  const TASK_LABEL_TO_BL: Record<string, BLStatus> = { "To Do": "todo", "In Progress": "in-progress", "In Review": "in-review", "Done": "done" };
  const TASK_BL_TO_LABEL: Record<BLStatus, string> = { "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done" };
  const subtasks = card?.blSubtasks ?? [];
  const doneSubs = subtasks.filter(s => (checked[s.id] !== undefined ? checked[s.id] : s.status === "done")).length;
  const subProg  = subtasks.length > 0 ? Math.round(doneSubs / subtasks.length * 100) : 0;

  return (
    <>
      <div className={"tp-backdrop" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"task-panel task-panel--wide" + (open ? " open" : "")} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span style={{ color: "var(--proj-text-3)", fontSize: 12 }}>{taskSprint || "Backlog"}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span className="tp-crumb-id" style={{ color: taskColor }}>
              {card?.displayId ?? card?.id?.slice(-6) ?? ""}
            </span>
          </div>
          <div className="tp-head-actions">
            <PanelHeaderActions onClose={onClose} onClone={onClone} onDelete={onDelete} kind="task" />
          </div>
        </div>

        <div className="tp-body">
          <div className="tp-main">

            {/* Task type chip */}
            <div className="tp-status-row">
              <div className="tp-mini-chip" style={{ background: taskColor + "18", color: taskColor, border: `1px solid ${taskColor}40` }}>
                <IBoxes style={{ width: 10, height: 10, marginRight: 4 }} />
                Task
              </div>
            </div>

            {/* Title — click to edit */}
            {titleEditing
              ? <input
                  className="cs-input tp-title-input"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (taskTitle.trim() && taskTitle.trim() !== card?.title) apiSave({ title: taskTitle.trim() });
                    setTitleEditing(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setTaskTitle(card?.title ?? ""); setTitleEditing(false); }
                  }}
                />
              : <h2 className="tp-title tp-title-click" onClick={() => setTitleEditing(true)}>
                  {taskTitle || card?.title}
                </h2>
            }

            {/* Progress bar (subtasks) */}
            {subtasks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--proj-text-3)", marginBottom: 6 }}>
                  <span>Progress</span>
                  <span>{doneSubs} / {subtasks.length} subtasks · {subProg}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--proj-surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: subProg + "%", background: taskColor, borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
            )}

            {/* Description — click to edit */}
            <div className="tp-sec-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Description</span>
              {descEditing && (
                <button className="proj-btn-primary" style={{ fontSize: 10.5, padding: "3px 10px" }}
                  onClick={() => {
                    apiSave({ description: taskDesc });
                    setDescEditing(false);
                  }}>Save</button>
              )}
            </div>
            <div
              className={"tp-desc-area" + (descEditing ? " tp-desc-editing" : "")}
              onClick={() => !descEditing && setDescEditing(true)}
              title={descEditing ? undefined : "Click to edit description"}
            >
              <RichEditor content={taskDesc} editable={descEditing} onChange={setTaskDesc} minHeight={descEditing ? 120 : undefined} mentionSource={mentionSource} />
              {!descEditing && !taskDesc.replace(/<[^>]+>/g,"").trim() && (
                <div className="tp-desc-placeholder">Click to add a description…</div>
              )}
            </div>

            {/* Subtasks */}
            {subtasks.length > 0 && (
              <>
                <div className="tp-subsec-hd">
                  <span className="tp-subsec-label">
                    Sub-tasks
                    <span className="tp-subsec-count">{doneSubs}/{subtasks.length}</span>
                  </span>
                </div>
                <div className="subtask-list">
                  {subtasks.map(s => {
                    const isDone = checked[s.id] !== undefined ? checked[s.id] : s.status === "done";
                    return (
                      <div key={s.id} className={"subtask-row" + (isDone ? " checked" : "")}
                        onClick={() => {
                          const next = !isDone;
                          setChecked(p => ({ ...p, [s.id]: next }));
                          if (card && projectId) {
                            itemsApi.update(projectId, s.id, { status: next ? "Done" : "To Do" })
                              .catch(e => console.error("Failed to update subtask", e));
                          }
                          onItemChange?.(s.id, { status: next ? "done" : "todo" });
                        }}>
                        <div className={"checkbox" + (isDone ? " checked" : "")}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span className="subtask-name">{s.title}</span>
                        {s.pts != null && <span className="subtask-est">{s.pts} pts</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <ActivitySection projectId={projectId} itemId={card?.id} owners={owners} />

          </div>

          {/* Sidebar */}
          {card && (
            <PanelSidebar
              itemId={card.id}
              projectId={projectId}
              allSprints={allSprints ?? []}
              owners={owners ?? []}
              status={TASK_LABEL_TO_BL[taskStatus] ?? "todo"}
              onStatusChange={s => {
                setTaskStatus(TASK_BL_TO_LABEL[s]);
                onItemChange?.(card.id, { status: s });
              }}
              priority={taskPrio}
              onPriorityChange={p => {
                setTaskPrio(p);
                const blKey = ({ "Highest": "tp-highest", "High": "tp-high", "Medium": "tp-med", "Low": "tp-low", "Lowest": "tp-lowest" } as const)[p as "Highest"|"High"|"Medium"|"Low"|"Lowest"];
                if (blKey) onItemChange?.(card.id, { priority: blKey });
              }}
              ownerName={ownerName}
              onOwnerChange={name => {
                setOwnerName(name);
                if (!card) return;
                const o = (owners ?? []).find(x => x.name === name);
                onItemChange?.(card.id, {
                  assigneeName: name || undefined,
                  assignees: o ? [{ id: o.id, name: o.name, initials: o.initials, color: o.color }] : [],
                });
              }}
              reporterId={reporterId}
              onReporterChange={id => {
                setReporterId(id);
                const r = (owners ?? []).find(o => o.id === id);
                onItemChange?.(card.id, { reporter: r ? { id: r.id, name: r.name, initials: r.initials, color: r.color } : null });
              }}
              sprint={taskSprint}
              onSprintChange={name => {
                setTaskSprint(name);
                const sprintId = (allSprints ?? []).find(s => s.name === name)?.id;
                onItemChange?.(card.id, { sprintId });
              }}
              pts={taskPts}
              onPtsChange={v => { setTaskPts(v); onItemChange?.(card.id, { pts: v }); }}
              dueDate={taskDueDate}
              onDueDateChange={d => { setTaskDueDate(d); onItemChange?.(card.id, { dueDate: d }); }}
            />
          )}

        </div>
      </aside>
    </>
  );
}

// ─── Slide-to-delete ──────────────────────────────────────────────────────────

function SlideToDelete({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [phase, setPhase]   = useState<"idle" | "charged" | "done">("idle");
  const THUMB = 48;

  function max() { return (trackRef.current?.offsetWidth ?? THUMB) - THUMB; }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (loading || phase !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!(e.buttons & 1) || loading || phase !== "idle") return;
    const next = Math.max(0, Math.min(offsetRef.current + e.movementX, max()));
    offsetRef.current = next;
    setOffset(next);
  }
  function onPointerUp() {
    if (phase !== "idle") return;
    if (offsetRef.current >= max() * 0.88) {
      const m = max();
      offsetRef.current = m;
      setOffset(m);
      setPhase("charged");
      // brief glow → then parent animates modal out → fires API
      setTimeout(() => {
        setPhase("done");
        onConfirm();
      }, 320);
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }

  const pct = max() > 0 ? offset / max() : 0;

  return (
    <div ref={trackRef} className={"slide-del-track" + (phase === "charged" || phase === "done" ? " slide-del-track--charged" : "")}>
      <div className="slide-del-fill" style={{ width: offset + THUMB }} />
      <span className="slide-del-label" style={{ opacity: Math.max(0, 1 - pct * 2.5) }}>
        {phase !== "idle" || loading ? "Deleting…" : "Slide to delete"}
      </span>
      <div
        className={"slide-del-thumb" + (phase === "charged" ? " slide-del-thumb--charged" : phase === "done" ? " slide-del-thumb--done" : "")}
        style={{ transform: `translateX(${offset}px)`, cursor: phase !== "idle" || loading ? "default" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ITrash style={{ width: 16, height: 16, color: "white" }} />
      </div>
    </div>
  );
}

function PanelHeaderActions({ onClose, onClone, onDelete, kind, deleteExtras }: {
  onClose: () => void;
  onClone?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  kind: "story" | "task" | "subtask";
  deleteExtras?: React.ReactNode;
}) {
  const [delOpen, setDelOpen]   = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  async function doDelete() {
    if (!onDelete) return;
    setDelLoading(true);
    await new Promise(r => setTimeout(r, 700));
    try { await onDelete(); }
    finally { setDelLoading(false); setDelOpen(false); }
  }

  return (
    <>
      {onClone && (
        <Tooltip content={`Clone ${kind}`} placement="bottom" delay={0} closeDelay={0}>
          <button className="panel-icon-btn" onClick={() => onClone()} aria-label={`Clone ${kind}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip content={`Delete ${kind}`} placement="bottom" delay={0} closeDelay={0} color="danger">
          <button className="panel-icon-btn panel-icon-btn-danger" onClick={() => setDelOpen(true)} aria-label={`Delete ${kind}`}>
            <ITrash style={{ width: 14, height: 14 }} />
          </button>
        </Tooltip>
      )}
      <Tooltip content="Close" placement="bottom" delay={0} closeDelay={0}>
        <button className="panel-icon-btn" onClick={onClose} aria-label="Close"><IClose /></button>
      </Tooltip>
      {delOpen && createPortal(
        <div className={"sb-modal-backdrop" + (delLoading ? " del-backdrop--out" : "")} onClick={() => !delLoading && setDelOpen(false)}>
          <div className={"sb-modal del-proj-modal" + (delLoading ? " del-proj-modal--exploding" : "")} onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Delete {kind}</span>
              <button className="sb-modal-close" onClick={() => setDelOpen(false)} disabled={delLoading}><IClose style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="sb-modal-body">
              <div className="del-proj-warning">
                This will permanently delete this {kind}. This cannot be undone.
              </div>
              {deleteExtras}
              <SlideToDelete onConfirm={doDelete} loading={delLoading} />
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" onClick={() => setDelOpen(false)} disabled={delLoading}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["overview", "board", "backlog", "timeline", "team"] as const;
type TabKey = typeof TABS[number];

export default function ProjectsClient({ slug, issueRef }: { slug: string; issueRef?: string }) {
  const load               = useProjectStore(s => s.load);
  const loaded             = useProjectStore(s => s.loaded);
  const projects           = useProjectStore(s => s.projects);
  const project            = findProjectBySlug(projects, slug);
  const id                 = project?.id ?? slug;
  const updateProjectLocal = useProjectStore(s => s.updateProjectLocal);
  const deleteProjectStore = useProjectStore(s => s.deleteProject);
  const currentUser        = useAuthStore(s => s.user);
  const router             = useRouter();

  const defaultTab: TabKey = issueRef ? "board" : "overview";
  const [activeTab, setActiveTab]   = useState<TabKey>(defaultTab);
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(new Set<TabKey>(
    defaultTab === "overview" ? ["overview"] : ["overview", defaultTab]
  ));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      const next = (t && (TABS as readonly string[]).includes(t)) ? (t as TabKey) : defaultTab;
      setActiveTab(next);
      setMountedTabs(prev => prev.has(next) ? prev : new Set([...prev, next]));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTab = useCallback((t: TabKey) => {
    setActiveTab(t);
    setMountedTabs(prev => prev.has(t) ? prev : new Set([...prev, t]));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (t === "overview") url.searchParams.delete("tab");
      else url.searchParams.set("tab", t);
      window.history.pushState(null, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [openCardData, setOpenCardData] = useState<CardPreview | null>(null);
  const [openSprintStory, setOpenSprintStory] = useState<{ story: BLItem; color: string } | null>(null);
  const onOpenPanel  = useCallback(() => setPanelOpen(true), []);
  const onOpenCreate = useCallback(() => setCreateOpen(true), []);
  const buildProjectPath = useCallback((suffix: string = "") => {
    const canonical = project?.key && project.key.length > 0 ? project.key.toUpperCase() : slug;
    const search = typeof window !== "undefined" ? window.location.search : "";
    return `/projects/${canonical}${suffix}${search}`;
  }, [project, slug]);
  const onOpenStory  = useCallback((story: BLItem, color: string) => {
    setOpenSprintStory({ story, color });
    if (typeof window !== "undefined" && story.displayId) {
      window.history.replaceState(null, "", buildProjectPath(`/${story.displayId.toUpperCase()}`));
    }
  }, [buildProjectPath]);
  const onCloseStory = useCallback(() => {
    setOpenSprintStory(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", buildProjectPath());
    }
  }, [buildProjectPath]);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem("mantra_viewed_projects");
      const list: { id: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      const next = [{ id, ts: Date.now() }, ...list.filter(v => v.id !== id)].slice(0, 20);
      localStorage.setItem("mantra_viewed_projects", JSON.stringify(next));
    } catch {}
  }, [id]);

  const handleOpenCard = useCallback((c: CardPreview) => {
    setOpenCardData(c);
    setPanelOpen(true);
    if (c.displayId && typeof window !== "undefined") {
      window.history.replaceState(null, "", buildProjectPath(`/${c.displayId.toUpperCase()}`));
    }
  }, [buildProjectPath]);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setOpenCardData(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", buildProjectPath());
    }
  }, [buildProjectPath]);

  const [blSprints, setBlSprints] = useState<BLSprintData[]>([]);
  const [blBacklog, setBlBacklog] = useState<BLItem[]>([]);
  const [projectMembers, setProjectMembers] = useState<TeamMemberFull[]>([]);
  const [milestones, setMilestones] = useState<import("@/lib/api").ApiMilestone[]>([]);
  const [goals, setGoals] = useState<import("@/lib/api").ApiGoal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [projectKey, setProjectKey] = useState<string>("");

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!id) return;
    try {
      await itemsApi.delete(id, itemId);
      setBlSprints(p => p.map(sp => ({ ...sp, items: sp.items.filter(i => i.id !== itemId && i.parentStoryId !== itemId) })));
      setBlBacklog(p => p.filter(i => i.id !== itemId && i.parentStoryId !== itemId));
    } catch (e) { console.error(e); }
  }, [id]);

  const handleCloneItem = useCallback(async (src: {
    title: string; type: BLType; priority?: string; status: BLStatus; pts?: number;
    parentStoryId?: string; sprintId?: string;
  }) => {
    if (!id) return;
    try {
      const apiPrio = ({ "tp-highest": "urgent", "tp-high": "high", "tp-med": "medium", "tp-low": "low", "tp-lowest": "trivial" } as Record<string, string>)[src.priority ?? ""] ?? "medium";
      const data: { title: string; type: string; status: string; priority: string; points?: number; parentId?: string; sprintId?: string } = {
        title: src.title + " (copy)",
        type: src.type,
        status: COL_STATUS[src.status] ?? "To Do",
        priority: apiPrio,
      };
      if (src.pts != null) data.points = src.pts;
      if (src.parentStoryId) data.parentId = src.parentStoryId;
      if (src.sprintId) data.sprintId = src.sprintId;
      const created = await itemsApi.create(id, data);
      const bl = apiItemToBL(created, src.parentStoryId, projectKey);
      if (src.sprintId) {
        setBlSprints(p => p.map(sp => sp.id === src.sprintId ? { ...sp, items: [...sp.items, bl] } : sp));
      } else {
        setBlBacklog(p => [...p, bl]);
      }
    } catch (e) { console.error(e); }
  }, [id, projectKey]);
  const activeSprint = useMemo(() => blSprints.slice().reverse().find(s => s.active), [blSprints]);
  const nextTaskId   = useRef(300);
  // Stable ref so useCallback handlers don't need blSprints as a dep
  const blSprintsRef = useRef(blSprints);
  blSprintsRef.current = blSprints;

  // Canonicalize URL: prefer project key over cuid id when both resolve to same project
  useEffect(() => {
    if (!project || typeof window === "undefined") return;
    const canonical = project.key && project.key.length > 0 ? project.key.toUpperCase() : project.id;
    if (slug !== canonical) {
      const suffix = issueRef ? `/${issueRef.toUpperCase()}` : "";
      window.history.replaceState(null, "", `/projects/${canonical}${suffix}${window.location.search}`);
    }
  }, [project, slug, issueRef]);

  // Open task panel when issueRef path segment is present
  useEffect(() => {
    if (!issueRef) return;
    const all = [...blSprints.flatMap(s => s.items), ...blBacklog];
    const match = all.find(it => it.displayId?.toUpperCase() === issueRef.toUpperCase());
    if (!match) return;
    if (match.type === "story") {
      setOpenSprintStory({ story: match, color: "var(--blue)" });
      return;
    }
    {
      setOpenCardData({
        id: match.id,
        displayId: match.displayId,
        title: match.title,
        prio: match.priority ?? "tp-low",
        status: ({ "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done" } as Record<string, string>)[match.status] ?? "To Do",
        pts: match.pts,
        dueDate: match.dueDate,
        description: match.description,
        assignees: match.assignees,
        blSubtasks: match.blSubtasks,
        sprintId: match.sprintId,
        parentStoryId: match.parentStoryId,
      } as CardPreview);
      setPanelOpen(true);
    }
  }, [issueRef, blSprints, blBacklog]);

  // Load sidebar project list
  useEffect(() => { if (!loaded) load(); }, [load, loaded]);

  // Load sprint + backlog data for this project
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setDataLoading(true);
    setBlSprints([]);
    setBlBacklog([]);
    projectsApi.get(id)
      .then(data => {
        if (cancelled) return;
        const pKey = data.key || undefined;
        setProjectKey(data.key ?? "");
        const sprints: BLSprintData[] = data.sprints.map(s => {
          const topLevel = s.items.filter(i => !i.parentId);
          const subtasksFlat = topLevel.flatMap(i => i.subtasks.map(sub => apiItemToBL(sub, i.id, pKey)));
          return {
            id: s.id,
            name: s.name,
            startIso:  s.startDate ? String(s.startDate).slice(0, 10) : undefined,
            endIso:    s.endDate   ? String(s.endDate).slice(0, 10)   : undefined,
            startDate: s.startDate ? new Date(s.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
            endDate:   s.endDate   ? new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
            active: s.status === "active",
            status: s.status,
            items: [...topLevel.map(i => apiItemToBL(i, undefined, pKey)), ...subtasksFlat],
          };
        });
        const backlogTopLevel = data.items.filter(i => !i.parentId);
        const backlogSubtasks = backlogTopLevel.flatMap(i => i.subtasks.map(sub => apiItemToBL(sub, i.id, pKey)));
        const backlog: BLItem[] = [...backlogTopLevel.map(i => apiItemToBL(i, undefined, pKey)), ...backlogSubtasks];
        setBlSprints(sprints);
        setBlBacklog(backlog);
        setMilestones(data.milestones ?? []);
        setGoals(data.goals ?? []);
        const allItems = [...data.sprints.flatMap(s => s.items), ...data.items];
        setProjectMembers(data.members.map((m) => {
          const mine = allItems.filter(item =>
            item.assignees?.some((a: { user: { id: string } }) => a.user.id === m.user.id)
          );
          const taskCount = mine.length;
          const inReviewCount = mine.filter(item => item.status === "in-review").length;
          const doneCount = mine.filter(item => item.status === "done").length;
          return {
            id: m.user.id,
            initials: userInitials(m.user.name),
            name: m.user.name,
            email: m.user.email,
            color: userColor(m.user.id),
            role: m.role,
            taskCount,
            inReviewCount,
            doneCount,
          };
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.push("/login");
        } else if (status === 404 || status === 403) {
          router.push("/projects/overview");
        } else {
          console.error("Failed to load project data:", err);
        }
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loaded]);

  const handleTaskCreated = useCallback(({ summary, workType, status, sprint, points, priority, assigneeId }: {
    summary: string; workType: string; status: string; sprint: string; points?: number; priority?: string; assigneeId?: string;
  }) => {
    const blType: BLType = workType === "Bug" ? "bug" : workType === "Story" ? "story" : "task";
    const blStatus: BLStatus = (API_STATUS_TO_BL[status] ?? "todo") as BLStatus;
    const tempId = `NB-${nextTaskId.current++}`;
    const item: BLItem = { id: tempId, displayId: "...", title: summary, type: blType, status: blStatus, pts: points };
    const sprints = blSprintsRef.current;
    const activeSprint = sprints.slice().reverse().find(s => s.active && !s.id.startsWith("temp-"));
    const namedSprint  = sprint && sprint !== "Backlog" && !sprint.includes("active")
      ? sprints.find(s => s.name === sprint && !s.id.startsWith("temp-"))
      : null;
    const targetSprint = sprint.includes("active") ? activeSprint : (namedSprint ?? null);

    const toDisplayId = (created: import("@/lib/api").ApiItem) =>
      projectKey && created.number > 0 ? `${projectKey}-${created.number}` : created.id.slice(-6);

    if (targetSprint) {
      setBlSprints(p => p.map(s => s.id === targetSprint.id ? { ...s, items: [...s.items, item] } : s));
      setTab(targetSprint.active ? "board" : "backlog");
      itemsApi.create(id, { title: summary, type: blType, status, sprintId: targetSprint.id, points, priority })
        .then(async created => {
          if (assigneeId) {
            try { await itemsApi.setAssignee(id, created.id, assigneeId); } catch (e) { console.error("setAssignee failed", e); }
          }
          const full = apiItemToBL(created, undefined, projectKey);
          if (assigneeId) {
            const o = projectMembers.find(m => m.id === assigneeId);
            if (o) { full.assignees = [{ id: o.id, name: o.name, initials: o.initials, color: o.color }]; full.assigneeName = o.name; }
          }
          setBlSprints(p => p.map(s => s.id === targetSprint.id
            ? { ...s, items: s.items.map(i => i.id === tempId ? full : i) }
            : s));
          pushToast(`"${summary}" added to ${targetSprint.active ? "sprint" : targetSprint.name}`);
        }).catch(e => {
          console.error("API error", e);
          setBlSprints(p => p.map(s => s.id === targetSprint.id ? { ...s, items: s.items.filter(i => i.id !== tempId) } : s));
          pushToast("Failed to create item", "error");
        });
    } else {
      setBlBacklog(p => [...p, item]);
      setTab("backlog");
      itemsApi.create(id, { title: summary, type: blType, status, points, priority })
        .then(async created => {
          if (assigneeId) {
            try { await itemsApi.setAssignee(id, created.id, assigneeId); } catch (e) { console.error("setAssignee failed", e); }
          }
          const full = apiItemToBL(created, undefined, projectKey);
          if (assigneeId) {
            const o = projectMembers.find(m => m.id === assigneeId);
            if (o) { full.assignees = [{ id: o.id, name: o.name, initials: o.initials, color: o.color }]; full.assigneeName = o.name; }
          }
          setBlBacklog(p => p.map(i => i.id === tempId ? full : i));
          pushToast(`"${summary}" added to backlog`);
        }).catch(e => {
          console.error("API error", e);
          setBlBacklog(p => p.filter(i => i.id !== tempId));
          pushToast("Failed to create item", "error");
        });
    }
  }, [id, projectKey, setTab]);

  const handleSprintStatusChange = useCallback((itemId: string, status: BLStatus) => {
    const prevStatus = blSprintsRef.current.flatMap(s => s.items).find(i => i.id === itemId)?.status;
    setBlSprints(p => p.map(sp =>
      !sp.active ? sp : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status } : i) }
    ));
    itemsApi.update(id, itemId, { status: BL_STATUS_TO_API[status] }).catch(e => {
      console.error("API error", e);
      if (prevStatus !== undefined) {
        setBlSprints(p => p.map(sp =>
          !sp.active ? sp : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status: prevStatus } : i) }
        ));
      }
    });
  }, [id]);

  const handleSubtaskCreated = useCallback((sprintId: string, subtask: BLItem) => {
    if (sprintId) {
      setBlSprints(p => p.map(sp =>
        sp.id === sprintId ? { ...sp, items: [...sp.items, subtask] } : sp
      ));
    } else {
      setBlBacklog(p => [...p, subtask]);
    }
  }, []);

  const handleItemChange = useCallback((itemId: string, changes: Partial<BLItem>) => {
    setBlSprints(p => p.map(sp => ({ ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, ...changes } : i) })));
    setBlBacklog(p => p.map(i => i.id === itemId ? { ...i, ...changes } : i));
  }, []);

  const handleOpenBLItem = useCallback((item: BLItem) => {
    if (item.type === "story") {
      onOpenStory(item, "var(--blue)");
      return;
    }
    handleOpenCard({ id: item.id, displayId: item.displayId, title: item.title, prio: item.priority ?? "tp-low", status: COL_STATUS[item.status] ?? "To Do", pts: item.pts, dueDate: item.dueDate, description: item.description, assignees: item.assignees, reporter: item.reporter, blSubtasks: item.blSubtasks, sprintId: item.sprintId, parentStoryId: item.parentStoryId });
  }, [handleOpenCard, onOpenStory]);

  // ── Delete project modal ───────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isOwner = (project?.ownerId && currentUser?.id === project.ownerId)
    || projectMembers.find(m => m.id === currentUser?.id)?.role === "owner";

  async function handleDeleteProject() {
    if (!project) return;
    const projectName = project.name;
    setDeleteLoading(true);
    // Fire API + animation in parallel; faster perceived response
    const animPromise = new Promise(r => setTimeout(r, 400));
    try {
      await Promise.all([deleteProjectStore(id), animPromise]);
      router.push("/projects/overview");
      pushToast(`Archived "${projectName}"`, "success");
    } catch (e: any) {
      pushToast(e?.message ?? "Failed to delete project", "error");
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  }

  // ── Complete sprint modal (shared by Board + Backlog) ──────────────────────
  const [completeModal, setCompleteModal] = useState<{
    sprintId: string; sprintName: string;
    destinations: Record<string, "next-sprint" | "backlog" | "new-sprint">;
  } | null>(null);
  const [completeGroupsOpen, setCompleteGroupsOpen] = useState<Record<string, boolean>>({ stories: false, tasks: false });

  const openCompleteSprint = useCallback((sprintId: string) => {
    const sprints = blSprintsRef.current;
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    const incomplete = sprint.items.filter(i => i.status !== "done");
    const nextSp     = sprints.find(s => !s.active && s.id !== sprintId);
    const defaultDest: "next-sprint" | "backlog" | "new-sprint" = nextSp ? "next-sprint" : "backlog";
    const destinations: Record<string, "next-sprint" | "backlog" | "new-sprint"> = {};
    incomplete.forEach(i => { destinations[i.id] = defaultDest; });
    setCompleteModal({ sprintId, sprintName: sprint.name, destinations });
  }, []);

  async function doCompleteSprint() {
    if (!completeModal) return;
    const { sprintId, destinations } = completeModal;
    const sprint = blSprints.find(s => s.id === sprintId);
    if (!sprint) return;
    const doneItems        = sprint.items.filter(i => i.status === "done");
    const incomplete       = sprint.items.filter(i => i.status !== "done");
    const nextSp           = blSprints.find(s => !s.active && s.id !== sprintId);
    const toBacklogItems   = incomplete.filter(i => destinations[i.id] === "backlog" || (destinations[i.id] === "next-sprint" && !nextSp));
    const toNextItems      = nextSp ? incomplete.filter(i => destinations[i.id] === "next-sprint") : [];
    const toNewSprintItems = incomplete.filter(i => destinations[i.id] === "new-sprint");

    let createdSprint: { id: string; name: string } | null = null;
    if (toNewSprintItems.length > 0) {
      const existingNames = blSprints.map(s => s.name);
      let n = blSprints.length + 1;
      let name = `Sprint ${n}`;
      while (existingNames.includes(name)) { n++; name = `Sprint ${n}`; }
      try {
        const created = await sprintsApi.create(id, { name });
        createdSprint = { id: created.id, name: created.name };
      } catch (e) {
        console.error("Failed to create new sprint", e);
        return;
      }
    }

    setBlSprints(p => {
      let next = p.filter(s => s.id !== sprintId);
      next = next.map(s => {
        if (nextSp && s.id === nextSp.id) return { ...s, items: [...s.items, ...toNextItems.map(i => ({ ...i, sprintId: nextSp.id })) ] };
        return s;
      });
      if (createdSprint) {
        next = [...next, {
          id: createdSprint.id, name: createdSprint.name, active: false,
          items: toNewSprintItems.map(i => ({ ...i, sprintId: createdSprint!.id })),
        }];
      }
      return next;
    });
    setBlBacklog(p => [
      ...p,
      ...toBacklogItems.map(i => ({ ...i, sprintId: undefined })),
      ...doneItems.map(i => ({ ...i, sprintId: undefined })),
    ]);
    setCompleteModal(null);

    const apiCalls: Promise<unknown>[] = [
      ...doneItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: null })
          .catch(e => console.error(`Failed to detach done item ${item.id}`, e))
      ),
      ...toNextItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: nextSp!.id })
          .catch(e => console.error(`Failed to move item ${item.id} to next sprint`, e))
      ),
      ...toBacklogItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: null })
          .catch(e => console.error(`Failed to move item ${item.id} to backlog`, e))
      ),
      ...(createdSprint ? toNewSprintItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: createdSprint!.id })
          .catch(e => console.error(`Failed to move item ${item.id} to new sprint`, e))
      ) : []),
    ];
    Promise.all(apiCalls).then(() =>
      sprintsApi.complete(id, sprintId)
        .catch(e => console.error("Failed to complete sprint", e))
    );
  }

  const totalItems = blSprints.reduce((a, s) => a + s.items.length, 0) + blBacklog.length;

  const TAB_LABELS: Record<TabKey, { label: string; count?: string }> = {
    overview:  { label: "Overview"  },
    board:     { label: "Board",    count: activeSprint ? String(activeSprint.items.length) : undefined },
    backlog:   { label: "Backlog",  count: String(totalItems) },
    timeline:  { label: "Timeline" },
    team:      { label: "Team"     },
  };

  return (
    <div className="proj-shell" data-theme="light">
      <OGSidebar />
      <ProjectsListSidebar />

      <div className="proj-workspace">
        <ProjectTopbar onOpenPanel={() => setCreateOpen(true)} project={project} activeSprint={activeSprint} />

        <div className="proj-tabs-bar">
          {TABS.map((t) => {
            const { label, count } = TAB_LABELS[t];
            return (
              <button key={t} className={"proj-tab" + (activeTab === t ? " active" : "")} onClick={() => setTab(t)}>
                {label}
                {count && <span className="proj-tab-count">{count}</span>}
              </button>
            );
          })}
          {isOwner && (
            <button className="proj-tab-delete-btn" onClick={() => setDeleteModalOpen(true)} title="Delete project">
              <ITrash style={{ width: 14, height: 14 }} />
              Delete project
            </button>
          )}
        </div>

        <div className="proj-tab-content">
          {/* Always keep mounted tabs alive — only hide with CSS so local state is preserved */}
          <div style={{ display: activeTab === "overview" ? "contents" : "none" }}>
            <OverviewTab onOpenPanel={onOpenPanel} onOpenCreate={onOpenCreate} onSwitchToBoard={() => setTab("board")} project={project} activeSprint={activeSprint} projectId={id} updateProjectLocal={updateProjectLocal} allSprints={blSprints} backlog={blBacklog} milestones={milestones} setMilestones={setMilestones} />
          </div>
          {mountedTabs.has("board") && (
            <div style={{ display: activeTab === "board" ? "contents" : "none" }}>
              {dataLoading
                ? <div className="proj-data-loading">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 10 }} />)}</div>
                : <BoardTab onOpenPanel={onOpenPanel} onOpenCreate={onOpenCreate} onOpenCard={handleOpenCard} onOpenStory={onOpenStory} activeSprint={activeSprint} allSprints={blSprints} onSprintStatusChange={handleSprintStatusChange} onCompleteSprint={openCompleteSprint} onSubtaskCreated={handleSubtaskCreated} onItemChange={handleItemChange} projectName={project?.name} projectId={id} projectKey={projectKey} owners={projectMembers} />
              }
            </div>
          )}
          {mountedTabs.has("backlog") && (
            <div style={{ display: activeTab === "backlog" ? "contents" : "none" }}>
              {dataLoading
                ? <div className="proj-data-loading">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />)}</div>
                : <BacklogTab onOpenPanel={onOpenPanel} onOpenItem={handleOpenBLItem} sprints={blSprints} setSprints={setBlSprints} backlog={blBacklog} setBacklog={setBlBacklog} onCompleteSprint={openCompleteSprint} projectId={id} projectKey={projectKey} owners={projectMembers} currentUserId={currentUser?.id} />
              }
            </div>
          )}
          {mountedTabs.has("timeline") && (
            <div style={{ display: activeTab === "timeline" ? "contents" : "none" }}>
              <TimelineTab projectName={project?.name} allSprints={blSprints} goals={goals} setGoals={setGoals} projectId={id} />
            </div>
          )}
          {mountedTabs.has("team") && (
            <div style={{ display: activeTab === "team" ? "contents" : "none" }}>
              <TeamTab
                owners={projectMembers}
                projectId={id}
                myRole={
                  projectMembers.find(m => m.id === currentUser?.id)?.role
                    ?? (project?.ownerId && project.ownerId === currentUser?.id ? "owner" : "member")
                }
                currentUserId={currentUser?.id}
                onMembersUpdated={setProjectMembers}
              />
            </div>
          )}
        </div>
      </div>

      <CreateStoryPanel open={createOpen} onClose={() => setCreateOpen(false)} projectName={project?.name} onCreated={handleTaskCreated} allSprints={blSprints} owners={projectMembers} />

      {openSprintStory && (() => {
        const story = openSprintStory.story;
        const childItems = [
          ...blSprints.flatMap(s => s.items.filter(i => i.parentStoryId === story.id)),
          ...blBacklog.filter(i => i.parentStoryId === story.id),
        ];
        const parentSprint = blSprints.find(s => s.id === story.sprintId);
        return (
          <SprintStoryPanel
            story={story}
            childItems={childItems}
            sprintName={parentSprint?.name ?? "Backlog"}
            allSprints={blSprints}
            color={openSprintStory.color}
            onClose={onCloseStory}
            onClone={() => handleCloneItem({
              title: story.title,
              type: story.type,
              priority: story.priority,
              status: story.status,
              pts: story.pts,
              sprintId: story.sprintId,
            })}
            onDelete={async () => {
              await handleDeleteItem(story.id);
              onCloseStory();
            }}
            availableStories={[
              ...blSprints.flatMap(s => s.items.filter(i => i.type === "story")),
              ...blBacklog.filter(i => i.type === "story"),
            ]}
            onStatusChange={handleSprintStatusChange}
            onSubtaskCreated={sub => handleSubtaskCreated(parentSprint?.id ?? "", sub)}
            onItemChange={handleItemChange}
            onOpenSubtask={item => handleOpenBLItem(item)}
            projectName={project?.name}
            projectId={id}
            projectKey={projectKey}
            owners={projectMembers}
          />
        );
      })()}

      <TaskPanel
        key={openCardData?.id ?? "static"}
        open={panelOpen}
        onClose={handleClosePanel}
        onClone={openCardData ? () => {
          const items = [...blSprints.flatMap(s => s.items), ...blBacklog];
          const src = items.find(i => i.id === openCardData.id);
          if (!src) return;
          handleCloneItem({
            title: src.title,
            type: src.type,
            priority: src.priority,
            status: src.status,
            pts: src.pts,
            parentStoryId: src.parentStoryId,
            sprintId: src.sprintId,
          });
        } : undefined}
        onDelete={openCardData ? async () => {
          await handleDeleteItem(openCardData.id);
          handleClosePanel();
        } : undefined}
        projectName={project?.name} card={openCardData} projectId={id} allSprints={blSprints} owners={projectMembers} onItemChange={handleItemChange}
      />

      {/* Delete project modal */}
      {deleteModalOpen && (
        <div className={"sb-modal-backdrop" + (deleteLoading ? " del-backdrop--out" : "")} onClick={() => !deleteLoading && setDeleteModalOpen(false)}>
          <div className={"sb-modal del-proj-modal" + (deleteLoading ? " del-proj-modal--exploding" : "")} onClick={e => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span className="sb-modal-title">Delete project</span>
              <button className="sb-modal-close" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
                <IClose style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="sb-modal-body">
              <div className="del-proj-warning">
                Archive <strong>{project?.name}</strong>. Sprints, items, and data are kept and can be restored from <a href="/archived" style={{ textDecoration: "underline" }}>Archived</a>.
              </div>
              <SlideToDelete onConfirm={handleDeleteProject} loading={deleteLoading} />
            </div>
            <div className="sb-modal-foot">
              <button className="sb-modal-cancel" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Sprint modal — shared by Board + Backlog */}
      {completeModal && (() => {
        const sprint     = blSprints.find(s => s.id === completeModal.sprintId);
        const incomplete = sprint ? sprint.items.filter(i => i.status !== "done") : [];
        const doneCount  = sprint ? sprint.items.filter(i => i.status === "done").length : 0;
        const total      = sprint ? sprint.items.length : 0;
        const nextSp     = blSprints.find(s => !s.active && s.id !== completeModal.sprintId);
        const stories    = incomplete.filter(i => i.type === "story");
        const tasks      = incomplete.filter(i => i.type !== "story" && !i.parentStoryId);
        return (
          <div className="sb-modal-backdrop" onClick={() => setCompleteModal(null)}>
            <div className="sb-modal sb-complete-modal" onClick={e => e.stopPropagation()}>
              <div className="sb-modal-head">
                <span className="sb-modal-title">Complete {completeModal.sprintName}</span>
                <button className="sb-modal-close" onClick={() => setCompleteModal(null)}><IClose style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="sb-modal-body">
                <div className="sb-complete-summary">
                  <span className="sb-complete-done">{doneCount} of {total} items complete.</span>
                  {incomplete.length === 0
                    ? <span style={{ color: "var(--green)" }}> All done — great sprint!</span>
                    : <span style={{ color: "var(--proj-text-2)" }}> {incomplete.length} incomplete item{incomplete.length !== 1 ? "s" : ""} — where should they go?</span>
                  }
                </div>
                {incomplete.length > 0 && (
                  <>
                    {(() => {
                      const allDests = new Set(incomplete.map(it => completeModal.destinations[it.id] ?? (nextSp ? "next-sprint" : "backlog")));
                      const uniform = allDests.size === 1 ? Array.from(allDests)[0] : "";
                      return (
                        <div className="sb-complete-bulk">
                          <span className="sb-complete-bulk-label">Move open items to</span>
                          <select
                            className="sb-complete-dest sb-complete-bulk-select"
                            value={uniform}
                            onChange={e => {
                              const v = e.target.value as "next-sprint" | "backlog" | "new-sprint";
                              setCompleteModal(p => {
                                if (!p) return p;
                                const dests: Record<string, "next-sprint" | "backlog" | "new-sprint"> = {};
                                for (const it of incomplete) dests[it.id] = v;
                                return { ...p, destinations: dests };
                              });
                            }}
                          >
                            {!uniform && <option value="" disabled>Mixed — choose destination…</option>}
                            {nextSp && <option value="next-sprint">{nextSp.name}</option>}
                            <option value="new-sprint">New sprint</option>
                            <option value="backlog">Backlog</option>
                          </select>
                        </div>
                      );
                    })()}
                    {(() => {
                      const groups: { key: string; label: string; items: typeof incomplete; icon: (i: typeof incomplete[number]) => React.ReactNode }[] = [
                        { key: "stories", label: "Stories", items: stories, icon: () => <IFlag style={{ width: 12, height: 12, color: "#9353D3", flexShrink: 0 }} /> },
                        { key: "tasks", label: "Tasks & Bugs", items: tasks, icon: (i) => <BLTypeIcon type={i.type} /> },
                      ];
                      return groups.filter(g => g.items.length > 0).map(g => {
                        const isOpen = completeGroupsOpen[g.key] !== false;
                        const breakdown = { next: 0, new: 0, back: 0 };
                        g.items.forEach(it => {
                          const d = completeModal.destinations[it.id] ?? (nextSp ? "next-sprint" : "backlog");
                          if (d === "next-sprint") breakdown.next++;
                          else if (d === "new-sprint") breakdown.new++;
                          else breakdown.back++;
                        });
                        return (
                          <div key={g.key} className="sb-complete-group">
                            <button type="button" className="sb-complete-group-head"
                              onClick={() => setCompleteGroupsOpen(p => ({ ...p, [g.key]: !isOpen }))}>
                              {isOpen ? <IChevDown style={{ width: 12, height: 12 }} /> : <IChevR style={{ width: 12, height: 12 }} />}
                              <span className="sb-complete-group-label">{g.label}</span>
                              <span className="sb-complete-group-count">{g.items.length}</span>
                              <span className="sb-complete-group-spacer" />
                              {breakdown.next > 0 && <span className="sb-complete-tag sb-complete-tag-next" title={`${nextSp?.name} sprint`}>→ {breakdown.next} {nextSp?.name}</span>}
                              {breakdown.new > 0 && <span className="sb-complete-tag sb-complete-tag-new" title="New sprint">→ {breakdown.new} new</span>}
                              {breakdown.back > 0 && <span className="sb-complete-tag sb-complete-tag-back" title="Backlog">→ {breakdown.back} backlog</span>}
                            </button>
                            {isOpen && (
                              <div className="sb-complete-group-body">
                                {g.items.map(item => (
                                  <div key={item.id} className="sb-complete-row">
                                    {g.icon(item)}
                                    <span className="sb-complete-id">{item.displayId}</span>
                                    <span className="sb-complete-title">{item.title}</span>
                                    <select className="sb-complete-dest"
                                      value={completeModal.destinations[item.id] ?? (nextSp ? "next-sprint" : "backlog")}
                                      onChange={e => setCompleteModal(p => p ? { ...p, destinations: { ...p.destinations, [item.id]: e.target.value as "next-sprint" | "backlog" | "new-sprint" } } : null)}
                                    >
                                      {nextSp && <option value="next-sprint">{nextSp.name}</option>}
                                      <option value="new-sprint">New sprint</option>
                                      <option value="backlog">Backlog</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </>
                )}
              </div>
              <div className="sb-modal-foot">
                <button className="sb-modal-cancel" onClick={() => setCompleteModal(null)}>Cancel</button>
                <button className="sb-modal-confirm sb-complete-confirm" onClick={doCompleteSprint}>Complete sprint</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
