"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import "../projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar from "@/components/ProjectsListSidebar";
import RichEditor from "@/components/RichEditor";
import { useProjectStore, type Project } from "@/lib/projectStore";

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
const IExtLink  = mkIcon(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>);
const IMoreH    = mkIcon(<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>);
const IUsers    = mkIcon(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);
const IPeople   = mkIcon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>);
const IBoxes    = mkIcon(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
const ITimeline = mkIcon(<><path d="M4 6h10"/><circle cx="18" cy="6" r="2"/><path d="M4 12h6"/><circle cx="14" cy="12" r="2"/><path d="M4 18h12"/><circle cx="20" cy="18" r="2"/></>);

// ─── Create Story Modal ───────────────────────────────────────────────────────

const PRIORITY_OPTS = ["Highest", "High", "Medium", "Low", "Lowest"];
const SPRINT_OPTS   = ["Sprint 14 (active)", "Sprint 15", "Sprint 16", "Backlog"];
const ESTIMATE_OPTS = ["XS", "S", "M", "L", "XL", "XXL"];
const STATUS_OPTS   = ["To Do", "In Progress", "In Review", "Done"];
const WORK_TYPE_OPTS = ["Story", "Task", "Bug", "Epic", "Sub-task"];

function CreateStoryPanel({ open, onClose, projectName, onCreated }: {
  open: boolean; onClose: () => void; projectName?: string;
  onCreated?: (item: { summary: string; workType: string; status: string; sprint: string }) => void;
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
                <option value="Automatic">Automatic</option>
                <option value="Salil Timalsina">Salil Timalsina</option>
                <option value="Rakesh Kumar">Rakesh Kumar</option>
                <option value="Mira Patel">Mira Patel</option>
              </select>
              <button className="cs-assign-me" onClick={() => setAssignee("Salil Timalsina")}>Assign to me</button>
            </div>

            <div className="cs-side-row">
              <div className="cs-side-label">Sprint</div>
              <select className="cs-select" value={sprint} onChange={e => setSprint(e.target.value)}>
                <option value="">Select sprint</option>
                {SPRINT_OPTS.map(o => <option key={o}>{o}</option>)}
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

function ProjectTopbar({ onOpenPanel, project }: { onOpenPanel: () => void; project: Project | undefined }) {
  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        <span>Projects</span>
        <IChevR />
        <strong>{project?.name ?? "Project"}</strong>
      </div>
      <div className="proj-sprint-chip">
        <span className="proj-sprint-pip" />
        Sprint 14 · ends in 2d
      </div>
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

function OverviewTab({ onOpenPanel, onOpenCreate, onSwitchToBoard, project }: {
  onOpenPanel: () => void; onOpenCreate: () => void; onSwitchToBoard: () => void;
  project: Project | undefined;
}) {
  const isKnown = !!project && ["1","2","3","4","5","6"].includes(project.id);
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
                {isKnown && <span className="proj-badge pb-sprint">Sprint 14 · ends in 2d</span>}
              </div>
              <h1 className="proj-hero-title">
                {project?.name ?? "New Project"}
              </h1>
              {isKnown && <p className="proj-hero-sub">A consumer mobile bank for Astra Capital. Onboarding, accounts, transfers, and the new round-up savings module land this quarter.</p>}
              {!isKnown && <p className="proj-hero-sub">Your new project is ready. Head to the board or backlog to get started.</p>}
            </div>
            <div className="proj-hero-actions">
              <button className="proj-btn-ghost"><IClock /> Log time</button>
              <button className="proj-btn-primary" onClick={onOpenCreate}><IPlus /> Add task</button>
            </div>
          </div>

          <div className="health-strip">
            <div className="health-cell">
              <div className="health-label">Progress</div>
              <div className="health-value">68<span className="hsmall">%</span></div>
              <div className="health-bar"><div className="hb-progress" style={{ width: "68%" }} /></div>
            </div>
            <div className="health-cell">
              <div className="health-label">Budget</div>
              <div className="health-value">Healthy</div>
              <div className="health-bar"><div className="hb-budget" style={{ width: "74%" }} /></div>
            </div>
            <div className="health-cell">
              <div className="health-label">Sprint</div>
              <div className="health-value">On track</div>
              <div className="health-bar"><div className="hb-sprint" style={{ width: "58%" }} /></div>
            </div>
            <div className="health-cell">
              <div className="health-label">Risk</div>
              <div className="health-value">Low</div>
              <div className="health-bar"><div className="hb-low" /></div>
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

        {/* Milestone timeline */}
        <div className="milestone-wrap">
          <div className="milestone-title">Project milestones</div>
          <div className="milestone-sub">58% of roadmap complete · on track for Q3 ship</div>
          <div className="tl-track">
            <div className="tl-line" />
            {[
              { pos: "8%",  cls: "done",    label: "Kick-off", date: "Jan 15" },
              { pos: "24%", cls: "done",    label: "Auth MVP",  date: "Mar 1"  },
              { pos: "42%", cls: "done",    label: "Accounts", date: "Apr 12" },
              { pos: "58%", cls: "current", label: "Round-up", date: "May 20" },
              { pos: "74%", cls: "",        label: "Transfers",date: "Jun 30" },
              { pos: "90%", cls: "",        label: "Launch",   date: "Aug 15" },
            ].map(({ pos, cls, label, date }) => (
              <div key={label} className={"tl-node " + cls} style={{ left: pos }}>
                <div className="tl-label">
                  <span className="strong">{label}</span>{date}
                </div>
                {pos === "58%" && <div className="tl-cap">← NOW</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

const STORY_GROUPS = [
  {
    name: "Auth & Sessions",
    color: "var(--blue)",
    pts: "34 pts",
    frac: "8 / 12",
    prog: 66,
    sprint: "Sprint 14",
    cols: [
      { name: "TO DO",      pill: "kp-todo", count: 2, cards: [
        { id: "NB-201", title: "Refresh token rotation", prio: "tp-high", tags: ["tt-be"], sub: { done: 2, total: 4 }, avs: ["pav-1"], due: "overdue", dueText: "3d ago" },
        { id: "NB-202", title: "Revoke session on logout everywhere", prio: "tp-med", tags: ["tt-be"], sub: null, avs: ["pav-2"], due: "", dueText: "May 16" },
      ]},
      { name: "IN PROGRESS", pill: "kp-prog", count: 3, cards: [
        { id: "NB-218", title: "Auth refactor — refresh token logic", prio: "tp-high", tags: ["tt-be"], sub: { done: 6, total: 10 }, avs: ["pav-1", "pav-2"], due: "today-due", dueText: "Today" },
        { id: "NB-205", title: "Biometric fallback flow", prio: "tp-med", tags: ["tt-fe"], sub: { done: 1, total: 3 }, avs: ["pav-3"], due: "", dueText: "May 14" },
        { id: "NB-207", title: "Session replay for support", prio: "tp-low", tags: ["tt-be", "tt-inf"], sub: null, avs: ["pav-4"], due: "", dueText: "May 17" },
      ]},
      { name: "REVIEW",      pill: "kp-rev", count: 2, cards: [
        { id: "NB-210", title: "JWT expiry edge case fix", prio: "tp-high", tags: ["tt-be"], sub: { done: 3, total: 3 }, avs: ["pav-5"], due: "", dueText: "May 12" },
        { id: "NB-212", title: "Auth middleware unit tests", prio: "tp-low", tags: ["tt-be"], sub: null, avs: ["pav-2"], due: "", dueText: "May 13" },
      ]},
      { name: "DONE",        pill: "kp-done", count: 3, cards: [
        { id: "NB-185", title: "OAuth 2.0 provider integration", prio: "tp-low", tags: ["tt-be"], sub: { done: 5, total: 5 }, avs: ["pav-1"], due: "", dueText: "May 8" },
        { id: "NB-190", title: "MFA code generation", prio: "tp-med", tags: ["tt-be"], sub: null, avs: ["pav-6"], due: "", dueText: "May 9" },
        { id: "NB-195", title: "Session persistence store", prio: "tp-low", tags: ["tt-inf"], sub: { done: 4, total: 4 }, avs: ["pav-3"], due: "", dueText: "May 10" },
      ]},
    ],
  },
  {
    name: "Round-up Savings",
    color: "var(--orange)",
    pts: "28 pts",
    frac: "5 / 10",
    prog: 50,
    sprint: "Sprint 14",
    cols: [
      { name: "TO DO",      pill: "kp-todo", count: 2, cards: [
        { id: "NB-221", title: "Savings goal creation UI", prio: "tp-med", tags: ["tt-fe", "tt-des"], sub: null, avs: ["pav-3"], due: "", dueText: "May 18" },
        { id: "NB-222", title: "Weekly summary email template", prio: "tp-low", tags: ["tt-fe"], sub: null, avs: ["pav-4"], due: "", dueText: "May 19" },
      ]},
      { name: "IN PROGRESS", pill: "kp-prog", count: 2, cards: [
        { id: "NB-216", title: "Round-up calculation engine", prio: "tp-high", tags: ["tt-be"], sub: { done: 3, total: 6 }, avs: ["pav-1", "pav-5"], due: "today-due", dueText: "Today" },
        { id: "NB-217", title: "Celebration animation", prio: "tp-med", tags: ["tt-fe"], sub: { done: 1, total: 3 }, avs: ["pav-3"], due: "", dueText: "May 15" },
      ]},
      { name: "REVIEW",      pill: "kp-rev", count: 1, cards: [
        { id: "NB-214", title: "Round-up transaction ledger API", prio: "tp-high", tags: ["tt-be"], sub: { done: 4, total: 4 }, avs: ["pav-2"], due: "", dueText: "May 13" },
      ]},
      { name: "DONE",        pill: "kp-done", count: 5, cards: [
        { id: "NB-200", title: "Round-up algorithm design", prio: "tp-low", tags: ["tt-be"], sub: null, avs: ["pav-6"], due: "", dueText: "May 5" },
        { id: "NB-203", title: "Savings account model", prio: "tp-med", tags: ["tt-be"], sub: { done: 3, total: 3 }, avs: ["pav-1"], due: "", dueText: "May 6" },
      ]},
    ],
  },
  {
    name: "Onboarding & Activation",
    color: "var(--green)",
    pts: "22 pts",
    frac: "9 / 14",
    prog: 64,
    sprint: "Sprint 13",
    cols: [
      { name: "TO DO",      pill: "kp-todo", count: 1, cards: [
        { id: "NB-225", title: "Accessibility audit — onboarding flow", prio: "tp-med", tags: ["tt-fe"], sub: null, avs: ["pav-4"], due: "", dueText: "May 20" },
      ]},
      { name: "IN PROGRESS", pill: "kp-prog", count: 2, cards: [
        { id: "NB-220", title: "Onboarding copy final review", prio: "tp-med", tags: ["tt-des"], sub: { done: 2, total: 5 }, avs: ["pav-3", "pav-4"], due: "", dueText: "May 14" },
        { id: "NB-223", title: "KYC document upload UI", prio: "tp-high", tags: ["tt-fe"], sub: { done: 1, total: 4 }, avs: ["pav-5"], due: "", dueText: "May 15" },
      ]},
      { name: "REVIEW",      pill: "kp-rev", count: 2, cards: [
        { id: "NB-219", title: "Activation email flow", prio: "tp-med", tags: ["tt-be", "tt-fe"], sub: { done: 3, total: 3 }, avs: ["pav-2"], due: "", dueText: "May 11" },
        { id: "NB-211", title: "Welcome screen A/B variants", prio: "tp-low", tags: ["tt-des"], sub: null, avs: ["pav-3"], due: "", dueText: "May 12" },
      ]},
      { name: "DONE",        pill: "kp-done", count: 9, cards: [
        { id: "NB-178", title: "Onboarding step progress bar", prio: "tp-low", tags: ["tt-fe"], sub: null, avs: ["pav-1"], due: "", dueText: "Apr 28" },
        { id: "NB-181", title: "Identity verification flow", prio: "tp-high", tags: ["tt-be"], sub: { done: 6, total: 6 }, avs: ["pav-2"], due: "", dueText: "May 2" },
      ]},
    ],
  },
  {
    name: "Wire Transfers",
    color: "var(--purple)",
    pts: "18 pts",
    frac: "3 / 11",
    prog: 27,
    sprint: "Sprint 15",
    cols: [
      { name: "TO DO",      pill: "kp-todo", count: 5, cards: [
        { id: "NB-230", title: "International wire routing logic", prio: "tp-high", tags: ["tt-be"], sub: null, avs: ["pav-6"], due: "", dueText: "May 22" },
        { id: "NB-231", title: "Fee disclosure screen", prio: "tp-med", tags: ["tt-fe", "tt-des"], sub: null, avs: ["pav-3"], due: "", dueText: "May 23" },
      ]},
      { name: "IN PROGRESS", pill: "kp-prog", count: 2, cards: [
        { id: "NB-226", title: "Wire transfer error states", prio: "tp-high", tags: ["tt-fe", "tt-bug"], sub: { done: 2, total: 5 }, avs: ["pav-5", "pav-6"], due: "overdue", dueText: "3d ago" },
        { id: "NB-228", title: "Transfer confirmation email", prio: "tp-med", tags: ["tt-be"], sub: null, avs: ["pav-4"], due: "", dueText: "May 16" },
      ]},
      { name: "REVIEW",      pill: "kp-rev", count: 1, cards: [
        { id: "NB-224", title: "Swift code validator", prio: "tp-med", tags: ["tt-be"], sub: { done: 2, total: 2 }, avs: ["pav-2"], due: "", dueText: "May 12" },
      ]},
      { name: "DONE",        pill: "kp-done", count: 3, cards: [
        { id: "NB-215", title: "Wire transfer data model", prio: "tp-low", tags: ["tt-be"], sub: null, avs: ["pav-1"], due: "", dueText: "May 7" },
        { id: "NB-213", title: "Beneficiary management", prio: "tp-med", tags: ["tt-fe"], sub: { done: 4, total: 4 }, avs: ["pav-3"], due: "", dueText: "May 8" },
      ]},
    ],
  },
];

// ─── Story descriptions ───────────────────────────────────────────────────────

const STORY_DESCRIPTIONS: Record<string, string> = {
  "Auth & Sessions":
    `<p>Covers all authentication, session management, and security work for the Nova Banking app.</p><p><strong>Goals for Sprint 14:</strong></p><ul><li>Implement secure refresh token rotation per RFC 6819</li><li>Add biometric authentication fallback flow</li><li>Set up session replay tooling for support escalations</li><li>Harden JWT expiry and edge case handling</li></ul>`,
  "Round-up Savings":
    `<p>The round-up feature rounds every transaction up to the nearest dollar and deposits the difference into a savings goal.</p><p><strong>Goals for Sprint 14:</strong></p><ul><li>Build the core round-up calculation engine</li><li>Implement savings goal creation UI and milestone tracking</li><li>Add celebration animation on goal completion</li><li>Ship transaction ledger API for audit trail</li></ul>`,
  "Onboarding & Activation":
    `<p>End-to-end onboarding flow covering identity verification, KYC, and first-time user activation.</p><p><strong>Sprint 13 focus:</strong></p><ul><li>KYC document upload and validation</li><li>Welcome screen A/B variants for conversion testing</li><li>Activation email flow and deep-link handling</li><li>Accessibility audit on all onboarding screens</li></ul>`,
  "Wire Transfers":
    `<p>Domestic and international wire transfer functionality with fee disclosure, SWIFT routing, and beneficiary management.</p><p><strong>Sprint 15 scope:</strong></p><ul><li>International wire routing logic and SWIFT code validation</li><li>Fee disclosure screen before transfer confirmation</li><li>Error states and recovery flows for failed transfers</li></ul>`,
};

// ─── Story Panel ──────────────────────────────────────────────────────────────

type StoryGroup = typeof STORY_GROUPS[0];

function StoryPanel({
  story, onClose, projectName,
}: {
  story: StoryGroup | null;
  onClose: () => void;
  projectName?: string;
}) {
  const [editing, setEditing]   = useState(false);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");

  if (!story) return null;
  const sg = story;

  const initialDesc = STORY_DESCRIPTIONS[sg.name] ?? "<p>No description yet.</p>";
  const currentDesc = editing ? desc : (desc || initialDesc);

  const totalCards = sg.cols.reduce((s, c) => s + c.cards.length, 0);
  const doneCol    = sg.cols.find(c => c.name === "DONE");
  const doneCount  = doneCol?.cards.length ?? 0;

  function startEdit() {
    setTitle(sg.name);
    setDesc(desc || initialDesc);
    setEditing(true);
  }

  function saveEdit() {
    setEditing(false);
  }

  return (
    <>
      <div className="tp-backdrop open" onClick={onClose} />
      <aside className="task-panel open">
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
            <span className="tp-crumb-id" style={{ color: "var(--proj-text-2)" }}>{sg.name}</span>
          </div>
          <div className="tp-head-actions">
            {editing
              ? <>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={saveEdit}>Save</button>
                  <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => setEditing(false)}>Cancel</button>
                </>
              : <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={startEdit}>Edit</button>
            }
            <button className="proj-icon-btn" onClick={onClose} title="Close"><IClose /></button>
          </div>
        </div>

        <div className="tp-body">
          <div className="tp-main">
            <div className="tp-status-row">
              <div className="tp-mini-chip" style={{ background: sg.color + "18", color: sg.color, border: `1px solid ${sg.color}40` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sg.color, display: "inline-block", marginRight: 4 }} />
                Story
              </div>
              <div className="tp-mini-chip">{sg.sprint}</div>
              <div className="tp-pts">{sg.pts}</div>
            </div>

            {editing ? (
              <input
                className="cs-input"
                style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12, padding: "8px 10px" }}
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h2 className="tp-title">{title || sg.name}</h2>
            )}

            {/* Progress */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--proj-text-3)", marginBottom: 6 }}>
                <span>Progress</span>
                <span>{sg.frac} tasks · {sg.prog}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--proj-surface-3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: sg.prog + "%", background: sg.color, borderRadius: 3, transition: "width 0.4s" }} />
              </div>
            </div>

            <div className="tp-sec-name">Description</div>
            {editing
              ? <RichEditor
                  content={currentDesc}
                  editable
                  onChange={setDesc}
                  minHeight={160}
                />
              : <RichEditor
                  content={currentDesc}
                  editable={false}
                />
            }

            <div className="tp-sec-name" style={{ marginTop: 20 }}>Tasks by status</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {sg.cols.map(col => (
                <div key={col.name} style={{
                  background: "var(--proj-surface-2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--proj-text)" }}>{col.cards.length}</div>
                  <div style={{ fontSize: 10.5, color: "var(--proj-text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{col.name}</div>
                </div>
              ))}
            </div>

            <div className="tp-sec-name">All tasks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sg.cols.flatMap(col =>
                col.cards.map(card => (
                  <div key={card.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px",
                    borderRadius: 7,
                    background: "var(--proj-surface)",
                    border: "1px solid var(--proj-line)",
                    fontSize: 12.5,
                  }}>
                    <span className={"k-pill " + col.pill} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--proj-mono)", fontSize: 10.5, color: "var(--proj-text-4)", flexShrink: 0 }}>{card.id}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--proj-text)" }}>{card.title}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {card.tags.map(t => <span key={t} className={"t-tag " + t} style={{ fontSize: 10 }}>{t.replace("tt-","")}</span>)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tp-side">
            <div className="tp-side-row">
              <div className="tp-side-label">Sprint</div>
              <div className="tp-side-val">{sg.sprint}</div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Story points</div>
              <div className="tp-side-val">{sg.pts}</div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Completed</div>
              <div className="tp-side-val">{doneCount} / {totalCards}</div>
            </div>
            <div className="tp-side-row">
              <div className="tp-side-label">Progress</div>
              <div className="tp-side-val">{sg.prog}%</div>
            </div>
            <div className="tp-sep" />
            <div className="tp-side-row">
              <div className="tp-side-label">Columns</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sg.cols.map(col => (
                  <div key={col.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span className={"k-pill " + col.pill} />
                    <span style={{ color: "var(--proj-text-2)", flex: 1 }}>{col.name}</span>
                    <span style={{ fontWeight: 600, color: "var(--proj-text)" }}>{col.cards.length}</span>
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

// ─── Sprint Story Detail Panel ────────────────────────────────────────────────

const PANEL_OWNERS = [
  { initials: "AS", name: "Aanya Sharma",   color: "#338EF7" },
  { initials: "RK", name: "Rakesh Kumar",   color: "#F97316" },
  { initials: "MP", name: "Mira Patel",     color: "#9353D3" },
  { initials: "JL", name: "Jaya Lakshmi",   color: "#17C964" },
  { initials: "DT", name: "Dev Tiwari",     color: "#F31260" },
  { initials: "LP", name: "Lakshmi Prasad", color: "#F5A524" },
];
const DEFAULT_OWNERS: Record<string, string> = {
  "NB-S14-1": "Aanya Sharma",
  "NB-S14-2": "Rakesh Kumar",
};

function SprintStoryPanel({
  story, children, sprintName, allSprints, color, onClose, onStatusChange, projectName,
}: {
  story: BLItem | null;
  children: BLItem[];
  sprintName: string;
  allSprints: BLSprintData[];
  color: string;
  onClose: () => void;
  onStatusChange?: (itemId: string, status: BLStatus) => void;
  projectName?: string;
}) {
  const [editing, setEditing]         = useState(false);
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("<p>No description yet. Click Edit to add one.</p>");
  const [openStatus, setOpenStatus]   = useState<string | null>(null);
  const [storyStatus, setStoryStatus] = useState<BLStatus>(story?.status ?? "todo");
  const [ownerName, setOwnerName]     = useState(story ? (DEFAULT_OWNERS[story.id] ?? "Aanya Sharma") : "Aanya Sharma");
  const [sprint, setSprint]           = useState(sprintName);
  const [pts, setPts]                 = useState<number>(story ? ((story.pts ?? 0) + children.reduce((a, c) => a + (c.pts ?? 0), 0)) : 0);
  const [priority, setPriority]       = useState("High");
  const [openField, setOpenField]     = useState<"status"|"priority"|"owner"|"sprint"|"pts"|null>(null);

  if (!story) return null;

  const done  = children.filter(c => c.status === "done").length;
  const total = children.length;
  const prog  = total > 0 ? Math.round(done / total * 100) : 0;
  const owner = PANEL_OWNERS.find(o => o.name === ownerName) ?? PANEL_OWNERS[0];

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
      <div className="tp-backdrop open" onClick={onClose} />
      <aside className="task-panel open" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span style={{ color: "var(--proj-text-3)", fontSize: 12 }}>{sprintName}</span>
            <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
            <span className="tp-crumb-id" style={{ color: color }}>{story.id}</span>
          </div>
          <div className="tp-head-actions">
            {editing
              ? <>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={() => setEditing(false)}>Save</button>
                  <button className="proj-btn-ghost"   style={{ padding: "5px 10px",  fontSize: 11.5 }} onClick={() => setEditing(false)}>Cancel</button>
                </>
              : <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => { setTitle(story.title); setEditing(true); }}>Edit</button>
            }
            <button className="proj-icon-btn" onClick={onClose} title="Close"><IClose /></button>
          </div>
        </div>

        <div className="tp-body">
          <div className="tp-main">

            {/* Status · Priority · pts · Sprint row — all editable */}
            <div className="tp-status-row" style={{ flexWrap: "wrap", gap: 6 }} onClick={() => setOpenField(null)}>

              {/* Story type — static */}
              <div className="tp-mini-chip" style={{ background: color + "18", color, border: `1px solid ${color}40` }}>
                <IFlag style={{ width: 10, height: 10, marginRight: 4 }} />
                Story
              </div>

              {/* Status */}
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
                <button className="tp-mini-chip" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: STATUS_COLORS[storyStatus], background: STATUS_COLORS[storyStatus] + "18", border: `1px solid ${STATUS_COLORS[storyStatus]}44` }}
                  onClick={() => setOpenField(openField === "status" ? null : "status")}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[storyStatus], flexShrink: 0 }} />
                  {STATUS_LABELS[storyStatus]} <IChevDown style={{ width: 9, height: 9 }} />
                </button>
                {openField === "status" && (
                  <div className="sb-status-drop">
                    {(Object.keys(BL_STATUS_CFG) as BLStatus[]).map(s => (
                      <button key={s} className={"sb-status-opt" + (s === storyStatus ? " active" : "")}
                        style={{ color: STATUS_COLORS[s] }}
                        onClick={() => { setStoryStatus(s); setOpenField(null); }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
                <button className="tp-mini-chip" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: PRIO_COLORS[priority], background: PRIO_COLORS[priority] + "18", border: `1px solid ${PRIO_COLORS[priority]}44` }}
                  onClick={() => setOpenField(openField === "priority" ? null : "priority")}>
                  <IFlag style={{ width: 9, height: 9 }} />
                  {priority} <IChevDown style={{ width: 9, height: 9 }} />
                </button>
                {openField === "priority" && (
                  <div className="sb-status-drop">
                    {PRIORITY_OPTS.map(p => (
                      <button key={p} className={"sb-status-opt" + (p === priority ? " active" : "")}
                        style={{ color: PRIO_COLORS[p] }}
                        onClick={() => { setPriority(p); setOpenField(null); }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Story pts */}
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
                {openField === "pts"
                  ? <input type="number" min={0} max={99}
                      className="tp-mini-chip"
                      style={{ width: 64, cursor: "text", textAlign: "center" }}
                      value={pts}
                      onChange={e => setPts(Number(e.target.value))}
                      onBlur={() => setOpenField(null)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setOpenField(null); }}
                      autoFocus
                    />
                  : <button className="tp-mini-chip" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                      onClick={() => setOpenField("pts")}>
                      {pts} pts <IChevDown style={{ width: 9, height: 9 }} />
                    </button>
                }
              </div>

              {/* Sprint */}
              <div className="sb-status-wrap" onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
                <button className="tp-mini-chip" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                  onClick={() => setOpenField(openField === "sprint" ? null : "sprint")}>
                  {sprint} <IChevDown style={{ width: 9, height: 9 }} />
                </button>
                {openField === "sprint" && (
                  <div className="sb-status-drop" style={{ width: 160 }}>
                    {allSprints.map(s => (
                      <button key={s.id} className={"sb-status-opt" + (s.name === sprint ? " active" : "")}
                        style={{ color: "var(--proj-text)" }}
                        onClick={() => { setSprint(s.name); setOpenField(null); }}>
                        {s.name}{s.active ? " (active)" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Title */}
            {editing
              ? <input
                  className="cs-input"
                  style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12, padding: "8px 10px" }}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              : <h2 className="tp-title">{title || story.title}</h2>
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

            {/* Description */}
            <div className="tp-sec-name">Description</div>
            <RichEditor content={desc} editable={editing} onChange={setDesc} minHeight={editing ? 140 : undefined} />

            {/* Sub-tasks */}
            <div className="tp-sec-name" style={{ marginTop: 20 }}>
              Sub-tasks
              <span style={{ marginLeft: 8, fontFamily: "var(--proj-mono)", fontSize: 11, color: "var(--proj-text-4)", fontWeight: 400 }}>{done} / {total}</span>
            </div>

            {total === 0 ? (
              <div style={{ color: "var(--proj-text-4)", fontSize: 13, padding: "12px 0" }}>No tasks yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }} onClick={e => e.stopPropagation()}>
                {children.map(child => {
                  const sc = STATUS_COLORS[child.status];
                  const isDone = child.status === "done";
                  return (
                    <div key={child.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--proj-surface)",
                      border: "1px solid var(--proj-line)",
                      opacity: isDone ? 0.6 : 1,
                    }}>
                      {/* done circle */}
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${sc}`,
                        background: isDone ? sc : "transparent",
                        display: "grid", placeItems: "center",
                      }}>
                        {isDone && <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>}
                      </div>

                      <span className={"t-tag " + BL_TYPE_TAG[child.type]} style={{ fontSize: 10, flexShrink: 0 }}>{TYPE_LABEL[child.type]}</span>
                      <span style={{ fontFamily: "var(--proj-mono)", fontSize: 10.5, color: "var(--proj-text-4)", flexShrink: 0 }}>{child.id}</span>
                      <span style={{ flex: 1, fontSize: 12.5, color: "var(--proj-text)", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.title}</span>

                      {/* inline status */}
                      <div style={{ flexShrink: 0 }}>
                        <BLStatusPill
                          status={child.status} itemId={child.id}
                          openFor={openStatus} onOpen={setOpenStatus}
                          onChange={s => { onStatusChange?.(child.id, s); setOpenStatus(null); }}
                        />
                      </div>

                      {child.pts && <span className="sb-pts" style={{ flexShrink: 0 }}>{child.pts}</span>}
                      {child.due && <span style={{ fontSize: 11, color: "var(--proj-text-4)", flexShrink: 0 }}>{child.due}</span>}
                    </div>
                  );
                })}
              </div>
            )}

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
                        onClick={() => { setStoryStatus(s); setOpenField(null); }}>
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
                        onClick={() => { setPriority(p); setOpenField(null); }}>
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
                    {PANEL_OWNERS.map(o => (
                      <button key={o.name} className={"sb-status-opt" + (o.name === ownerName ? " active" : "")}
                        style={{ color: "var(--proj-text)", display: "flex", alignItems: "center", gap: 7 }}
                        onClick={() => { setOwnerName(o.name); setOpenField(null); }}>
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
                        onClick={() => { setSprint(s.name); setOpenField(null); }}>
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
                      onBlur={() => setOpenField(null)}
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
    </>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

const SPRINT_STORY_COLORS = ["var(--blue)", "var(--purple)", "var(--orange)", "var(--green)", "var(--amber)"];

function BoardTab({ onOpenPanel, onOpenCreate, activeSprint, allSprints, onSprintStatusChange, onCompleteSprint, projectName }: {
  onOpenPanel: () => void;
  onOpenCreate: () => void;
  activeSprint?: BLSprintData;
  allSprints: BLSprintData[];
  onSprintStatusChange?: (itemId: string, status: BLStatus) => void;
  onCompleteSprint?: (sprintId: string) => void;
  projectName?: string;
}) {
  const [groups, setGroups] = useState(() =>
    STORY_GROUPS.map(sg => ({
      ...sg,
      cols: sg.cols.map(col => ({ ...col, cards: [...col.cards] })),
    }))
  );
  const [collapsed, setCollapsed]             = useState<Record<string, boolean>>({});
  const [dragOverKey, setDragOverKey]         = useState<string | null>(null);
  const [draggingId, setDraggingId]           = useState<string | null>(null);
  const [openStory, setOpenStory]             = useState<StoryGroup | null>(null);
  const [openStoryStatus, setOpenStoryStatus] = useState<string | null>(null);
  const [openSprintStory, setOpenSprintStory] = useState<{ story: BLItem; color: string } | null>(null);
  // Sprint card drag state (separate from static STORY_GROUPS drag)
  const [sprintDragId,   setSprintDragId]   = useState<string | null>(null);
  const [sprintDragOver, setSprintDragOver] = useState<string | null>(null);
  const dragSrc = useRef<{ gi: number; ci: number; ki: number } | null>(null);

  function handleDragStart(gi: number, ci: number, ki: number, cardId: string) {
    dragSrc.current = { gi, ci, ki };
    setDraggingId(cardId);
  }

  function handleDragOver(e: React.DragEvent, gi: number, ci: number) {
    e.preventDefault();
    setDragOverKey(`${gi}-${ci}`);
  }

  function handleDrop(e: React.DragEvent, targetGi: number, targetCi: number) {
    e.preventDefault();
    setDragOverKey(null);
    setDraggingId(null);
    const src = dragSrc.current;
    dragSrc.current = null;
    if (!src) return;
    const { gi, ci, ki } = src;
    if (gi === targetGi && ci === targetCi) return;

    setGroups(prev => {
      const next = prev.map(sg => ({
        ...sg,
        cols: sg.cols.map(col => ({ ...col, cards: [...col.cards] })),
      }));
      const [card] = next[gi].cols[ci].cards.splice(ki, 1);
      next[gi].cols[ci].count  = next[gi].cols[ci].cards.length;
      next[targetGi].cols[targetCi].cards.push(card);
      next[targetGi].cols[targetCi].count = next[targetGi].cols[targetCi].cards.length;
      return next;
    });
  }

  function handleDragEnd() {
    setDragOverKey(null);
    setDraggingId(null);
    dragSrc.current = null;
  }

  function renderBoardCard(card: ReturnType<typeof blItemToCard>) {
    const dragging = sprintDragId === card.id;
    return (
      <div key={card.id}
        className={"t-card " + card.prio + (dragging ? " dragging" : "")}
        draggable
        onDragStart={() => setSprintDragId(card.id)}
        onDragEnd={() => { setSprintDragId(null); setSprintDragOver(null); }}
        onClick={onOpenPanel}
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
                {col.items.map(item => renderBoardCard(blItemToCard(item)))}
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
                : groups.map(g => g.name);
              const anyOpen = allKeys.some(k => !collapsed[k]);
              setCollapsed(anyOpen ? Object.fromEntries(allKeys.map(k => [k, true])) : {});
            }}>
              {(() => {
                const allKeys = activeSprint
                  ? activeSprint.items.filter(i => i.type === "story").map(i => i.id)
                  : groups.map(g => g.name);
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

          {/* ── Static story groups — only when no active sprint ── */}
          {!activeSprint && groups.map((sg, gi) => {
            const isCollapsed = !!collapsed[sg.name];
            return (
              <div key={sg.name} className={"story-group" + (isCollapsed ? " collapsed" : "")}
                style={{ "--sg-color": sg.color } as React.CSSProperties}>
                <div className="story-header" onClick={() => setCollapsed(p => ({ ...p, [sg.name]: !p[sg.name] }))}>
                  <div className="story-toggle"><IChevDown /></div>
                  <span className="story-name" onClick={e => { e.stopPropagation(); setOpenStory(sg); }} style={{ cursor: "pointer" }}>{sg.name}</span>
                  <span className="story-pts">{sg.pts}</span>
                  <div className="story-mini-prog"><div style={{ width: sg.prog + "%" }} /></div>
                  <span className="story-frac">{sg.frac}</span>
                  <div className="story-meta-end">
                    <span className="mini-chip">{sg.sprint}</span>
                    <span className="mini-chip">{sg.frac.split("/")[1].trim()} tasks</span>
                  </div>
                </div>
                <div className="story-cols">
                  {sg.cols.map((col, ci) => {
                    const colKey = `${gi}-${ci}`;
                    return (
                      <div key={col.name} className="k-col">
                        <div className="k-col-head">
                          <span className={"k-pill " + col.pill} />
                          <span className="k-col-name">{col.name}</span>
                          <span className="k-col-count">{col.count}</span>
                          <button className="k-col-add" onClick={e => { e.stopPropagation(); onOpenCreate(); }}><IPlus /></button>
                        </div>
                        <div
                          className={"k-col-body" + (dragOverKey === colKey ? " drag-over" : "")}
                          onDragOver={e => handleDragOver(e, gi, ci)}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={e => handleDrop(e, gi, ci)}
                        >
                          {col.cards.map((card, ki) => (
                            <div
                              key={card.id}
                              className={"t-card " + card.prio + (draggingId === card.id ? " dragging" : "")}
                              draggable
                              onDragStart={() => handleDragStart(gi, ci, ki, card.id)}
                              onDragEnd={handleDragEnd}
                              onClick={onOpenPanel}
                            >
                              <div className="t-meta-row">
                                <span className="t-id">{card.id}</span>
                                <div className="t-tags">{card.tags.map(t => <span key={t} className={"t-tag " + t}>{t.replace("tt-", "")}</span>)}</div>
                              </div>
                              <div className="t-title">{card.title}</div>
                              {card.sub && (
                                <div className="t-sub">
                                  <span>{card.sub.done}/{card.sub.total} subtasks</span>
                                  <div className="t-sub-bar"><div style={{ width: `${(card.sub.done / card.sub.total) * 100}%` }} /></div>
                                </div>
                              )}
                              <div className="t-foot">
                                <div className="pavs">
                                  {card.avs.map(av => <div key={av} className={"pav pav-sm " + av} />)}
                                </div>
                                <div className={"t-due " + card.due}>{card.dueText}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <StoryPanel story={openStory} onClose={() => setOpenStory(null)} projectName={projectName} />
      {openSprintStory && activeSprint && (
        <SprintStoryPanel
          story={openSprintStory.story}
          children={activeSprint.items.filter(i => i.parentStoryId === openSprintStory.story.id)}
          sprintName={activeSprint.name}
          allSprints={allSprints}
          color={openSprintStory.color}
          onClose={() => setOpenSprintStory(null)}
          onStatusChange={onSprintStatusChange}
          projectName={projectName}
        />
      )}
    </div>
  );
}

// ─── BACKLOG TAB ──────────────────────────────────────────────────────────────

type BLStatus = "todo" | "in-progress" | "in-review" | "done";
type BLType   = "task" | "story" | "bug";

interface BLItem {
  id: string; title: string; type: BLType; status: BLStatus;
  due?: string; pts?: number; hasSubtasks?: boolean;
  parentStoryId?: string;
}
interface BLSprintData {
  id: string; name: string; startDate?: string; endDate?: string;
  active: boolean; items: BLItem[];
}

const BL_STATUS_CFG: Record<BLStatus, { label: string; color: string }> = {
  "todo":        { label: "To Do",       color: "#9A9FAB" },
  "in-progress": { label: "In Progress", color: "#338EF7" },
  "in-review":   { label: "In Review",   color: "#F5A524" },
  "done":        { label: "Done",        color: "#17C964" },
};

const BL_SPRINTS_INIT: BLSprintData[] = [
  {
    id: "s14", name: "Sprint 14", startDate: "2025-05-06", endDate: "2025-05-19", active: true,
    items: [
      // Stories
      { id: "NB-S14-1", type: "story", title: "Auth & Sessions",     status: "in-progress", pts: 8 },
      { id: "NB-S14-2", type: "story", title: "Round-up Savings",    status: "todo",        pts: 5 },
      // Tasks under Auth & Sessions
      { id: "NB-218", type: "task", title: "Auth refactor — refresh token rotation logic", parentStoryId: "NB-S14-1", status: "in-progress", due: "May 16", pts: 3, hasSubtasks: true },
      { id: "NB-226", type: "bug",  title: "Wire transfer error states and recovery flow",  parentStoryId: "NB-S14-1", status: "in-review",   due: "May 21", pts: 3 },
      { id: "NB-205", type: "task", title: "Biometric fallback flow",                       parentStoryId: "NB-S14-1", status: "todo",        due: "May 14", pts: 2 },
      // Tasks under Round-up Savings
      { id: "NB-216", type: "task", title: "Round-up calculation engine and edge cases",    parentStoryId: "NB-S14-2", status: "todo",        due: "May 19", pts: 5 },
      { id: "NB-217", type: "task", title: "Savings goal creation UI",                      parentStoryId: "NB-S14-2", status: "in-progress", due: "May 18", pts: 3 },
      // Orphan task (no parent story)
      { id: "NB-223", type: "task", title: "KYC document upload and validation UI", status: "todo", pts: 3 },
    ],
  },
  { id: "s15", name: "Sprint 15", active: false, items: [] },
];

const BL_BACKLOG_INIT: BLItem[] = [
  // Story + children
  { id: "NB-230", type: "story", title: "International wire routing — SWIFT integration", status: "todo", pts: 8 },
  { id: "NB-231", type: "task",  title: "Fee disclosure screen before wire confirmation", status: "todo", pts: 2, parentStoryId: "NB-230" },
  { id: "NB-233", type: "task",  title: "SWIFT code validator and routing logic",         status: "todo", pts: 3, parentStoryId: "NB-230" },
  { id: "NB-234", type: "bug",   title: "Wire confirmation email missing beneficiary name", status: "todo", pts: 1, parentStoryId: "NB-230" },

  // Story + children
  { id: "NB-221", type: "story", title: "Savings goal creation and milestone tracking",   status: "todo", pts: 5 },
  { id: "NB-242", type: "task",  title: "Push notification preferences and scheduling",   status: "todo",         parentStoryId: "NB-221" },
  { id: "NB-243", type: "task",  title: "Savings milestone celebration animation",        status: "todo", pts: 2, parentStoryId: "NB-221" },

  // Standalone items
  { id: "NB-225", type: "task",  title: "Accessibility audit — onboarding screens",       status: "todo", pts: 3 },
  { id: "NB-240", type: "bug",   title: "Card freeze / unfreeze — real-time card control", status: "todo" },
  { id: "NB-250", type: "story", title: "Cryptocurrency wallet integration",               status: "todo", pts: 13 },
  { id: "NB-252", type: "story", title: "Investment portfolio view (read-only)",           status: "todo", pts: 8 },
];

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

const BL_TYPE_TAG: Record<BLType, string> = { task: "tt-fe", story: "tt-be", bug: "tt-bug" };
function blPrio(pts?: number): "tp-high" | "tp-med" | "tp-low" {
  if (pts && pts >= 5) return "tp-high";
  if (pts && pts >= 2) return "tp-med";
  return "tp-low";
}
function blItemToCard(item: BLItem) {
  return {
    id: item.id, title: item.title,
    prio: blPrio(item.pts) as "tp-high" | "tp-med" | "tp-low",
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
      className={"t-card sb-card " + blPrio(item.pts) + (dragging ? " dragging" : "") + (isChild ? " sb-child-row" : "")}
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

function BacklogTab({ onOpenPanel, sprints, setSprints, backlog, setBacklog, onCompleteSprint }: {
  onOpenPanel: () => void;
  sprints: BLSprintData[]; setSprints: React.Dispatch<React.SetStateAction<BLSprintData[]>>;
  backlog: BLItem[];       setBacklog: React.Dispatch<React.SetStateAction<BLItem[]>>;
  onCompleteSprint: (sprintId: string) => void;
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
  const nextId  = useRef(300);

  function toggle(id: string) { setCollapsed(p => ({ ...p, [id]: !p[id] })); }

  function setStatus(sectionId: string, itemId: string, s: BLStatus) {
    if (sectionId === "backlog") {
      setBacklog(p => p.map(i => i.id === itemId ? { ...i, status: s } : i));
    } else {
      setSprints(p => p.map(sp => sp.id !== sectionId ? sp
        : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status: s } : i) }));
    }
  }

  function addItem(sectionId: string, title: string, type: BLType) {
    const item: BLItem = { id: `NB-${nextId.current++}`, title, type, status: "todo" };
    if (sectionId === "backlog") setBacklog(p => [...p, item]);
    else setSprints(p => p.map(sp => sp.id !== sectionId ? sp : { ...sp, items: [...sp.items, item] }));
    setCreateIn(null);
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
  }

  function saveDates(sprintId: string, start: string, end: string) {
    const fmt = (d: string) => {
      if (!d) return undefined;
      const [, m, day] = d.split("-");
      const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[Number(m)]} ${Number(day)}`;
    };
    setSprints(p => p.map(s => s.id !== sprintId ? s
      : { ...s, startDate: fmt(start), endDate: fmt(end) }));
    setAddDatesFor(null);
  }

  function doStartSprint(sprintId: string) {
    setSprints(p => p.map(s => s.id !== sprintId ? s : { ...s, active: true }));
    setStartFor(null);
  }

  function createSprint() {
    const n = sprints.length + 14;
    setSprints(p => [...p, { id: `s${Date.now()}`, name: `Sprint ${n}`, active: false, items: [] }]);
  }

  function filterItems(items: BLItem[]) {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }

  function renderTreeItems(items: BLItem[], sectionId: string) {
    const childIdSet = new Set(items.filter(i => i.parentStoryId).map(i => i.id));
    const rows: React.ReactNode[] = [];

    items.forEach(item => {
      if (childIdSet.has(item.id)) return; // rendered under parent

      if (item.type === "story") {
        const children   = items.filter(c => c.parentStoryId === item.id);
        const isExp      = expandedStories[item.id] !== false; // default expanded
        rows.push(
          <BLItemRow key={item.id} item={item}
            openStatus={openStatus} onOpenStatus={setOpenStatus}
            onStatusChange={(id, s) => setStatus(sectionId, id, s)}
            dragging={draggingId === item.id}
            onDragStart={() => onDragStart(sectionId, items.indexOf(item), item.id)}
            onDragEnd={onDragEnd}
            onOpenPanel={onOpenPanel}
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
                onDragStart={() => onDragStart(sectionId, items.indexOf(child), child.id)}
                onDragEnd={onDragEnd}
                onOpenPanel={onOpenPanel}
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
            onDragStart={() => onDragStart(sectionId, items.indexOf(item), item.id)}
            onDragEnd={onDragEnd}
            onOpenPanel={onOpenPanel}
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
                    setAddDatesFor({ sprintId: sprint.id, start: sprint.startDate ?? "", end: sprint.endDate ?? "" });
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
                      ? <div className="sb-empty">Plan a sprint by dragging work items here, or drag the sprint footer.</div>
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

const MONTHS = ["FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN"];
const GANTT_ROWS = [
  { emoji: "🔑", label: "Auth & Sessions",       dot: "var(--blue)",   cls: "gb-1", start: "0%",   width: "41.6%"  },
  { emoji: "💰", label: "Round-up Savings",       dot: "var(--orange)", cls: "gb-3", start: "16.6%",width: "41.6%"  },
  { emoji: "👋", label: "Onboarding & Activation",dot: "var(--green)",  cls: "gb-4", start: "8.3%", width: "50%"    },
  { emoji: "💸", label: "Wire Transfers",         dot: "var(--purple)", cls: "gb-2", start: "33.3%",width: "50%"    },
  { emoji: "🚀", label: "Launch & GTM",           dot: "var(--amber)",  cls: "gb-5", start: "66.6%",width: "33.4%"  },
];

function TimelineTab({ projectName }: { projectName?: string }) {
  return (
    <div className="pane active">
      <div className="roadmap-wrap">
        <div className="rm-toolbar">
          <span className="rm-title">Roadmap — {projectName ?? "Project"}</span>
          <button className="filter-chip"><IChevL style={{ width: 12, height: 12 }} /></button>
          <button className="filter-chip"><IChevR style={{ width: 12, height: 12 }} /></button>
          <button className="filter-chip">Year · 2025</button>
        </div>
        <div className="gantt">
          <div className="gantt-head">
            <div className="gh-label">Initiative</div>
            <div className="gh-months">
              {MONTHS.map((m, i) => (
                <div key={m} className={"gh-m" + (i === 3 ? " gh-now" : "")}>{m}</div>
              ))}
            </div>
          </div>
          <div className="gantt-body">
            {/* Now line at ~30% = May */}
            <div className="gantt-now-line" style={{ left: "calc(200px + (100% - 200px) * 0.30)" }} />
            {GANTT_ROWS.map((row) => (
              <div key={row.label} className="gantt-row">
                <div className="gr-label">
                  <span className="gr-dot" style={{ background: row.dot }} />
                  <span style={{ fontSize: 14 }}>{row.emoji}</span>
                  {row.label}
                </div>
                <div className="gantt-track">
                  <div className={"gantt-bar " + row.cls}
                    style={{ left: row.start, width: row.width }}>
                    {row.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rm-footnote">▲ Vertical line = today (May 11, 2025) · Bars span active sprints</div>
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

function TaskPanel({ open, onClose, projectName }: { open: boolean; onClose: () => void; projectName?: string }) {
  const [checked, setChecked]   = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: true, 5: true });
  const [editing, setEditing]   = useState(false);
  const [taskTitle, setTaskTitle] = useState("Auth refactor — refresh token rotation logic");
  const [taskStatus, setTaskStatus] = useState("In Progress");
  const [taskPrio, setTaskPrio] = useState("High");
  const [taskDesc, setTaskDesc] = useState(TASK_INITIAL_DESC);

  return (
    <>
      <div className={"tp-backdrop" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"task-panel" + (open ? " open" : "")}>
        <div className="tp-head">
          <div className="tp-crumb">
            <span className="tp-crumb-proj">{projectName ?? "Project"}</span>
            <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
            Auth &amp; Sessions
            <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
            <span className="tp-crumb-id">NB-218</span>
          </div>
          <div className="tp-head-actions">
            <button className="proj-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }}><IExtLink style={{ width: 12, height: 12 }} /> Open</button>
            {editing
              ? <>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={() => setEditing(false)}>Save</button>
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
            <div className="tp-status-row">
              {editing ? (
                <>
                  <select className="cs-select" style={{ height: 28, fontSize: 12 }} value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
                    {["To Do","In Progress","In Review","Done"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="cs-select" style={{ height: 28, fontSize: 12 }} value={taskPrio} onChange={e => setTaskPrio(e.target.value)}>
                    {["Highest","High","Medium","Low","Lowest"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <div className="tp-status-pill spp-prog"><span className="pp" />{taskStatus}</div>
                  <div className="tp-prio-pill"><IFlag style={{ width: 11, height: 11 }} /> {taskPrio}</div>
                </>
              )}
              <div className="tp-pts">8 pts</div>
              <div className="tp-mini-chip">Sprint 14</div>
            </div>

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
              ].map((s, i) => (
                <div key={i} className={"subtask-row" + (s.done ? " checked" : "")}
                  onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
                  <div className={"checkbox" + (s.done ? " checked" : "")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="subtask-name">{s.name}</span>
                  <span className="subtask-est">{s.est}</span>
                </div>
              ))}
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

            <div className="tp-compose">
              <div className="compose-head">
                <div className="pav pav-1" style={{ fontSize: 9, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center" }}>AS</div>
                <span className="compose-as">Add a comment…</span>
              </div>
              <textarea className="compose-area" placeholder="Write a comment or @mention a teammate…" />
              <div className="compose-actions">
                <div style={{ marginLeft: "auto" }}>
                  <button className="proj-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }}>Comment</button>
                </div>
              </div>
            </div>
          </div>

          <div className="tp-side">
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
              <div className="tp-side-val">Sprint 14</div>
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
              <div className="tp-side-val" style={{ color: "var(--red)", fontWeight: 500 }}>May 8, 2025 · 3d overdue</div>
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
  const router = useRouter();
  const project = useProjectStore(s => s.projects.find(p => p.id === id));
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [panelOpen, setPanelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Shared backlog state — lifted so Board can reflect active sprint
  const [blSprints, setBlSprints] = useState<BLSprintData[]>(BL_SPRINTS_INIT);
  const [blBacklog, setBlBacklog] = useState<BLItem[]>(BL_BACKLOG_INIT);
  const activeSprint = blSprints.find(s => s.active);
  const nextTaskId   = useRef(300);

  function handleTaskCreated({ summary, workType, status, sprint }: {
    summary: string; workType: string; status: string; sprint: string;
  }) {
    const blType: BLType = workType === "Bug" ? "bug" : workType === "Story" ? "story" : "task";
    const blStatus: BLStatus = status === "In Progress" ? "in-progress"
      : status === "In Review" ? "in-review"
      : status === "Done"      ? "done"
      : "todo";
    const item: BLItem = { id: `NB-${nextTaskId.current++}`, title: summary, type: blType, status: blStatus };
    if (sprint.includes("active")) {
      setBlSprints(p => p.map(s => s.active ? { ...s, items: [...s.items, item] } : s));
    } else {
      setBlBacklog(p => [...p, item]);
    }
  }

  function handleSprintStatusChange(itemId: string, status: BLStatus) {
    setBlSprints(p => p.map(sp =>
      !sp.active ? sp : { ...sp, items: sp.items.map(i => i.id === itemId ? { ...i, status } : i) }
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
        <ProjectTopbar onOpenPanel={() => setCreateOpen(true)} project={project} />

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
          {activeTab === "overview"  && <OverviewTab  onOpenPanel={() => setPanelOpen(true)} onOpenCreate={() => setCreateOpen(true)} onSwitchToBoard={() => setActiveTab("board")} project={project} />}
          {activeTab === "board"     && <BoardTab     onOpenPanel={() => setPanelOpen(true)} onOpenCreate={() => setCreateOpen(true)} activeSprint={activeSprint} allSprints={blSprints} onSprintStatusChange={handleSprintStatusChange} onCompleteSprint={openCompleteSprint} projectName={project?.name} />}
          {activeTab === "backlog"   && <BacklogTab   onOpenPanel={() => setPanelOpen(true)} sprints={blSprints} setSprints={setBlSprints} backlog={blBacklog} setBacklog={setBlBacklog} onCompleteSprint={openCompleteSprint} />}
          {activeTab === "timeline"  && <TimelineTab projectName={project?.name} />}
          {activeTab === "team"      && <TeamTab />}
        </div>
      </div>

      <TaskPanel open={panelOpen} onClose={() => setPanelOpen(false)} projectName={project?.name} />
      <CreateStoryPanel open={createOpen} onClose={() => setCreateOpen(false)} projectName={project?.name} onCreated={handleTaskCreated} />

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
