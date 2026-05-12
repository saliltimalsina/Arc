"use client";

import { useState, useRef, use, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import "../projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar from "@/components/ProjectsListSidebar";
import RichEditor from "@/components/RichEditor";
import { useProjectStore, type Project } from "@/lib/projectStore";
import { projectsApi, itemsApi, sprintsApi, commentsApi, goalsApi, getToken, type ApiItem, type ApiGoal } from "@/lib/api";
import { pushToast } from "@/hooks/useToast";
import EmptyState from "@/components/EmptyState";
import DatePicker from "@/components/DatePicker";
import { Table, TableResizableContainer } from "@heroui/react";

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
const ILayoutB  = mkIcon(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></>);
const IList     = mkIcon(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>);
const IClock    = mkIcon(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>);
const IFlag     = mkIcon(<><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>);
const IDoc      = mkIcon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>);
const IBarChart = mkIcon(<><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>);
const IDollar   = mkIcon(<><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>);
const IAlert    = mkIcon(<><path d="m12 4 9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></>);
const IClose    = mkIcon(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);

const IMoreH    = mkIcon(<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>);
const IUsers    = mkIcon(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);
const IPeople   = mkIcon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>);
const IBoxes    = mkIcon(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
const ITimeline = mkIcon(<><path d="M4 6h10"/><circle cx="18" cy="6" r="2"/><path d="M4 12h6"/><circle cx="14" cy="12" r="2"/><path d="M4 18h12"/><circle cx="20" cy="18" r="2"/></>);
const IPencil   = mkIcon(<><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></>);
const ITrash    = mkIcon(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>);

// ─── Create Story Modal ───────────────────────────────────────────────────────

const PRIORITY_OPTS  = ["Highest", "High", "Medium", "Low", "Lowest"];
const ESTIMATE_OPTS  = ["XS", "S", "M", "L", "XL", "XXL"];
const STATUS_OPTS   = ["To Do", "In Progress", "In Review", "Done"];
const WORK_TYPE_OPTS = ["Story", "Task", "Bug", "Epic", "Sub-task"];

function CreateStoryPanel({ open, onClose, projectName, onCreated, allSprints, owners }: {
  open: boolean; onClose: () => void; projectName?: string;
  onCreated?: (item: { summary: string; workType: string; status: string; sprint: string }) => void;
  allSprints?: { id: string; name: string; active: boolean }[];
  owners?: Owner[];
}) {
  const [summary, setSummary]       = useState("");
  const [priority, setPriority]     = useState("Medium");
  const [status, setStatus]         = useState("To Do");
  const [workType, setWorkType]     = useState("Story");
  const [assignee, setAssignee]     = useState("Automatic");
  const [sprint, setSprint]         = useState("");
  const [estimate, setEstimate]     = useState("");
  const [description, setDesc]      = useState("");
  const [linked, setLinked]         = useState("");
  const [createAnother, setAnother] = useState(false);
  const [summaryErr, setSummaryErr] = useState(false);

  function handleCreate() {
    if (!summary.trim()) { setSummaryErr(true); return; }
    onCreated?.({ summary: summary.trim(), workType, status, sprint });
    if (createAnother) {
      setSummary(""); setDesc(""); setLinked(""); setSummaryErr(false);
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

            <div className="cs-field">
              <label className="cs-label">Space <span className="cs-asterisk">*</span></label>
              <div className="cs-select-fake">
                <span>occs (OCCS)</span>
                <IChevDown style={{ width: 13, height: 13 }} />
              </div>
            </div>

            <div className="cs-field-row">
              <div className="cs-field">
                <label className="cs-label">Work type <span className="cs-asterisk">*</span></label>
                <select className="cs-select" value={workType} onChange={e => setWorkType(e.target.value)}>
                  {WORK_TYPE_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
                <a className="cs-learn-link" href="#">Learn about work types</a>
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
              <label className="cs-label">Parent</label>
              <div className="cs-select-fake cs-muted">
                <span>Select parent</span>
                <IChevDown style={{ width: 13, height: 13 }} />
              </div>
              <span className="cs-hint">Work type hierarchy determines selectable items.</span>
            </div>

            <div className="cs-field">
              <label className="cs-label">Components</label>
              <div className="cs-select-fake cs-muted">
                <span>Select Component</span>
                <IChevDown style={{ width: 13, height: 13 }} />
              </div>
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

            <div className="cs-field">
              <label className="cs-label">Linked work items</label>
              <input
                className="cs-input"
                placeholder="Type, search or paste URL"
                value={linked}
                onChange={e => setLinked(e.target.value)}
              />
              <span className="cs-hint">Added to idea</span>
            </div>

            <div className="cs-field">
              <label className="cs-label">Attachment</label>
              <div className="cs-drop-zone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Drop files to attach or <button className="cs-browse-btn">Browse</button></span>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="cs-panel-side">

            <div className="cs-side-row">
              <div className="cs-side-label">Reporter <span className="cs-asterisk">*</span></div>
              <div className="cs-reporter-row">
                <div className="cs-av">ST</div>
                <span>Salil Timalsina</span>
              </div>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Priority</div>
              <select className="cs-select" value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITY_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
              <a className="cs-learn-link" href="#">Learn about priority levels</a>
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
                {(allSprints ?? []).map(s => (
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
                  <button key={e} className={"cs-est-btn" + (estimate === e ? " active" : "")} onClick={() => setEstimate(estimate === e ? "" : e)}>{e}</button>
                ))}
              </div>
              <span className="cs-hint">T-Shirt Sizes</span>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Labels</div>
              <div className="cs-select-fake cs-muted">
                <span>Select label</span>
                <IChevDown style={{ width: 13, height: 13 }} />
              </div>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Fix versions</div>
              <div className="cs-select-fake cs-muted">
                <span>Select version</span>
                <IChevDown style={{ width: 13, height: 13 }} />
              </div>
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
        <button className="proj-icon-btn" title="Notifications">
          <IBell />
          <span className="ping" />
        </button>
        <button className="proj-btn-primary" onClick={onOpenPanel}>
          <IPlus />
          Create
        </button>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ onOpenPanel, onOpenCreate, onSwitchToBoard, project, activeSprint, projectId, updateProject, allSprints, backlog, milestones, setMilestones }: {
  onOpenPanel: () => void; onOpenCreate: () => void; onSwitchToBoard: () => void;
  project: Project | undefined;
  activeSprint?: { name: string; endIso?: string };
  projectId: string;
  updateProject: (id: string, data: Partial<Project>) => void;
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

  // ── Derived health stats ──────────────────────────────────────────────────
  const allItems = [...allSprints.flatMap(s => s.items), ...backlog];
  const totalItems = allItems.length;
  const doneItems  = allItems.filter(i => i.status === "done").length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const activeSprintData = allSprints.find(s => s.active);
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
    updateProject(projectId, { name: trimmed });
    setEditingName(false);
    try {
      await projectsApi.update(projectId, { name: trimmed });
    } catch (err) {
      console.error("Failed to update project name:", err);
      updateProject(projectId, { name: project?.name ?? "" });
      pushToast("Failed to save name", "error");
    }
  }

  async function saveDesc() {
    const trimmed = descVal.trim();
    setEditingDesc(false);
    if (trimmed === (project?.description ?? "")) return;
    updateProject(projectId, { description: trimmed });
    try {
      await projectsApi.update(projectId, { description: trimmed });
    } catch (err) {
      console.error("Failed to update project description:", err);
      updateProject(projectId, { description: project?.description });
      pushToast("Failed to save description", "error");
    }
  }

  // ── Milestone handlers ────────────────────────────────────────────────────
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMsName, setNewMsName]             = useState("");
  const [newMsDate, setNewMsDate]             = useState("");
  const [editingMsId, setEditingMsId]         = useState<string | null>(null);
  const [editMsName, setEditMsName]           = useState("");
  const [editMsDate, setEditMsDate]           = useState("");

  async function addMilestone() {
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

  function startEditMs(m: import("@/lib/api").ApiMilestone) {
    setEditingMsId(m.id);
    setEditMsName(m.name);
    setEditMsDate(m.date.slice(0, 10));
  }

  async function saveEditMs() {
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

  async function deleteMilestone(msId: string) {
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
  const msPct = sorted.length > 0 ? Math.round((msCompleted / sorted.length) * 100) : 0;
  const timelineStart = sorted.length > 0 ? new Date(sorted[0].date).getTime() : Date.now();
  const timelineEnd   = sorted.length > 0 ? new Date(sorted[sorted.length - 1].date).getTime() : Date.now() + 1;
  const nowPct = Math.min(100, Math.max(0, ((now.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100));

  function msPctPos(dateStr: string) {
    if (sorted.length < 2) return 50;
    return Math.min(100, Math.max(0, ((new Date(dateStr).getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100));
  }

  function fmtMsDate(dateStr: string) {
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
            <div className="health-cell">
              <div className="health-label">Team mood</div>
              <div className="health-value">Good</div>
              <div className="health-bar"><div className="hb-low" /></div>
            </div>
          </div>
        </div>

        {/* Context banner */}
        <div className="ctx-banner">
          <IAlert />
          <div className="ctx-banner-text"><strong>Sprint closing.</strong> Wrap-up phase — 2 days left. Review queue is the priority right now.</div>
          <button className="ctx-banner-cta" onClick={onSwitchToBoard}>Open board →</button>
        </div>

        {/* Needs Attention + Work Snapshot */}
        <div className="sec-grid-2">
          <div className="ov-panel">
            <div className="ov-panel-head">
              <div className="ov-panel-title"><span className="ov-kicker">01</span>Needs attention</div>
              <span className="ov-panel-link">Snooze all <IChevR /></span>
            </div>
            <div className="action-list">
              {[
                { color: "ai-red",    Icon: IAlert,  title: "4 tasks overdue",           sub: <>Oldest: <em>Wire transfer error states</em> — 3 days late</> },
                { color: "ai-orange", Icon: ICheck,  title: "2 reviews waiting on you",  sub: "Round-up calc PR · onboarding copy doc" },
                { color: "ai-yellow", Icon: IClock,  title: "Sprint 14 ends Wednesday",  sub: "3 stories not yet started · plan move or drop" },
                { color: "ai-blue",   Icon: IDollar, title: "Budget at 74% of cap",      sub: "$148k of $200k · pacing 6% ahead of plan" },
              ].map(({ color, Icon, title, sub }) => (
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
              <span className="ov-panel-link">Sprint view <IChevR /></span>
            </div>
            <div className="snap-stats">
              {[
                { lbl: "Open tasks",  val: "32", delta: "+3 this week"  },
                { lbl: "Closed",      val: "89", delta: "+11 vs last"   },
                { lbl: "In review",   val: "7",  delta: "2 need action" },
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

        {/* Team Pulse + Up Next + Activity */}
        <div className="sec-grid-3">
          <div className="ov-panel">
            <div className="ov-panel-head">
              <div className="ov-panel-title"><span className="ov-kicker">03</span>Team pulse</div>
            </div>
            <div className="pulse-body">
              {[
                { key: "Velocity",      val: "92%",    dot: "pd-good" },
                { key: "Avg cycle time",val: "2.4d",   dot: "pd-good" },
                { key: "Blockers",      val: "2",      dot: "pd-bad"  },
                { key: "Review queue",  val: "7 open", dot: "pd-mid"  },
                { key: "Bugs in sprint",val: "3",      dot: "pd-mid"  },
                { key: "Team mood",     val: "Good",   dot: "pd-good" },
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
              {[
                { prio: "up-high", title: "Auth refactor — refresh token logic",         meta: ["NB-218", "Due today"]          },
                { prio: "up-med",  title: "Review Mira's round-up calc PR",              meta: ["NB-216", "Due today"]          },
                { prio: "up-med",  title: "Session persistence — pair with Rakesh",      meta: ["NB-220", "Tomorrow"]           },
                { prio: "up-low",  title: "Onboarding copy final review",                meta: ["NB-209", "May 13"]             },
                { prio: "up-low",  title: "Wire transfer error state design sign-off",   meta: ["NB-195", "May 14"]             },
              ].map(({ prio, title, meta }) => (
                <div key={title} className="upnext-row" onClick={onOpenPanel}>
                  <div className={"upnext-prio " + prio} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="upnext-title">{title}</div>
                    <div className="upnext-meta">{meta.map((m, i) => <span key={i}>{m}</span>)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ov-panel">
            <div className="ov-panel-head">
              <div className="ov-panel-title"><span className="ov-kicker">05</span>Recent activity</div>
            </div>
            <div className="ov-feed">
              {[
                { av: "pav-2", initials: "RK", text: <><strong>Rakesh</strong> completed <em>Auth API setup</em><span className="ov-feed-burst">+50 XP</span></>, time: "12m" },
                { av: "pav-3", initials: "MP", text: <><strong>Mira</strong> opened a PR on <em>Round-up calc</em></>, time: "38m" },
                { av: "pav-4", initials: "JL", text: <><strong>Jaya</strong> uploaded <em>Onboarding final.fig</em></>, time: "1h" },
                { av: "pav-5", initials: "DT", text: <><strong>Dev</strong> kudosed Mira — &ldquo;caught the reversed-txn edge case&rdquo;</>, time: "2h" },
                { av: "pav-6", initials: "LP", text: <><strong>Lakshmi</strong> closed <em>Wire transfer error states</em></>, time: "4h" },
              ].map(({ av, initials, text, time }) => (
                <div key={initials + time} className="ov-feed-row">
                  <div className={"pav " + av} style={{ fontSize: 9.5 }}>{initials}</div>
                  <div className="ov-feed-text">{text}</div>
                  <div className="ov-feed-time">{time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

// ─── Sprint Story Detail Panel ────────────────────────────────────────────────

function deriveProjectKey(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 4).toUpperCase();
  return words.slice(0, 4).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function shortItemId(itemId: string, projectKey: string): string {
  const tail = itemId.slice(-6);
  const num  = (parseInt(tail, 36) % 9999) + 1;
  return `${projectKey}-${num}`;
}

type Owner = { id: string; initials: string; name: string; color: string };

function SprintStoryPanel({
  story, children, sprintName, allSprints, color, onClose, onStatusChange, onSubtaskCreated, projectName, projectId, owners,
}: {
  story: BLItem | null;
  children: BLItem[];
  sprintName: string;
  allSprints: BLSprintData[];
  color: string;
  onClose: () => void;
  onStatusChange?: (itemId: string, status: BLStatus) => void;
  onSubtaskCreated?: (subtask: BLItem) => void;
  projectName?: string;
  projectId?: string;
  owners: Owner[];
}) {
  const [editing, setEditing]         = useState(false);
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState(() => story?.description ? `<p>${story.description}</p>` : "");
  const [openStatus, setOpenStatus]   = useState<string | null>(null);
  const [storyStatus, setStoryStatus] = useState<BLStatus>(story?.status ?? "todo");
  const [ownerName, setOwnerName]     = useState(story?.assigneeName ?? owners[0]?.name ?? "");
  const [sprint, setSprint]           = useState(sprintName);
  const [pts, setPts]                 = useState<number>(story ? ((story.pts ?? 0) + children.reduce((a, c) => a + (c.pts ?? 0), 0)) : 0);
  const BL_PRIO_TO_LABEL: Record<string, string> = { "tp-high": "High", "tp-med": "Medium", "tp-low": "Low" };
  const [priority, setPriority]       = useState(BL_PRIO_TO_LABEL[story?.priority ?? ""] ?? "Medium");
  const [openField, setOpenField]     = useState<"status"|"priority"|"owner"|"sprint"|"pts"|null>(null);
  const [openChild, setOpenChild]     = useState<BLItem | null>(null);
  const [dueDate, setDueDate]         = useState(story?.dueDate ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localChildren, setLocalChildren] = useState<BLItem[]>(children);
  const [rowDensity, setRowDensity] = useState<"compact"|"normal"|"relaxed">("normal");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  async function saveChildTitle(child: BLItem, newTitle: string) {
    const trimmed = newTitle.trim();
    setEditingChildId(null);
    if (!trimmed || trimmed === child.title) return;
    setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, title: trimmed } : c));
    if (projectId) {
      try { await itemsApi.update(projectId, child.id, { title: trimmed }); }
      catch(err) {
        console.error("update subtask title failed", err);
        setLocalChildren(prev => prev.map(c => c.id === child.id ? { ...c, title: child.title } : c));
      }
    }
  }

  if (!story) return null;

  const done  = children.filter(c => c.status === "done").length;
  const total = children.length;
  const prog  = total > 0 ? Math.round(done / total * 100) : 0;
  const owner = owners.find(o => o.name === ownerName) ?? owners[0] ?? { initials: "?", name: "", color: "#9A9FAB" };

  const STATUS_COLORS: Record<BLStatus, string> = {
    "todo":        "#9A9FAB",
    "in-progress": "#338EF7",
    "in-review":   "#F5A524",
    "done":        "#17C964",
  };
  const STATUS_LABELS: Record<BLStatus, string> = {
    "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done",
  };
  const TYPE_LABEL: Record<BLType, string> = { task: "Task", story: "Story", bug: "Bug" };
  const PRIO_COLORS: Record<string, string> = {
    "Highest": "#F31260", "High": "#F97316", "Medium": "#F5A524", "Low": "#338EF7", "Lowest": "#9A9FAB",
  };

  return (
    <>
      <div className="tp-backdrop open" style={{ animation: "fadeIn 0.2s ease" }} onClick={onClose} />
      <aside className="task-panel open panel-animate" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span style={{ color: "var(--proj-text-3)", fontSize: 12 }}>{sprintName}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span className="tp-crumb-id" style={{ color: color }}>
              {shortItemId(story.id, deriveProjectKey(projectName ?? "PRJ"))}
            </span>
          </div>
          <div className="tp-head-actions">
            <button className="proj-icon-btn" onClick={onClose} title="Close"><IClose /></button>
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
              <RichEditor content={desc} editable={descEditing} onChange={setDesc} minHeight={descEditing ? 120 : undefined} />
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
                        <Table.Column defaultWidth={84} minWidth={66} maxWidth={140} className="stc-col">
                          Priority<Table.ColumnResizer />
                        </Table.Column>
                        <Table.Column defaultWidth={44} minWidth={36} maxWidth={80} className="stc-col">
                          Pts<Table.ColumnResizer />
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
                          const pl = child.priority === "tp-high" ? "High" : child.priority === "tp-med" ? "Medium" : "Low";
                          const prioIcon = child.priority === "tp-high"
                            ? <svg width="11" height="11" viewBox="0 0 12 12" fill={pc}><path d="M6 1L10 7H2L6 1Z"/></svg>
                            : child.priority === "tp-med"
                            ? <svg width="11" height="7" viewBox="0 0 12 8"><rect y="0" width="12" height="2.5" rx="1" fill={pc}/><rect y="5" width="12" height="2.5" rx="1" fill={pc}/></svg>
                            : <svg width="11" height="11" viewBox="0 0 12 12" fill={pc}><path d="M6 11L2 5H10L6 11Z"/></svg>;
                          const displayId = shortItemId(child.id, deriveProjectKey(projectName ?? "PRJ"));
                          return (
                            <Table.Row key={child.id} id={child.id} className={isDone ? "stc-row-done" : ""}>
                              <Table.Cell className="stc-cell">
                                <div className="stc-work-cell">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                                    <rect x="8" y="8" width="13" height="13" rx="2"/><path d="M3 16V5a2 2 0 0 1 2-2h11"/>
                                  </svg>
                                  <button className="stc-id" onClick={() => setOpenChild(child)}>{displayId}</button>
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
                                      <span className={"stc-name"+(isDone?" stc-name-done":"")} onClick={() => setOpenChild(child)}>{child.title}</span>
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
                                <span className="stc-prio" style={{ color: pc }}>{prioIcon}{pl}</span>
                              </Table.Cell>
                              <Table.Cell className="stc-cell stc-cell-pts">
                                {child.pts ?? "—"}
                              </Table.Cell>
                              <Table.Cell className="stc-cell">
                                <div className="stc-assignee-cell">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ background: "var(--proj-surface-3)", borderRadius: "50%", padding: 2, flexShrink: 0 }}>
                                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                                  </svg>
                                  <span className="stc-assignee-name">Unassigned</span>
                                </div>
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
                          const tmp: BLItem = { id: `tmp-${Date.now()}`, title: newSubtaskTitle.trim(), type: "task", status: "todo", priority: "tp-med", parentStoryId: story.id };
                          setLocalChildren(prev => [...prev, tmp]);
                          setNewSubtaskTitle(""); setAddingSubtask(false);
                          try {
                            const created = await itemsApi.create(projectId, { title: tmp.title, type: "task", parentId: story.id });
                            const blItem = apiItemToBL(created, story.id);
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
                        const tmp: BLItem = { id: `tmp-${Date.now()}`, title: newSubtaskTitle.trim(), type: "task", status: "todo", priority: "tp-med", parentStoryId: story.id };
                        setLocalChildren(prev => [...prev, tmp]);
                        setNewSubtaskTitle(""); setAddingSubtask(false);
                        try {
                          const created = await itemsApi.create(projectId, { title: tmp.title, type: "task", parentId: story.id });
                          const blItem = apiItemToBL(created, story.id);
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

          </div>

          {/* Sidebar */}
          <div className="tp-side" onClick={() => setOpenField(null)}>

            {/* Status */}
            <div className="tp-side-row">
              <div className="tp-side-label">Status</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <button
                  className="sb-status-pill"
                  style={{ color: STATUS_COLORS[storyStatus], borderColor: STATUS_COLORS[storyStatus] + "55", background: STATUS_COLORS[storyStatus] + "14" }}
                  onClick={() => setOpenField(openField === "status" ? null : "status")}
                >
                  {STATUS_LABELS[storyStatus]} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "status" && (
                  <div className="sb-status-drop">
                    {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
                      <button key={s} className={"sb-status-opt" + (s === storyStatus ? " active" : "")}
                        style={{ color: STATUS_COLORS[s] }}
                        onClick={() => {
                          setStoryStatus(s); setOpenField(null);
                          if (story && projectId) {
                            itemsApi.update(projectId, story.id, { status: BL_STATUS_TO_API[s] })
                              .catch(e => console.error("Failed to save status", e));
                          }
                        }}>
                        {STATUS_LABELS[s]}
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
                <button
                  className="sb-status-pill"
                  style={{ color: PRIO_COLORS[priority], borderColor: PRIO_COLORS[priority] + "55", background: PRIO_COLORS[priority] + "14", display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => setOpenField(openField === "priority" ? null : "priority")}
                >
                  <IFlag style={{ width: 10, height: 10 }} />
                  {priority} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "priority" && (
                  <div className="sb-status-drop">
                    {PRIORITY_OPTS.map(p => (
                      <button key={p} className={"sb-status-opt" + (p === priority ? " active" : "")}
                        style={{ color: PRIO_COLORS[p] }}
                        onClick={() => {
                          setPriority(p); setOpenField(null);
                          if (story && projectId) {
                            itemsApi.update(projectId, story.id, { priority: PRIO_TO_API[p] })
                              .catch(e => console.error("Failed to save priority", e));
                          }
                        }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Owner */}
            <div className="tp-side-row">
              <div className="tp-side-label">Owner</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <button
                  className="sb-status-pill"
                  style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)", display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => setOpenField(openField === "owner" ? null : "owner")}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: owner.color, display: "grid", placeItems: "center", fontSize: 7, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{owner.initials}</div>
                  {owner.name} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "owner" && (
                  <div className="sb-status-drop" style={{ width: 180 }}>
                    {owners.map(o => (
                      <button key={o.name} className={"sb-status-opt" + (o.name === ownerName ? " active" : "")}
                        style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
                        onClick={() => {
                          setOwnerName(o.name); setOpenField(null);
                          if (projectId && story) {
                            itemsApi.setAssignee(projectId, story.id, o.id)
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
                <button
                  className="sb-status-pill"
                  style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)" }}
                  onClick={() => setOpenField(openField === "sprint" ? null : "sprint")}
                >
                  {sprint} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "sprint" && (
                  <div className="sb-status-drop" style={{ width: 160 }}>
                    {allSprints.map(s => (
                      <button key={s.id} className={"sb-status-opt" + (s.name === sprint ? " active" : "")}
                        style={{ color: "var(--proj-text)" }}
                        onClick={() => {
                          setSprint(s.name); setOpenField(null);
                          if (story && projectId) {
                            itemsApi.update(projectId, story.id, { sprintId: s.id })
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
                  ? <input
                      type="number" min={0} max={99}
                      className="sb-modal-input"
                      style={{ width: 60, height: 26, padding: "2px 8px", fontSize: 12 }}
                      value={pts}
                      onChange={e => setPts(Number(e.target.value))}
                      onBlur={() => {
                        setOpenField(null);
                        if (story && projectId) {
                          itemsApi.update(projectId, story.id, { points: pts })
                            .catch(e => console.error("Failed to save pts", e));
                        }
                      }}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setOpenField(null); }}
                      autoFocus
                    />
                  : <button
                      className="sb-status-pill"
                      style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)", minWidth: 44 }}
                      onClick={() => setOpenField("pts")}
                    >
                      {pts} pts <IChevDown style={{ width: 10, height: 10 }} />
                    </button>
                }
              </div>
            </div>

            {/* Due date */}
            <div className="tp-side-row">
              <div className="tp-side-label">Due date</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <input
                  type="date"
                  className="sb-modal-input"
                  style={{ height: 26, padding: "2px 8px", fontSize: 12 }}
                  value={dueDate}
                  onChange={e => {
                    setDueDate(e.target.value);
                    if (story && projectId) {
                      itemsApi.update(projectId, story.id, { dueDate: e.target.value || null })
                        .catch(err => console.error("Failed to save due date", err));
                    }
                  }}
                />
              </div>
            </div>

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
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[s], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--proj-text-2)" }}>{STATUS_LABELS[s]}</span>
                      <span style={{ fontWeight: 600, color: "var(--proj-text)" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>
      {openChild && (
        <>
          <div className="tp-backdrop open" style={{ zIndex: 200, animation: "fadeIn 0.2s ease" }} onClick={() => setOpenChild(null)} />
          <SubtaskDetailPanel
            key={openChild.id}
            item={openChild}
            parentTitle={story.title}
            sprintName={sprint}
            allSprints={allSprints}
            color={color}
            onClose={() => setOpenChild(null)}
            onStatusChange={onStatusChange}
            projectName={projectName}
            projectId={projectId}
            owners={owners}
          />
        </>
      )}
    </>
  );
}

// ─── Subtask Detail Panel ─────────────────────────────────────────────────────

function SubtaskDetailPanel({
  item, parentTitle, sprintName, allSprints, color, onClose, onStatusChange, projectName, projectId, owners,
}: {
  item: BLItem;
  parentTitle: string;
  sprintName: string;
  allSprints: BLSprintData[];
  color: string;
  onClose: () => void;
  onStatusChange?: (itemId: string, status: BLStatus) => void;
  projectName?: string;
  projectId?: string;
  owners: Owner[];
}) {
  const [desc, setDesc]               = useState(() => item.description ? `<p>${item.description}</p>` : "");
  const [descEditing, setDescEditing] = useState(false);
  const [storyStatus, setStoryStatus] = useState<BLStatus>(item.status);
  const [ownerName, setOwnerName]     = useState(item.assigneeName ?? owners[0]?.name ?? "");
  const [sprint, setSprint]           = useState(sprintName);
  const [pts, setPts]                 = useState<number>(item.pts ?? 0);
  const [priority, setPriority]       = useState(() => {
    const m: Record<string, string> = { "tp-high": "High", "tp-med": "Medium", "tp-low": "Low" };
    return m[item.priority ?? ""] ?? "Medium";
  });
  const [openField, setOpenField]     = useState<"status"|"priority"|"owner"|"sprint"|"pts"|null>(null);
  const [dueDate, setDueDate]         = useState(item.dueDate ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [title, setTitle]             = useState(item.title);

  const owner = owners.find(o => o.name === ownerName) ?? owners[0] ?? { initials: "?", name: "", color: "#9A9FAB" };
  const STATUS_COLORS: Record<BLStatus, string> = {
    "todo": "#9A9FAB", "in-progress": "#338EF7", "in-review": "#F5A524", "done": "#17C964",
  };
  const STATUS_LABELS: Record<BLStatus, string> = {
    "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done",
  };
  const PRIO_COLORS: Record<string, string> = {
    "Highest": "#F31260", "High": "#F97316", "Medium": "#F5A524", "Low": "#338EF7", "Lowest": "#9A9FAB",
  };
  const TYPE_LABEL: Record<BLType, string> = { task: "Task", story: "Story", bug: "Bug" };

  return (
    <aside className="task-panel open panel-animate" style={{ zIndex: 202 }} onClick={e => e.stopPropagation()}>
      <div className="tp-head">
        <div className="tp-crumb">
          <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
          <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
          <span style={{ color: "var(--proj-text-3)", fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parentTitle}</span>
          <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
          <span className="tp-crumb-id" style={{ color }}>{shortItemId(item.id, deriveProjectKey(projectName ?? "PRJ"))}</span>
        </div>
        <div className="tp-head-actions">
          <button className="proj-icon-btn" onClick={onClose} title="Close"><IClose /></button>
        </div>
      </div>

      <div className="tp-body">
        <div className="tp-main">

          {/* Type chip */}
          <div className="tp-status-row">
            <div className="tp-mini-chip" style={{ background: color + "18", color, border: `1px solid ${color}40` }}>
              <ICheck style={{ width: 10, height: 10, marginRight: 4 }} />
              {TYPE_LABEL[item.type]}
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
            <RichEditor content={desc} editable={descEditing} onChange={setDesc} minHeight={descEditing ? 140 : undefined} />
            {!descEditing && !desc.replace(/<[^>]+>/g,"").trim() && (
              <div className="tp-desc-placeholder">Click to add a description…</div>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <div className="tp-side" onClick={() => setOpenField(null)}>
          {/* Status */}
          <div className="tp-side-row">
            <div className="tp-side-label">Status</div>
            <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
              <button className="sb-status-pill"
                style={{ color: STATUS_COLORS[storyStatus], borderColor: STATUS_COLORS[storyStatus] + "55", background: STATUS_COLORS[storyStatus] + "14" }}
                onClick={() => setOpenField(openField === "status" ? null : "status")}>
                {STATUS_LABELS[storyStatus]} <IChevDown style={{ width: 10, height: 10 }} />
              </button>
              {openField === "status" && (
                <div className="sb-status-drop">
                  {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
                    <button key={s} className={"sb-status-opt" + (s === storyStatus ? " active" : "")}
                      style={{ color: STATUS_COLORS[s] }}
                      onClick={() => {
                        setStoryStatus(s); onStatusChange?.(item.id, s); setOpenField(null);
                        if (projectId) {
                          itemsApi.update(projectId, item.id, { status: BL_STATUS_TO_API[s] })
                            .catch(e => console.error("Failed to save status", e));
                        }
                      }}>
                      {STATUS_LABELS[s]}
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
                style={{ color: PRIO_COLORS[priority], borderColor: PRIO_COLORS[priority] + "55", background: PRIO_COLORS[priority] + "14", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => setOpenField(openField === "priority" ? null : "priority")}>
                <IFlag style={{ width: 10, height: 10 }} />
                {priority} <IChevDown style={{ width: 10, height: 10 }} />
              </button>
              {openField === "priority" && (
                <div className="sb-status-drop">
                  {PRIORITY_OPTS.map(p => (
                    <button key={p} className={"sb-status-opt" + (p === priority ? " active" : "")}
                      style={{ color: PRIO_COLORS[p] }}
                      onClick={() => {
                        setPriority(p); setOpenField(null);
                        if (projectId) {
                          itemsApi.update(projectId, item.id, { priority: PRIO_TO_API[p] })
                            .catch(e => console.error("Failed to save priority", e));
                        }
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Owner */}
          <div className="tp-side-row">
            <div className="tp-side-label">Owner</div>
            <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
              <button className="sb-status-pill"
                style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => setOpenField(openField === "owner" ? null : "owner")}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: owner.color, display: "grid", placeItems: "center", fontSize: 7, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{owner.initials}</div>
                {owner.name} <IChevDown style={{ width: 10, height: 10 }} />
              </button>
              {openField === "owner" && (
                <div className="sb-status-drop" style={{ width: 180 }}>
                  {owners.map(o => (
                    <button key={o.name} className={"sb-status-opt" + (o.name === ownerName ? " active" : "")}
                      style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
                      onClick={() => {
                        setOwnerName(o.name); setOpenField(null);
                        if (projectId) {
                          itemsApi.setAssignee(projectId, item.id, o.id)
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
              <button className="sb-status-pill"
                style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)" }}
                onClick={() => setOpenField(openField === "sprint" ? null : "sprint")}>
                {sprint} <IChevDown style={{ width: 10, height: 10 }} />
              </button>
              {openField === "sprint" && (
                <div className="sb-status-drop" style={{ width: 160 }}>
                  {allSprints.map(s => (
                    <button key={s.id} className={"sb-status-opt" + (s.name === sprint ? " active" : "")}
                      style={{ color: "var(--proj-text)" }}
                      onClick={() => {
                        setSprint(s.name); setOpenField(null);
                        if (projectId) {
                          itemsApi.update(projectId, item.id, { sprintId: s.id })
                            .catch(e => console.error("Failed to save sprint", e));
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
                ? <input type="number" min={0} max={99}
                    className="sb-modal-input"
                    style={{ width: 60, height: 26, padding: "2px 8px", fontSize: 12 }}
                    value={pts}
                    onChange={e => setPts(Number(e.target.value))}
                    onBlur={() => {
                      setOpenField(null);
                      if (projectId) {
                        itemsApi.update(projectId, item.id, { points: pts })
                          .catch(e => console.error("Failed to save pts", e));
                      }
                    }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setOpenField(null); }}
                    autoFocus
                  />
                : <button className="sb-status-pill"
                    style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)", minWidth: 44 }}
                    onClick={() => setOpenField("pts")}>
                    {pts} pts <IChevDown style={{ width: 10, height: 10 }} />
                  </button>
              }
            </div>
          </div>
          {/* Due date */}
          <div className="tp-side-row">
            <div className="tp-side-label">Due date</div>
            <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
              <input
                type="date"
                className="sb-modal-input"
                style={{ height: 26, padding: "2px 8px", fontSize: 12 }}
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  if (projectId) {
                    itemsApi.update(projectId, item.id, { dueDate: e.target.value || null })
                      .catch(err => console.error("Failed to save due date", err));
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

const SPRINT_STORY_COLORS = ["var(--blue)", "var(--purple)", "var(--orange)", "var(--green)", "var(--amber)"];

function BoardTab({ onOpenPanel, onOpenCreate, onOpenCard, activeSprint, allSprints, onSprintStatusChange, onCompleteSprint, onSubtaskCreated, projectName, projectId, owners }: {
  onOpenPanel: () => void;
  onOpenCreate: () => void;
  onOpenCard?: (c: CardPreview) => void;
  activeSprint?: BLSprintData;
  allSprints: BLSprintData[];
  onSprintStatusChange?: (itemId: string, status: BLStatus) => void;
  onCompleteSprint?: (sprintId: string) => void;
  onSubtaskCreated?: (sprintId: string, subtask: BLItem) => void;
  projectName?: string;
  projectId?: string;
  owners: Owner[];
}) {
  const [collapsed, setCollapsed]             = useState<Record<string, boolean>>({});
  const [openStoryStatus, setOpenStoryStatus] = useState<string | null>(null);
  const [openSprintStory, setOpenSprintStory] = useState<{ story: BLItem; color: string } | null>(null);
  const [sprintDragId,   setSprintDragId]   = useState<string | null>(null);
  const [sprintDragOver, setSprintDragOver] = useState<string | null>(null);

  function renderBoardCard(card: ReturnType<typeof blItemToCard>, colStatus = "To Do") {
    const dragging = sprintDragId === card.id;
    return (
      <div key={card.id}
        className={"t-card " + card.prio + (dragging ? " dragging" : "")}
        draggable
        onDragStart={() => setSprintDragId(card.id)}
        onDragEnd={() => { setSprintDragId(null); setSprintDragOver(null); }}
        onClick={() => onOpenCard ? onOpenCard({ id: card.id, title: card.title, prio: card.prio, status: colStatus }) : onOpenPanel()}
      >
        <div className="t-meta-row">
          <span className="t-id">{card.id}</span>
          <div className="t-tags">{card.tags.map(t => <span key={t} className={"t-tag " + t}>{t.replace("tt-","")}</span>)}</div>
        </div>
        <div className="t-title">{card.title}</div>
        {card.sub && (
          <div className="t-sub">
            <span>{card.sub.done}/{card.sub.total} subtasks</span>
            <div className="t-sub-bar"><div style={{ width: `${(card.sub.done/card.sub.total)*100}%` }} /></div>
          </div>
        )}
        <div className="t-foot">
          <div className="pavs">{card.avs.map(av => <div key={av} className={"pav pav-sm " + av} />)}</div>
          <div className={"t-due " + card.due}>{card.dueText}</div>
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
                <button className="k-col-add" onClick={e => { e.stopPropagation(); onOpenCreate(); }}><IPlus /></button>
              </div>
              <div
                className={"k-col-body" + (sprintDragOver === colKey ? " drag-over" : "")}
                onDragOver={e => { e.preventDefault(); setSprintDragOver(colKey); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSprintDragOver(null); }}
                onDrop={() => {
                  if (sprintDragId && onCardDrop) onCardDrop(sprintDragId, col.status);
                  setSprintDragOver(null);
                }}
              >
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
            const stories  = activeSprint.items.filter(i => i.type === "story");
            const allTasks = activeSprint.items.filter(i => i.type !== "story");
            const done     = allTasks.filter(i => i.status === "done").length;
            const total    = allTasks.length;
            const prog     = total > 0 ? Math.round(done / total * 100) : 0;
            const pts      = activeSprint.items.reduce((a, i) => a + (i.pts ?? 0), 0);
            const orphans  = allTasks.filter(i => !i.parentStoryId);

            return (
              <>
                {/* One story-group per story */}
                {stories.map((story, si) => {
                  const children = allTasks.filter(i => i.parentStoryId === story.id);
                  const sDone    = children.filter(c => c.status === "done").length;
                  const sTotal   = children.length;
                  const sProg    = sTotal > 0 ? Math.round(sDone / sTotal * 100) : 0;
                  const color    = SPRINT_STORY_COLORS[si % SPRINT_STORY_COLORS.length];
                  const isCol    = !!collapsed[story.id];
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
                        <span className="story-name" style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setOpenSprintStory({ story, color }); }}>{story.title}</span>
                        {story.priority && (() => {
                          const pc = story.priority === "tp-high" ? "#F97316" : story.priority === "tp-med" ? "#F5A524" : "#9A9FAB";
                          const pl = story.priority === "tp-high" ? "High" : story.priority === "tp-med" ? "Med" : "Low";
                          return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: pc + "18", color: pc, border: `1px solid ${pc}40`, flexShrink: 0 }}>{pl}</span>;
                        })()}
                        <div onClick={e => e.stopPropagation()}>
                          <BLStatusPill
                            status={story.status} itemId={story.id}
                            openFor={openStoryStatus} onOpen={setOpenStoryStatus}
                            onChange={s => onSprintStatusChange?.(story.id, s)}
                          />
                        </div>
                        <div className="story-mini-prog"><div style={{ width: sProg + "%" }} /></div>
                        <span className="story-frac">{sDone} / {sTotal}</span>
                        <div className="story-meta-end">
                          <span className="mini-chip">{sTotal} task{sTotal !== 1 ? "s" : ""}</span>
                        </div>
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
      {openSprintStory && activeSprint && (
        <SprintStoryPanel
          story={openSprintStory.story}
          children={activeSprint.items.filter(i => i.parentStoryId === openSprintStory.story.id)}
          sprintName={activeSprint.name}
          allSprints={allSprints}
          color={openSprintStory.color}
          onClose={() => setOpenSprintStory(null)}
          onStatusChange={onSprintStatusChange}
          onSubtaskCreated={sub => onSubtaskCreated?.(activeSprint.id, sub)}
          projectName={projectName}
          projectId={projectId}
          owners={owners}
        />
      )}
    </div>
  );
}

// ─── BACKLOG TAB ──────────────────────────────────────────────────────────────

type BLStatus = "todo" | "in-progress" | "in-review" | "done";
type BLType   = "task" | "story" | "bug";
type CardPreview = { id: string; title: string; prio: string; status: string };
const PRIO_LABEL: Record<string, string> = { "tp-high": "High", "tp-med": "Medium", "tp-low": "Low" };
const COL_STATUS: Record<string, string> = {
  "TODO": "To Do", "IN PROGRESS": "In Progress", "REVIEW": "In Review", "DONE": "Done",
  "todo": "To Do", "in-progress": "In Progress", "in-review": "In Review", "done": "Done",
};

const BL_STATUS_TO_API: Record<string, string> = {
  "todo": "To Do", "in-progress": "In Progress",
  "in-review": "In Review", "done": "Done",
};

const PRIO_TO_API: Record<string, string> = {
  "Highest": "urgent", "High": "high", "Medium": "medium", "Low": "low", "Lowest": "low",
};

interface BLItem {
  id: string; title: string; type: BLType; status: BLStatus;
  due?: string; dueDate?: string; pts?: number; hasSubtasks?: boolean;
  parentStoryId?: string;
  priority?: "tp-high" | "tp-med" | "tp-low";
  description?: string;
  assigneeName?: string;
}
interface BLSprintData {
  id: string; name: string; startDate?: string; endDate?: string;
  startIso?: string; endIso?: string;
  active: boolean; items: BLItem[];
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

const API_PRIO_TO_BL: Record<string, "tp-high" | "tp-med" | "tp-low"> = {
  "urgent": "tp-high", "high": "tp-high", "medium": "tp-med", "low": "tp-low",
};

function apiItemToBL(item: ApiItem, parentId?: string): BLItem {
  const dueDate = item.dueDate ? String(item.dueDate).slice(0, 10) : undefined;
  const due = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : undefined;
  return {
    id: item.id,
    title: item.title,
    type: (item.type === "bug" ? "bug" : item.type === "story" ? "story" : "task") as BLType,
    status: API_STATUS_TO_BL[item.status] ?? "todo",
    pts: item.points ?? undefined,
    hasSubtasks: item.subtasks.length > 0,
    priority: API_PRIO_TO_BL[item.priority] ?? "tp-med",
    parentStoryId: parentId,
    dueDate,
    due,
    description: item.description ?? undefined,
    assigneeName: item.assignees?.[0]?.user?.name,
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
  return (
    <div className="sb-status-wrap">
      <button
        className="sb-status-pill"
        style={{ color: cfg.color, borderColor: cfg.color + "55", background: cfg.color + "14" }}
        onClick={e => { e.stopPropagation(); onOpen(openFor === itemId ? null : itemId); }}
      >
        {cfg.label} <IChevDown style={{ width: 10, height: 10 }} />
      </button>
      {openFor === itemId && (
        <div className="sb-status-drop" onClick={e => e.stopPropagation()}>
          {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
            <button key={s}
              className={"sb-status-opt" + (s === status ? " active" : "")}
              style={{ color: BL_STATUS_CFG[s].color }}
              onClick={() => { onChange(s); onOpen(null); }}
            >
              {BL_STATUS_CFG[s].label}
            </button>
          ))}
        </div>
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
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
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

const BL_TYPE_TAG: Record<BLType, string> = { task: "tt-fe", story: "tt-be", bug: "tt-bug" };
function blItemToCard(item: BLItem) {
  return {
    id: item.id, title: item.title,
    prio: (item.priority ?? "tp-low") as "tp-high" | "tp-med" | "tp-low",
    tags: [BL_TYPE_TAG[item.type]],
    sub: item.hasSubtasks ? { done: 1, total: 3 } : null as { done: number; total: number } | null,
    avs: ["pav-1"] as string[],
    due: item.due === "Today" ? "today-due" : "" as string,
    dueText: item.due ?? "—",
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
  return (
    <div
      className={"t-card sb-card " + (item.priority ?? "tp-low") + (dragging ? " dragging" : "") + (isChild ? " sb-child-row" : "")}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <div className="sb-card-main">
        {hasToggle ? (
          <button className="sb-expand-btn" onClick={e => { e.stopPropagation(); onToggle!(); }}>
            {expanded
              ? <IChevDown style={{ width: 11, height: 11 }} />
              : <IChevR   style={{ width: 11, height: 11 }} />}
          </button>
        ) : (
          <div className="sb-expand-spacer" />
        )}
        <div className="t-meta-row">
          {isChild ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#338EF7"
              strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 13, height: 13, flexShrink: 0 }}>
              <path d="M8 6h13M8 12h13M8 18h5"/><circle cx="3" cy="12" r="1"/>
            </svg>
          ) : (
            <BLTypeIcon type={item.type} />
          )}
          <span className="t-id">{item.id}</span>
          <div className="t-tags">
            <span className={"t-tag " + BL_TYPE_TAG[item.type]}>{item.type}</span>
          </div>
          {childCount !== undefined && childCount > 0 && (
            <span className="sb-child-count">{childCount}</span>
          )}
        </div>
        <div className="t-title" style={{ cursor: "pointer" }} onClick={onOpenPanel}>{item.title}</div>
        {item.hasSubtasks && (
          <div className="t-sub">
            <span>subtasks</span>
            <div className="t-sub-bar"><div style={{ width: "40%" }} /></div>
          </div>
        )}
      </div>
      <div className="sb-card-right">
        <BLStatusPill status={item.status} itemId={item.id} openFor={openStatus}
          onOpen={onOpenStatus} onChange={s => onStatusChange(item.id, s)} />
        <div className="sb-due">{item.due ?? <span style={{ color: "var(--proj-text-4)" }}>—</span>}</div>
        <span className="sb-pts">{item.pts ?? "—"}</span>
        <div className="pav pav-sm pav-1" />
      </div>
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

function BacklogTab({ onOpenPanel, onOpenItem, sprints, setSprints, backlog, setBacklog, onCompleteSprint, projectId }: {
  onOpenPanel: () => void;
  onOpenItem?: (item: BLItem) => void;
  sprints: BLSprintData[]; setSprints: React.Dispatch<React.SetStateAction<BLSprintData[]>>;
  backlog: BLItem[];       setBacklog: React.Dispatch<React.SetStateAction<BLItem[]>>;
  onCompleteSprint: (sprintId: string) => void;
  projectId: string;
}) {
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({});
  const [expandedStories, setExpanded]    = useState<Record<string, boolean>>({});
  const [search, setSearch]               = useState("");
  const [openStatus, setOpenStatus]       = useState<string | null>(null);
  const [createIn, setCreateIn]           = useState<string | null>(null);
  const [dragOver, setDragOver]           = useState<string | null>(null);
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [addDatesFor, setAddDatesFor] = useState<{ sprintId: string; start: string; end: string } | null>(null);
  const [startFor, setStartFor]       = useState<{ sprintId: string; name: string; start: string; end: string; goal: string } | null>(null);
  const dragSrc = useRef<{ section: string; idx: number } | null>(null);

  function toggle(id: string) { setCollapsed(p => ({ ...p, [id]: !p[id] })); }

  function setStatus(sectionId: string, itemId: string, s: BLStatus) {
    if (sectionId === "backlog") {
      setBacklog(p => p.map(i => i.id === itemId ? { ...i, status: s } : i));
    } else {
      setSprints(p => p.map(sp => sp.id !== sectionId ? sp
        : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status: s } : i) }));
    }
    itemsApi.update(projectId, itemId, { status: BL_STATUS_TO_API[s] }).catch(e => console.error("API error", e));
  }

  function addItem(sectionId: string, title: string, type: BLType) {
    const tempId = `temp-${Date.now()}`;
    const item: BLItem = { id: tempId, title, type, status: "todo" };
    if (sectionId === "backlog") setBacklog(p => [...p, item]);
    else setSprints(p => p.map(sp => sp.id !== sectionId ? sp : { ...sp, items: [...sp.items, item] }));
    setCreateIn(null);
    const sprintId = sectionId === "backlog" ? undefined : sectionId;
    itemsApi.create(projectId, { title, type, sprintId })
      .then(created => {
        if (sectionId === "backlog") {
          setBacklog(p => p.map(i => i.id === tempId ? { ...i, id: created.id } : i));
        } else {
          setSprints(p => p.map(sp => sp.id !== sectionId ? sp : {
            ...sp, items: sp.items.map(i => i.id === tempId ? { ...i, id: created.id } : i),
          }));
        }
      })
      .catch(e => console.error("API error", e));
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
    if (src.section === "backlog") {
      item = backlog[src.idx];
      setBacklog(p => p.filter((_, i) => i !== src.idx));
    } else {
      item = sprints.find(s => s.id === src.section)?.items[src.idx];
      setSprints(p => p.map(s => s.id !== src.section ? s
        : { ...s, items: s.items.filter((_, i) => i !== src.idx) }));
    }
    if (!item) return;
    if (toSection === "backlog") setBacklog(p => [...p, item!]);
    else setSprints(p => p.map(s => s.id !== toSection ? s : { ...s, items: [...s.items, item!] }));
    setDragOver(null);
    const sprintId = toSection === "backlog" ? null : toSection;
    itemsApi.update(projectId, item.id, { sprintId }).catch(e => console.error("API error", e));
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
    const fmt = (d: string) => {
      if (!d) return undefined;
      const [, m, day] = d.split("-");
      const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[Number(m)]} ${Number(day)}`;
    };
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
    }).catch(e => console.error("Failed to start sprint", e));
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
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }

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

  const blFiltered = filterItems(backlog);
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
          <button className="filter-chip"><IUsers style={{ width: 12, height: 12 }} /> Assignee</button>
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
        </div>

        {/* Sprint sections */}
        {sprints.map(sprint => {
          const isCol   = collapsed[sprint.id];
          const fItems  = filterItems(sprint.items);
          const st      = stats(sprint.items);
          const est     = estOf(sprint.items);
          const isOver  = dragOver === sprint.id;

          return (
            <div key={sprint.id} className="sb-section">
              <div className="sb-section-head">
                <div className="sb-head-left">
                  <input type="checkbox" className="sb-checkbox" />
                  <button className="sb-chevron" onClick={() => toggle(sprint.id)}>
                    {isCol ? <IChevR style={{ width: 14, height: 14 }} /> : <IChevDown style={{ width: 14, height: 14 }} />}
                  </button>
                  <span className="sb-sprint-name">{sprint.name}</span>
                  {sprint.active && <span className="sb-active-badge">Active</span>}
                  <button className="sb-add-dates-btn" onClick={e => {
                    e.stopPropagation();
                    setAddDatesFor({ sprintId: sprint.id, start: sprint.startIso ?? "", end: sprint.endIso ?? "" });
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    {sprint.startDate && sprint.endDate ? `${sprint.startDate} – ${sprint.endDate}` : "Add dates"}
                  </button>
                  <span className="sb-item-count">({sprint.items.length} work item{sprint.items.length !== 1 ? "s" : ""})</span>
                </div>
                <div className="sb-head-right">
                  <span className="sb-stat-badge sb-stat-todo">{st.todo}</span>
                  <span className="sb-stat-badge sb-stat-inp">{st.inp}</span>
                  <span className="sb-stat-badge sb-stat-done">{st.done}</span>
                  {!sprint.active
                    ? <button className="sb-start-btn" onClick={() => setStartFor({ sprintId: sprint.id, name: sprint.name, start: "", end: "", goal: "" })}>Start sprint</button>
                    : <button className="sb-close-btn" onClick={() => onCompleteSprint(sprint.id)}>Complete sprint</button>
                  }
                  <button className="sb-more-btn"><IMoreH style={{ width: 14, height: 14 }} /></button>
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
              <input type="checkbox" className="sb-checkbox" />
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
              <button className="sb-more-btn"><IMoreH style={{ width: 14, height: 14 }} /></button>
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
      </div>

      {/* Add Dates modal */}
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
                <input type="date" className="sb-modal-input" value={addDatesFor.start}
                  onChange={e => setAddDatesFor(p => p ? { ...p, start: e.target.value } : null)} />
              </div>
              <div className="sb-modal-row">
                <label>End date</label>
                <input type="date" className="sb-modal-input" value={addDatesFor.end}
                  onChange={e => setAddDatesFor(p => p ? { ...p, end: e.target.value } : null)} />
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
                <input type="date" className="sb-modal-input" value={startFor.start}
                  onChange={e => setStartFor(p => p ? { ...p, start: e.target.value } : null)} />
              </div>
              <div className="sb-modal-row">
                <label>End date</label>
                <input type="date" className="sb-modal-input" value={startFor.end}
                  onChange={e => setStartFor(p => p ? { ...p, end: e.target.value } : null)} />
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
}

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────

const TL_MONTHS = ["FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN"];

const GOAL_SWATCHES = [
  "#338EF7","#9353D3","#F97316","#17C964","#F5A524","#F31260","#06B6D4","#10B981",
];

const GOAL_EMOJIS = ["🎯","🚀","💡","🔑","💰","👋","💸","⚡","🌟","🛠️","📦","🎨"];

function goalBarStyle(color: string) {
  return { background: color, borderColor: color };
}

function TimelineTab({ projectName, allSprints, goals, setGoals, projectId }: {
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
                  sprintsWithDates.map((s, idx) => {
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
}

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { initials: "AS", av: "pav-1", name: "Aanya Sharma",    role: "Lead Engineer",     tasks: "14", reviews: "7",  prs: "3", load: "load-bad",  loadPct: "95%", loadLabel: "Overloaded" },
  { initials: "RK", av: "pav-2", name: "Rakesh Kumar",    role: "Backend Engineer",  tasks: "11", reviews: "4",  prs: "2", load: "load-mid",  loadPct: "80%", loadLabel: "Near capacity" },
  { initials: "MP", av: "pav-3", name: "Mira Patel",      role: "Full-stack",        tasks: "9",  reviews: "5",  prs: "4", load: "load-good", loadPct: "65%", loadLabel: "Healthy" },
  { initials: "JL", av: "pav-4", name: "Jaya Lakshmi",    role: "Product Designer",  tasks: "7",  reviews: "3",  prs: "1", load: "load-good", loadPct: "55%", loadLabel: "Healthy" },
  { initials: "DT", av: "pav-5", name: "Dev Tiwari",      role: "DevOps & Infra",    tasks: "6",  reviews: "2",  prs: "2", load: "load-good", loadPct: "60%", loadLabel: "Healthy" },
  { initials: "LP", av: "pav-6", name: "Lakshmi Prasad",  role: "QA Engineer",       tasks: "12", reviews: "8",  prs: "0", load: "load-mid",  loadPct: "78%", loadLabel: "Near capacity" },
];

function TeamTab() {
  return (
    <div className="pane active">
      <div className="team-wrap">
        <div className="team-head">
          <span className="team-title">Team Members</span>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="team-stat-pill"><strong>9</strong> members</span>
            <span className="team-stat-pill"><strong>6</strong> active this week</span>
            <button className="proj-btn-ghost"><IPlus /> Invite</button>
          </div>
        </div>
        <div className="team-grid">
          {TEAM_MEMBERS.map((m) => (
            <div key={m.name} className="member-card">
              <div className="member-top">
                <div className={"pav pav-lg " + m.av}>{m.initials}</div>
                <div>
                  <div className="member-name">{m.name}</div>
                  <div className="member-role">{m.role}</div>
                </div>
              </div>
              <div className="member-stats">
                <div className="ms">
                  <div className="ms-n">{m.tasks}</div>
                  <div className="ms-l">Tasks</div>
                </div>
                <div className="ms">
                  <div className="ms-n">{m.reviews}</div>
                  <div className="ms-l">Reviews</div>
                </div>
                <div className="ms">
                  <div className="ms-n">{m.prs}</div>
                  <div className="ms-l">Open PRs</div>
                </div>
              </div>
              <div className="member-load">
                <div className="member-load-label">
                  <span>Workload</span>
                  <span className={m.load === "load-bad" ? "bl-h" : ""}>{m.loadLabel}</span>
                </div>
                <div className="member-load-bar">
                  <div className={"load-fill " + m.load} style={{ width: m.loadPct }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TASK PANEL ───────────────────────────────────────────────────────────────

const TASK_INITIAL_DESC = `<p>Implement secure refresh token rotation per <code>RFC 6819 §5.2.2</code>. When a refresh token is used, the old token must be immediately invalidated and a new pair issued.</p><p><strong>Acceptance criteria:</strong></p><ul><li>Old refresh token rejected after first use (replay detection)</li><li>New token pair issued atomically — no race condition window</li><li>Revocation propagates within 500ms to all active sessions</li><li>Token family tracking to detect theft via simultaneous use</li></ul>`;

function TaskPanel({ open, onClose, projectName, card, projectId, allSprints }: {
  open: boolean; onClose: () => void; projectName?: string; card?: CardPreview | null;
  projectId?: string; allSprints?: BLSprintData[];
}) {
  const initStatus = card?.status ?? "In Progress";
  const initPrio   = PRIO_LABEL[card?.prio ?? ""] || "High";
  const [checked, setChecked]   = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: true, 5: true });
  const [editing, setEditing]   = useState(false);
  const [taskTitle, setTaskTitle] = useState(card?.title ?? "Auth refactor — refresh token rotation logic");
  const [taskStatus, setTaskStatus] = useState(initStatus);
  const [taskPrio, setTaskPrio]   = useState(initPrio);
  const [taskPts, setTaskPts]     = useState(8);
  const [taskSprint, setTaskSprint] = useState("Sprint 14");
  const [taskDueDate, setTaskDueDate] = useState((card as (CardPreview & { dueDate?: string }) | null | undefined)?.dueDate ?? "");
  const [openField, setOpenField] = useState<"status"|"priority"|"pts"|"sprint"|null>(null);
  const [taskDesc, setTaskDesc]   = useState(TASK_INITIAL_DESC);
  const [comment, setComment]     = useState("");
  const [comments, setComments]   = useState<string[]>([]);

  useEffect(() => {
    if (!open || !card || !projectId) return;
    commentsApi.list(projectId, card.id)
      .then(list => setComments(list.map(c => c.body)))
      .catch(e => console.error("Failed to load comments", e));
  }, [open, card?.id, projectId]);

  const TP_STATUS_COLORS: Record<string, string> = {
    "To Do": "#9A9FAB", "In Progress": "#338EF7", "In Review": "#F5A524", "Done": "#17C964",
  };
  const TP_PRIO_COLORS: Record<string, string> = {
    "Highest": "#F31260", "High": "#F97316", "Medium": "#F5A524", "Low": "#338EF7", "Lowest": "#9A9FAB",
  };

  return (
    <>
      <div className={"tp-backdrop" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"task-panel" + (open ? " open" : "")}>
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
            <span className="tp-crumb-id">{card?.id ?? "NB-218"}</span>
          </div>
          <div className="tp-head-actions">

            {editing
              ? <>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={() => {
                    if (card && projectId) {
                      const sprintId = allSprints?.find(s => s.name === taskSprint)?.id;
                      itemsApi.update(projectId, card.id, {
                        title: taskTitle,
                        status: taskStatus,
                        priority: PRIO_TO_API[taskPrio],
                        points: taskPts,
                        ...(sprintId ? { sprintId } : {}),
                      }).catch(e => console.error("Failed to save task", e));
                    }
                    setEditing(false);
                  }}>Save</button>
                  <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => setEditing(false)}>Cancel</button>
                </>
              : <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => setEditing(true)}>Edit</button>
            }
            <button className="proj-icon-btn" title="More"><IMoreH /></button>
            <button className="proj-icon-btn" onClick={onClose} title="Close"><IClose /></button>
          </div>
        </div>

        <div className="tp-body">
          <div className="tp-main">

            {editing ? (
              <input
                className="cs-input"
                style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12, padding: "8px 10px" }}
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h2 className="tp-title">{taskTitle}</h2>
            )}

            <div className="tp-sec-name">Description</div>
            <RichEditor
              content={taskDesc}
              editable={editing}
              onChange={setTaskDesc}
              placeholder="Add a description…"
              minHeight={editing ? 160 : undefined}
            />

            <div className="tp-sec-name">Subtasks <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 11 }}>6 / 10</span></div>
            <div className="subtask-list">
              <div className="subtask-summary">
                <strong>Subtasks</strong> — 6 of 10 complete
                <span className="frac">60%</span>
              </div>
              {[
                { name: "Design token rotation schema",            est: "2h",  done: true  },
                { name: "Redis store for token family tracking",   est: "3h",  done: true  },
                { name: "Rotation endpoint — atomic swap",         est: "4h",  done: true  },
                { name: "Replay detection middleware",             est: "2h",  done: true  },
                { name: "Token theft detection alert",             est: "3h",  done: true  },
                { name: "Session revocation broadcast",           est: "4h",  done: true  },
                { name: "Integration tests — rotation flow",       est: "3h",  done: false },
                { name: "Load test — concurrent rotation",         est: "2h",  done: false },
                { name: "Docs — token lifecycle diagram",          est: "1h",  done: false },
                { name: "Security review sign-off",               est: "1h",  done: false },
              ].map((s, i) => {
                const isDone = checked[i] !== undefined ? checked[i] : s.done;
                return (
                  <div key={i} className={"subtask-row" + (isDone ? " checked" : "")}
                    onClick={() => setChecked(p => ({ ...p, [i]: !isDone }))}>
                    <div className={"checkbox" + (isDone ? " checked" : "")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="subtask-name">{s.name}</span>
                    <span className="subtask-est">{s.est}</span>
                  </div>
                );
              })}
            </div>

            <div className="tp-sec-name">Time</div>
            <div className="time-block">
              <div className="tb-cell">
                <div className="tb-lbl">Estimate</div>
                <div className="tb-val">24h</div>
              </div>
              <div className="tb-cell">
                <div className="tb-lbl">Logged</div>
                <div className="tb-val warn">12h 14m</div>
              </div>
              <div className="tb-cell">
                <div className="tb-lbl">Remaining</div>
                <div className="tb-val">~11h</div>
              </div>
            </div>

            <div className="tp-sec-name">Activity</div>
            {[
              { av: "pav-1", init: "AS", head: <><strong>Aanya</strong> commented</>, time: "2h ago", text: "Replay detection middleware is tricky — the Redis TTL needs to be exactly 2× the token lifetime." },
              { av: "pav-2", init: "RK", head: <><strong>Rakesh</strong> updated status to <em>In Progress</em></>, time: "Yesterday" },
              { av: "pav-5", init: "DT", head: <><strong>Dev</strong> linked PR <span style={{ color: "var(--blue)", fontFamily: "monospace" }}>#847</span></>, time: "Yesterday", text: null },
            ].map(({ av, init, head, time, text }) => (
              <div key={init + time} className="tp-act-item">
                <div className={"pav " + av} style={{ fontSize: 9 }}>{init}</div>
                <div className="tp-act-body">
                  <div className="tp-act-head">{head} <span className="tp-act-time">{time}</span></div>
                  {text && <div className="tp-act-text">{text}</div>}
                </div>
              </div>
            ))}

            {comments.map((c, i) => (
              <div key={i} className="tp-act-item" style={{ marginTop: 8 }}>
                <div className="pav pav-1" style={{ fontSize: 9 }}>AS</div>
                <div className="tp-act-body">
                  <div className="tp-act-head"><strong>Aanya</strong> commented <span className="tp-act-time">just now</span></div>
                  <div className="tp-act-text">{c}</div>
                </div>
              </div>
            ))}
            <div className="tp-compose">
              <div className="compose-head">
                <div className="pav pav-1" style={{ fontSize: 9, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center" }}>AS</div>
                <span className="compose-as">Add a comment…</span>
              </div>
              <textarea className="compose-area" placeholder="Write a comment or @mention a teammate…"
                value={comment} onChange={e => setComment(e.target.value)} />
              <div className="compose-actions">
                <div style={{ marginLeft: "auto" }}>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }}
                    disabled={!comment.trim()}
                    onClick={async () => {
                      if (!comment.trim()) return;
                      if (card && projectId) {
                        try {
                          const created = await commentsApi.create(projectId, card.id, comment.trim());
                          setComments(p => [...p, created.body]);
                        } catch (e) {
                          console.error("Failed to add comment", e);
                          setComments(p => [...p, comment.trim()]);
                        }
                      } else {
                        setComments(p => [...p, comment.trim()]);
                      }
                      setComment("");
                    }}>
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="tp-side" onClick={() => setOpenField(null)}>
            {/* Status */}
            <div className="tp-side-row">
              <div className="tp-side-label">Status</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <button className="sb-status-pill"
                  style={{ color: TP_STATUS_COLORS[taskStatus], borderColor: TP_STATUS_COLORS[taskStatus] + "55", background: TP_STATUS_COLORS[taskStatus] + "14" }}
                  onClick={() => setOpenField(openField === "status" ? null : "status")}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: TP_STATUS_COLORS[taskStatus], display: "inline-block", marginRight: 5 }} />
                  {taskStatus} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "status" && (
                  <div className="sb-status-drop">
                    {["To Do","In Progress","In Review","Done"].map(s => (
                      <button key={s} className={"sb-status-opt" + (s === taskStatus ? " active" : "")}
                        style={{ color: TP_STATUS_COLORS[s] }}
                        onClick={() => { setTaskStatus(s); setOpenField(null); }}>
                        {s}
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
                  style={{ color: TP_PRIO_COLORS[taskPrio], borderColor: TP_PRIO_COLORS[taskPrio] + "55", background: TP_PRIO_COLORS[taskPrio] + "14", display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => setOpenField(openField === "priority" ? null : "priority")}>
                  <IFlag style={{ width: 10, height: 10 }} />
                  {taskPrio} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "priority" && (
                  <div className="sb-status-drop">
                    {["Highest","High","Medium","Low","Lowest"].map(p => (
                      <button key={p} className={"sb-status-opt" + (p === taskPrio ? " active" : "")}
                        style={{ color: TP_PRIO_COLORS[p] }}
                        onClick={() => { setTaskPrio(p); setOpenField(null); }}>
                        {p}
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
                  ? <input type="number" min={0} max={99}
                      className="sb-modal-input"
                      style={{ width: 60, height: 26, padding: "2px 8px", fontSize: 12 }}
                      value={taskPts}
                      onChange={e => setTaskPts(Number(e.target.value))}
                      onBlur={() => setOpenField(null)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setOpenField(null); }}
                      autoFocus
                    />
                  : <button className="sb-status-pill"
                      style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)", minWidth: 44 }}
                      onClick={() => setOpenField("pts")}>
                      {taskPts} pts <IChevDown style={{ width: 10, height: 10 }} />
                    </button>
                }
              </div>
            </div>
            <div className="tp-sep" />
            <div className="tp-side-row">
              <div className="tp-side-label">Assignees</div>
              <div className="tp-side-val">
                <div className="pavs">
                  <div className="pav pav-1">AS</div>
                  <div className="pav pav-2">RK</div>
                </div>
                Aanya, Rakesh
              </div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Sprint</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <button className="sb-status-pill"
                  style={{ color: "var(--proj-text-2)", borderColor: "var(--proj-line-strong)", background: "var(--proj-surface-2)" }}
                  onClick={() => setOpenField(openField === "sprint" ? null : "sprint")}>
                  {taskSprint} <IChevDown style={{ width: 10, height: 10 }} />
                </button>
                {openField === "sprint" && (
                  <div className="sb-status-drop" style={{ width: 160 }}>
                    {(allSprints ?? []).map(s => (
                      <button key={s.id} className={"sb-status-opt" + (s.name === taskSprint ? " active" : "")}
                        style={{ color: "var(--proj-text)" }}
                        onClick={() => { setTaskSprint(s.name); setOpenField(null); }}>
                        {s.name}{s.active ? " (active)" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Story</div>
              <div className="tp-side-val">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", display: "inline-block", boxShadow: "0 0 5px var(--blue)" }} />
                Auth &amp; Sessions
              </div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Labels</div>
              <div className="tp-tags-stack">
                <span className="t-tag tt-be">Backend</span>
                <span className="t-tag tt-inf">Security</span>
              </div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Due date</div>
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()}>
                <input
                  type="date"
                  className="sb-modal-input"
                  style={{ height: 26, padding: "2px 8px", fontSize: 12 }}
                  value={taskDueDate}
                  onChange={e => {
                    setTaskDueDate(e.target.value);
                    if (card && projectId) {
                      itemsApi.update(projectId, card.id, { dueDate: e.target.value || null })
                        .catch(err => console.error("Failed to save due date", err));
                    }
                  }}
                />
              </div>
            </div>
            <div className="tp-sep" />
            <div className="tp-side-row">
              <div className="tp-side-label">Related tasks</div>
              <div className="tp-related">
                {[
                  { id: "NB-205", title: "Biometric fallback flow", status: "rs-prog" },
                  { id: "NB-207", title: "Session replay for support", status: "rs-todo" },
                  { id: "NB-185", title: "OAuth 2.0 provider integration", status: "rs-done" },
                ].map(({ id, title, status }) => (
                  <div key={id} className="tp-rel-row">
                    <span className="rel-id">{id}</span>
                    <span className="rel-title">{title}</span>
                    <span className={"rel-status " + status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["overview", "board", "backlog", "timeline", "team"] as const;
type TabKey = typeof TABS[number];

export default function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const load          = useProjectStore(s => s.load);
  const loaded        = useProjectStore(s => s.loaded);
  const project       = useProjectStore(s => s.projects.find(p => p.id === id));
  const updateProject = useProjectStore(s => s.updateProject);

  const [activeTab, setActiveTab]   = useState<TabKey>("overview");
  const [panelOpen, setPanelOpen]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [openCardData, setOpenCardData] = useState<CardPreview | null>(null);

  useEffect(() => {
    if (!getToken()) window.location.href = "/login";
  }, []);

  function handleOpenCard(c: CardPreview) {
    setOpenCardData(c);
    setPanelOpen(true);
  }

  const [blSprints, setBlSprints] = useState<BLSprintData[]>([]);
  const [blBacklog, setBlBacklog] = useState<BLItem[]>([]);
  const [projectMembers, setProjectMembers] = useState<Owner[]>([]);
  const [milestones, setMilestones] = useState<import("@/lib/api").ApiMilestone[]>([]);
  const [goals, setGoals] = useState<import("@/lib/api").ApiGoal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const activeSprint = blSprints.find(s => s.active);
  const nextTaskId   = useRef(300);

  // Load sidebar project list
  useEffect(() => { if (!loaded) load(); }, [load, loaded]);

  // Load sprint + backlog data for this project
  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    setBlSprints([]);
    setBlBacklog([]);
    projectsApi.get(id)
      .then(data => {
        if (cancelled) return;
        const sprints: BLSprintData[] = data.sprints.map(s => {
          const topLevel = s.items.filter(i => !i.parentId);
          const subtasksFlat = topLevel.flatMap(i => i.subtasks.map(sub => apiItemToBL(sub, i.id)));
          return {
            id: s.id,
            name: s.name,
            startIso:  s.startDate ? String(s.startDate).slice(0, 10) : undefined,
            endIso:    s.endDate   ? String(s.endDate).slice(0, 10)   : undefined,
            startDate: s.startDate ? new Date(s.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
            endDate:   s.endDate   ? new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined,
            active: s.status === "active",
            items: [...topLevel.map(i => apiItemToBL(i)), ...subtasksFlat],
          };
        });
        const backlogTopLevel = data.items.filter(i => !i.parentId);
        const backlogSubtasks = backlogTopLevel.flatMap(i => i.subtasks.map(sub => apiItemToBL(sub, i.id)));
        const backlog: BLItem[] = [...backlogTopLevel.map(i => apiItemToBL(i)), ...backlogSubtasks];
        setBlSprints(sprints);
        setBlBacklog(backlog);
        setMilestones(data.milestones ?? []);
        setGoals(data.goals ?? []);
        const AV_COLORS = ["#338EF7","#F97316","#9353D3","#17C964","#F31260","#F5A524"];
        setProjectMembers(data.members.map((m, i) => ({
          id: m.user.id,
          initials: m.user.name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          name: m.user.name,
          color: AV_COLORS[i % AV_COLORS.length],
        })));
      })
      .catch((err: unknown) => {
        if ((err as { status?: number }).status === 401) {
          window.location.href = "/login";
        } else {
          console.error("Failed to load project data:", err);
        }
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function handleTaskCreated({ summary, workType, status, sprint }: {
    summary: string; workType: string; status: string; sprint: string;
  }) {
    const blType: BLType = workType === "Bug" ? "bug" : workType === "Story" ? "story" : "task";
    const blStatus: BLStatus = status === "In Progress" ? "in-progress"
      : status === "In Review" ? "in-review"
      : status === "Done"      ? "done"
      : "todo";
    const tempId = `NB-${nextTaskId.current++}`;
    const item: BLItem = { id: tempId, title: summary, type: blType, status: blStatus };
    const targetSprint = blSprints.find(s => s.active);

    if (sprint.includes("active") && targetSprint) {
      setBlSprints(p => p.map(s => s.active ? { ...s, items: [...s.items, item] } : s));
      setActiveTab("board");
      itemsApi.create(id, { title: summary, type: blType, status, sprintId: targetSprint.id })
        .then(created => {
          setBlSprints(p => p.map(s => s.active
            ? { ...s, items: s.items.map(i => i.id === tempId ? { ...i, id: created.id } : i) }
            : s));
          pushToast(`"${summary}" added to sprint`);
        }).catch(e => { console.error("API error", e); pushToast("Failed to create item", "error"); });
    } else {
      setBlBacklog(p => [...p, item]);
      setActiveTab("backlog");
      itemsApi.create(id, { title: summary, type: blType, status })
        .then(created => {
          setBlBacklog(p => p.map(i => i.id === tempId ? { ...i, id: created.id } : i));
          pushToast(`"${summary}" added to backlog`);
        }).catch(e => { console.error("API error", e); pushToast("Failed to create item", "error"); });
    }
  }

  function handleSprintStatusChange(itemId: string, status: BLStatus) {
    setBlSprints(p => p.map(sp =>
      !sp.active ? sp : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status } : i) }
    ));
    itemsApi.update(id, itemId, { status: BL_STATUS_TO_API[status] }).catch(e => console.error("API error", e));
  }

  function handleSubtaskCreated(sprintId: string, subtask: BLItem) {
    setBlSprints(p => p.map(sp =>
      sp.id === sprintId ? { ...sp, items: [...sp.items, subtask] } : sp
    ));
  }

  // ── Complete sprint modal (shared by Board + Backlog) ──────────────────────
  const [completeModal, setCompleteModal] = useState<{
    sprintId: string; sprintName: string;
    destinations: Record<string, "next-sprint" | "backlog">;
  } | null>(null);

  function openCompleteSprint(sprintId: string) {
    const sprint = blSprints.find(s => s.id === sprintId);
    if (!sprint) return;
    const incomplete = sprint.items.filter(i => i.status !== "done");
    const nextSp     = blSprints.find(s => !s.active && s.id !== sprintId);
    const defaultDest: "next-sprint" | "backlog" = nextSp ? "next-sprint" : "backlog";
    const destinations: Record<string, "next-sprint" | "backlog"> = {};
    incomplete.forEach(i => { destinations[i.id] = defaultDest; });
    setCompleteModal({ sprintId, sprintName: sprint.name, destinations });
  }

  function doCompleteSprint() {
    if (!completeModal) return;
    const { sprintId, destinations } = completeModal;
    const sprint = blSprints.find(s => s.id === sprintId);
    if (!sprint) return;
    const incomplete     = sprint.items.filter(i => i.status !== "done");
    const nextSp         = blSprints.find(s => !s.active && s.id !== sprintId);
    const toBacklogItems = incomplete.filter(i => destinations[i.id] === "backlog" || !nextSp);
    const toNextItems    = nextSp ? incomplete.filter(i => destinations[i.id] === "next-sprint") : [];
    setBlSprints(p => p.map(s => {
      if (s.id === sprintId) return { ...s, active: false, items: s.items.filter(i => i.status === "done") };
      if (nextSp && s.id === nextSp.id) return { ...s, items: [...s.items, ...toNextItems] };
      return s;
    }));
    if (toBacklogItems.length > 0) setBlBacklog(p => [...p, ...toBacklogItems]);
    setCompleteModal(null);
    const apiCalls: Promise<unknown>[] = [
      ...toNextItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: nextSp!.id })
          .catch(e => console.error(`Failed to move item ${item.id} to next sprint`, e))
      ),
      ...toBacklogItems.map(item =>
        itemsApi.update(id, item.id, { sprintId: null })
          .catch(e => console.error(`Failed to move item ${item.id} to backlog`, e))
      ),
    ];
    Promise.all(apiCalls).then(() =>
      sprintsApi.complete(id, sprintId)
        .catch(e => console.error("Failed to mark sprint complete", e))
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
              <button key={t} className={"proj-tab" + (activeTab === t ? " active" : "")} onClick={() => setActiveTab(t)}>
                {label}
                {count && <span className="proj-tab-count">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="proj-tab-content">
          {activeTab === "overview"  && <OverviewTab  onOpenPanel={() => setPanelOpen(true)} onOpenCreate={() => setCreateOpen(true)} onSwitchToBoard={() => setActiveTab("board")} project={project} activeSprint={activeSprint} projectId={id} updateProject={updateProject} allSprints={blSprints} backlog={blBacklog} milestones={milestones} setMilestones={setMilestones} />}
          {activeTab === "board"     && (dataLoading
            ? <div className="proj-data-loading">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 10 }} />)}</div>
            : <BoardTab     onOpenPanel={() => setPanelOpen(true)} onOpenCreate={() => setCreateOpen(true)} onOpenCard={handleOpenCard} activeSprint={activeSprint} allSprints={blSprints} onSprintStatusChange={handleSprintStatusChange} onCompleteSprint={openCompleteSprint} onSubtaskCreated={handleSubtaskCreated} projectName={project?.name} projectId={id} owners={projectMembers} />
          )}
          {activeTab === "backlog"   && (dataLoading
            ? <div className="proj-data-loading">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />)}</div>
            : <BacklogTab   onOpenPanel={() => setPanelOpen(true)} onOpenItem={item => handleOpenCard({ id: item.id, title: item.title, prio: item.priority ?? "tp-low", status: COL_STATUS[item.status] ?? "To Do" })} sprints={blSprints} setSprints={setBlSprints} backlog={blBacklog} setBacklog={setBlBacklog} onCompleteSprint={openCompleteSprint} projectId={id} />
          )}
          {activeTab === "timeline"  && <TimelineTab projectName={project?.name} allSprints={blSprints} goals={goals} setGoals={setGoals} projectId={id} />}
          {activeTab === "team"      && <TeamTab />}
        </div>
      </div>

      <TaskPanel key={openCardData?.id ?? "static"} open={panelOpen} onClose={() => { setPanelOpen(false); setOpenCardData(null); }} projectName={project?.name} card={openCardData} projectId={id} allSprints={blSprints} />
      <CreateStoryPanel open={createOpen} onClose={() => setCreateOpen(false)} projectName={project?.name} onCreated={handleTaskCreated} allSprints={blSprints} owners={projectMembers} />

      {/* Complete Sprint modal — shared by Board + Backlog */}
      {completeModal && (() => {
        const sprint     = blSprints.find(s => s.id === completeModal.sprintId);
        const incomplete = sprint ? sprint.items.filter(i => i.status !== "done") : [];
        const doneCount  = sprint ? sprint.items.filter(i => i.status === "done").length : 0;
        const total      = sprint ? sprint.items.length : 0;
        const nextSp     = blSprints.find(s => !s.active && s.id !== completeModal.sprintId);
        const stories    = incomplete.filter(i => i.type === "story");
        const tasks      = incomplete.filter(i => i.type !== "story");
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
                    {stories.length > 0 && (
                      <div className="sb-complete-group">
                        <div className="sb-complete-group-label">Stories</div>
                        {stories.map(item => (
                          <div key={item.id} className="sb-complete-row">
                            <IFlag style={{ width: 13, height: 13, color: "#9353D3", flexShrink: 0 }} />
                            <span className="sb-complete-title">{item.title}</span>
                            <select className="sb-complete-dest"
                              value={completeModal.destinations[item.id] ?? (nextSp ? "next-sprint" : "backlog")}
                              onChange={e => setCompleteModal(p => p ? { ...p, destinations: { ...p.destinations, [item.id]: e.target.value as "next-sprint" | "backlog" } } : null)}
                            >
                              {nextSp && <option value="next-sprint">{nextSp.name}</option>}
                              <option value="backlog">Backlog</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                    {tasks.length > 0 && (
                      <div className="sb-complete-group">
                        <div className="sb-complete-group-label">Tasks &amp; Bugs</div>
                        {tasks.map(item => (
                          <div key={item.id} className="sb-complete-row">
                            <BLTypeIcon type={item.type} />
                            <span className="sb-complete-title">{item.title}</span>
                            <select className="sb-complete-dest"
                              value={completeModal.destinations[item.id] ?? (nextSp ? "next-sprint" : "backlog")}
                              onChange={e => setCompleteModal(p => p ? { ...p, destinations: { ...p.destinations, [item.id]: e.target.value as "next-sprint" | "backlog" } } : null)}
                            >
                              {nextSp && <option value="next-sprint">{nextSp.name}</option>}
                              <option value="backlog">Backlog</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
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
