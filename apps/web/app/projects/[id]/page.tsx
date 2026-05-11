"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import "../projects.css";
import OGSidebar from "@/components/OGSidebar";
import ProjectsListSidebar from "@/components/ProjectsListSidebar";
import RichEditor from "@/components/RichEditor";

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

function CreateStoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            <span>Nova Banking App</span>
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

function ProjectTopbar({ onOpenPanel }: { onOpenPanel: () => void }) {
  return (
    <div className="proj-topbar">
      <div className="proj-crumbs">
        <span>Projects</span>
        <IChevR />
        <strong>Nova Banking App</strong>
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

function OverviewTab({ onOpenPanel }: { onOpenPanel: () => void }) {
  return (
    <div className="pane active">
      <div className="proj-wrap">
        {/* Hero */}
        <div className="proj-hero">
          <div className="proj-hero-top">
            <div className="proj-hero-icon">🪐</div>
            <div className="proj-hero-titles">
              <div className="proj-hero-badges">
                <span className="proj-badge pb-client">Client Project</span>
                <span className="proj-badge pb-active"><span className="proj-badge-dot" />Active</span>
                <span className="proj-badge pb-sprint">Sprint 14 · ends in 2d</span>
              </div>
              <h1 className="proj-hero-title">Nova Banking App <span className="accent">— shipping soon.</span></h1>
              <p className="proj-hero-sub">A consumer mobile bank for Astra Capital. Onboarding, accounts, transfers, and the new round-up savings module land this quarter.</p>
            </div>
            <div className="proj-hero-actions">
              <button className="proj-btn-ghost"><IClock /> Log time</button>
              <button className="proj-btn-primary" onClick={onOpenPanel}><IPlus /> Add task</button>
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
          <button className="ctx-banner-cta">Open board →</button>
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
  story, onClose,
}: {
  story: StoryGroup | null;
  onClose: () => void;
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
            <span className="tp-crumb-proj">Nova Banking App</span>
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

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

function BoardTab({ onOpenPanel }: { onOpenPanel: () => void }) {
  const [groups, setGroups] = useState(() =>
    STORY_GROUPS.map(sg => ({
      ...sg,
      cols: sg.cols.map(col => ({ ...col, cards: [...col.cards] })),
    }))
  );
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({});
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [openStory, setOpenStory]     = useState<StoryGroup | null>(null);
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

  return (
    <div className="pane active">
      <div className="board-shell">
        <div className="board-bar">
          <span className="board-bar-title">Sprint 14 Board</span>
          <div className="mode-toggle">
            <button className="mode-btn active">Board</button>
            <button className="mode-btn">List</button>
            <button className="mode-btn">Timeline</button>
          </div>
          <button className="filter-chip"><IUsers style={{ width: 12, height: 12 }} /> <span className="strong">Assignee</span></button>
          <button className="filter-chip"><IFlag style={{ width: 12, height: 12 }} /> Priority</button>
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
          <div style={{ marginLeft: "auto" }}>
            <button className="proj-btn-primary" onClick={onOpenPanel}><IPlus /> Add task</button>
          </div>
        </div>
        <div className="board-body">
          {groups.map((sg, gi) => {
            const isCollapsed = !!collapsed[sg.name];
            return (
              <div key={sg.name} className={"story-group" + (isCollapsed ? " collapsed" : "")}
                style={{ "--sg-color": sg.color } as React.CSSProperties}>
                <div className="story-header">
                  <div className="story-toggle" onClick={() => setCollapsed(p => ({ ...p, [sg.name]: !p[sg.name] }))}><IChevDown /></div>
                  <span className="story-name" onClick={() => setOpenStory(sg)} style={{ cursor: "pointer" }}>{sg.name}</span>
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
                          <button className="k-col-add" onClick={onOpenPanel}><IPlus /></button>
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
      <StoryPanel story={openStory} onClose={() => setOpenStory(null)} />
    </div>
  );
}

// ─── BACKLOG TAB ──────────────────────────────────────────────────────────────

const BACKLOG_SECTIONS = [
  {
    name: "Priority Queue",
    desc: "Committed to this sprint or next",
    count: 12,
    dot: "var(--red)",
    rows: [
      { id: "NB-218", prio: "p-high", title: "Auth refactor — refresh token rotation logic", tags: ["tt-be"], impact: "bl-h", effort: "3" },
      { id: "NB-216", prio: "p-high", title: "Round-up calculation engine and edge cases",   tags: ["tt-be"], impact: "bl-h", effort: "5" },
      { id: "NB-226", prio: "p-high", title: "Wire transfer error states and recovery flow",  tags: ["tt-fe", "tt-bug"], impact: "bl-h", effort: "3" },
      { id: "NB-223", prio: "p-med",  title: "KYC document upload and validation UI",         tags: ["tt-fe"], impact: "bl-m", effort: "3" },
      { id: "NB-220", prio: "p-med",  title: "Onboarding copy review — final pass",          tags: ["tt-des"], impact: "bl-m", effort: "1" },
    ],
  },
  {
    name: "Ready",
    desc: "Groomed and estimated — ready to pick up",
    count: 34,
    dot: "var(--blue)",
    rows: [
      { id: "NB-230", prio: "p-high", title: "International wire routing — SWIFT integration", tags: ["tt-be"], impact: "bl-h", effort: "8" },
      { id: "NB-225", prio: "p-med",  title: "Accessibility audit — onboarding screens",      tags: ["tt-fe"], impact: "bl-m", effort: "3" },
      { id: "NB-221", prio: "p-med",  title: "Savings goal creation and milestone tracking",  tags: ["tt-fe", "tt-des"], impact: "bl-m", effort: "5" },
      { id: "NB-231", prio: "p-low",  title: "Fee disclosure screen before wire confirmation", tags: ["tt-fe", "tt-des"], impact: "bl-l", effort: "2" },
      { id: "NB-222", prio: "p-low",  title: "Weekly savings summary email template",         tags: ["tt-fe"], impact: "bl-l", effort: "2" },
    ],
  },
  {
    name: "Research",
    desc: "Needs spiking before estimation",
    count: 18,
    dot: "var(--amber)",
    rows: [
      { id: "NB-240", prio: "p-high", title: "Card freeze / unfreeze — real-time card control", tags: ["tt-be"], impact: "bl-h", effort: "?" },
      { id: "NB-242", prio: "p-med",  title: "Push notification preferences and scheduling",   tags: ["tt-be", "tt-fe"], impact: "bl-m", effort: "?" },
      { id: "NB-244", prio: "p-low",  title: "In-app chat with support — feasibility spike",   tags: ["tt-inf"], impact: "bl-l", effort: "?" },
    ],
  },
  {
    name: "Icebox",
    desc: "Deprioritised — revisit in Q3",
    count: 60,
    dot: "var(--proj-text-4)",
    rows: [
      { id: "NB-250", prio: "p-low", title: "Cryptocurrency wallet integration",               tags: ["tt-be"], impact: "bl-l", effort: "13" },
      { id: "NB-252", prio: "p-low", title: "Investment portfolio view (read-only)",           tags: ["tt-fe", "tt-des"], impact: "bl-l", effort: "8" },
      { id: "NB-254", prio: "p-low", title: "Multi-currency account support",                  tags: ["tt-be"], impact: "bl-l", effort: "21" },
    ],
  },
];

function BacklogTab({ onOpenPanel }: { onOpenPanel: () => void }) {
  return (
    <div className="pane active">
      <div className="backlog-wrap">
        <div className="bl-toolbar">
          <span className="bl-toolbar-title">Backlog</span>
          <button className="filter-chip"><IFilter style={{ width: 12, height: 12 }} /> Filter</button>
          <button className="filter-chip"><IUsers style={{ width: 12, height: 12 }} /> Assignee</button>
          <button className="proj-btn-primary" onClick={onOpenPanel}><IPlus /> Add item</button>
        </div>
        {BACKLOG_SECTIONS.map((sec) => (
          <div key={sec.name} className="backlog-section">
            <div className="bl-head">
              <div className="bl-head-left">
                <span className="bl-sec-dot" style={{ background: sec.dot }} />
                <span className="bl-sec-name">{sec.name}</span>
                <span className="bl-sec-desc">{sec.desc}</span>
              </div>
              <span className="bl-sec-count">{sec.count}</span>
            </div>
            <div className="bl-rows">
              {sec.rows.map((row) => (
                <div key={row.id} className="bl-row" onClick={onOpenPanel}>
                  <div className={"bl-prio " + row.prio} />
                  <span className="bl-id">{row.id}</span>
                  <span className="bl-title-text">{row.title}</span>
                  <div className="bl-tags">{row.tags.map(t => <span key={t} className={"t-tag " + t}>{t.replace("tt-","")}</span>)}</div>
                  <span className="bl-meta-label">Impact <span className={row.impact}>●</span></span>
                  <span className="bl-meta-label">Pts <span>{row.effort}</span></span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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

function TimelineTab() {
  return (
    <div className="pane active">
      <div className="roadmap-wrap">
        <div className="rm-toolbar">
          <span className="rm-title">Roadmap — Nova Banking App</span>
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

function TaskPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            <span className="tp-crumb-proj">Nova Banking App</span>
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

export default function ProjectsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [panelOpen, setPanelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const TAB_LABELS: Record<TabKey, { label: string; count?: string }> = {
    overview:  { label: "Overview"  },
    board:     { label: "Board",    count: "47"  },
    backlog:   { label: "Backlog",  count: "124" },
    timeline:  { label: "Timeline" },
    team:      { label: "Team"     },
  };

  return (
    <div className="proj-shell" data-theme="light">
      <OGSidebar />
      <ProjectsListSidebar selected={params.id} />

      <div className="proj-workspace">
        <ProjectTopbar onOpenPanel={() => setCreateOpen(true)} />

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
          {activeTab === "overview"  && <OverviewTab  onOpenPanel={() => setPanelOpen(true)} />}
          {activeTab === "board"     && <BoardTab     onOpenPanel={() => setPanelOpen(true)} />}
          {activeTab === "backlog"   && <BacklogTab   onOpenPanel={() => setPanelOpen(true)} />}
          {activeTab === "timeline"  && <TimelineTab />}
          {activeTab === "team"      && <TeamTab />}
        </div>
      </div>

      <TaskPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <CreateStoryPanel open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
