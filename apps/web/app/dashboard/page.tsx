"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./dashboard.css";
import OGSidebar from "@/components/OGSidebar";
import { useAuthStore } from "@/lib/authStore";
import { useProjectStore } from "@/lib/projectStore";

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

const HERO_HEADLINES: Record<HeroState, React.ReactNode> = {
  normal: <>Today, you have <em>3 priority tasks</em> and one review to land.</>,
  deadline: <>Mission Control — <em>RetailOS ships in 26h</em>. Two blockers need you.</>,
  achievement: <>You closed <em>your 100th task</em> this quarter — momentum is at an all-time high.</>,
};
const HERO_SUBS: Record<HeroState, string> = {
  normal: "Sprint health is good. You're on pace for a 92% velocity week. Mantra is auto-blocking your focus window from 10:00–12:30.",
  deadline: "Two API permission tickets are blocking RetailOS launch. Rakesh is online; Sana finishes review at 11:30.",
  achievement: "Three teammates recognized your work this week. The team is shipping faster, calmer, together.",
};
const HERO_TAGS: Record<HeroState, string> = {
  normal: "Normal day",
  deadline: "Deadline focus",
  achievement: "Milestone unlocked",
};
const CONFETTI_COLORS = ["#F97316", "#FB923C", "#F5A524", "#FF6B5C", "#9353D3"];

function Hero({ state }: { state: HeroState }) {
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
        {HERO_TAGS[state]}
      </div>
      <div className="hero-grid">
        <div>
          <h2 className="hero-headline">{HERO_HEADLINES[state]}</h2>
          <p className="hero-sub">{HERO_SUBS[state]}</p>
        </div>

        <div className="hero-stat">
          <span className="label">Sprint velocity</span>
          <div className="val">92%<span className="delta">+12%</span></div>
          <div className="bar"><div className="bar-fill" style={{ width: "92%" }} /></div>
        </div>

        <div className="hero-stat">
          <span className="label">
            {state === "deadline" ? "Time to ship" : state === "achievement" ? "Tasks closed" : "Focus runway"}
          </span>
          <div className="val">
            {state === "deadline" ? <>26h<span className="delta bad">2 blockers</span></> :
             state === "achievement" ? <>100<span className="delta">milestone</span></> :
             <>2h 30m<span className="delta warn">starts 10:00</span></>}
          </div>
          <div className="bar">
            <div className="bar-fill" style={{
              width: state === "deadline" ? "62%" : state === "achievement" ? "100%" : "48%",
              background: state === "deadline" ? "linear-gradient(135deg,#FF6B5C,#F31260)" : undefined,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Today Flow ────────────────────────────────────────────────────────────────

const FLOW_ITEMS = [
  { kind: "continue", title: "Dashboard UI Refactor",      meta: "RetailOS · 2h remaining · ~75% done", tag: "Continue"      },
  { kind: "review",   title: "API Permission Layer",        meta: "PR #482 · waiting on you · ~20m",     tag: "Review needed" },
  { kind: "up",       title: "Sprint Planning Meeting",     meta: "Today · 15:00 · with Core team",       tag: "Upcoming"      },
  { kind: "default",  title: "Triage onboarding bugs",      meta: "Backlog · estimated 45m",              tag: ""              },
  { kind: "done",     title: "Spec review — Notifications v2", meta: "Completed 09:14",                  tag: ""              },
];

function TodayFlow() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconBolt />Today flow</div>
        <button className="card-action">Reorder<IconChevR /></button>
      </div>
      <div className="flow-list">
        {FLOW_ITEMS.map((it, i) => (
          <div key={i} className={"flow-item " + it.kind}>
            <div className="flow-bullet">
              {it.kind === "done" ? <IconCheck style={{ width: 14, height: 14 }} /> : i + 1}
            </div>
            <div>
              {it.tag && <span className={"flow-tag " + it.kind}>{it.tag}</span>}
              <p className="flow-title" style={{ marginTop: it.tag ? 6 : 0 }}>{it.title}</p>
              <div className="flow-meta">{it.meta}</div>
            </div>
            <button className="flow-cta"><IconChevR /></button>
          </div>
        ))}
      </div>
      <div className="momentum-strip">
        <span className="label">Momentum</span>
        <div className="meter"><span /></div>
        <span className="val">Strong · 78</span>
      </div>
    </div>
  );
}

// ─── Active Focus ──────────────────────────────────────────────────────────────

function ActiveFocus() {
  const [running, setRunning] = useState(true);
  const [secs, setSecs] = useState(48 * 60 + 22);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <div className="focus-card">
      <div>
        <div className="focus-task">Active focus</div>
        <div className="focus-task-name">Dashboard UI Refactor · RetailOS</div>
      </div>
      <div className="focus-timer">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        <span className="ms">remaining</span>
      </div>
      <div className="focus-pomodoro">
        <i className="done" /><i className="done" /><i className="now" /><i /><i />
      </div>
      <div className="focus-actions">
        <button className="focus-btn primary" onClick={() => setRunning(r => !r)}>
          {running ? <IconPause /> : <IconPlay />}
          {running ? "Pause" : "Resume"}
        </button>
        <button className="focus-btn">Switch task</button>
      </div>
      <div className="focus-amb">
        <div className="focus-amb-bars"><span/><span/><span/><span/><span/></div>
        Ambient: Deep forest · low
      </div>
    </div>
  );
}

// ─── Contribution Timeline ─────────────────────────────────────────────────────

const TIMELINE_LEVELS = [0, 1, 1, 2, 0, 1, 3, 2, 1, 0, 2, 4, 3, 2, 1, 0, 2, 3, 1, 2, 4, 3, 2, 1, 3, 4];

const TIMELINE_EVENTS = [
  { kind: "recognition", Icon: IconAward, text: <><b>Rakesh</b> appreciated your <span className="muted">API cleanup</span> work.</>,    time: "2h ago"    },
  { kind: "complete",    Icon: IconCheck, text: <>Closed <b>12 tasks</b> in RetailOS sprint — your week&apos;s high.</>,                 time: "Yesterday" },
  { kind: "milestone",   Icon: IconFlag,  text: <>You joined <b>Mantra Mobile</b> as a contributor.</>,                                   time: "Mon"       },
  { kind: "skill",       Icon: IconStar,  text: <>Added skill <b>System Design</b> after shipping notifications service.</>,              time: "Apr 28"    },
  { kind: "recognition", Icon: IconAward, text: <><b>Sana</b> recognized your mentorship of two new engineers.</>,                        time: "Apr 26"    },
];

function ContributionTimeline() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconTimeline />Contribution timeline</div>
        <button className="card-action">View all<IconChevR /></button>
      </div>
      <div className="timeline-wrap">
        <div className="timeline-axis">
          {TIMELINE_LEVELS.map((l, i) => (
            <div
              key={i}
              className={"timeline-cell" + (l ? " l" + l : "") + (i === 25 ? " today" : "")}
              title={`Day ${i + 1}: ${l} contributions`}
            />
          ))}
        </div>
        <div className="timeline-stream">
          {TIMELINE_EVENTS.map((e, i) => (
            <div key={i} className="t-event">
              <div className={"t-dot " + e.kind}><e.Icon /></div>
              <div className="t-text">{e.text}</div>
              <div className="t-time">{e.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Workload Heatmap ─────────────────────────────────────────────────────────

const WL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WL_COLS = ["W-3", "W-2", "W-1", "Now", "+1", "+2", "+3", "+4"];
const WL_DATA = [
  ["bal-l","bal","bal","bal","amb","amb","bal","bal-l"],
  ["bal","bal","amb","amb","over","amb","bal","bal-l"],
  ["bal-l","bal","bal","amb","amb","bal","bal","bal-l"],
  ["bal","amb","amb","over","amb","bal","bal-l","bal-l"],
  ["bal-l","bal-l","bal","bal","amb","bal","bal-l","bal-l"],
];

function WorkloadHeatmap() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconChart />Workload</div>
        <span className="badge warm">This week trending heavier</span>
      </div>
      <div className="heatmap">
        <div />
        {WL_COLS.map(c => <div key={c} className="h-col-label">{c}</div>)}
        {WL_DAYS.map((d, r) => (
          <React.Fragment key={d}>
            <div className="h-row-label">{d}</div>
            {WL_DATA[r].map((v, c) => <div key={c} className={"h-cell " + v} />)}
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

const TEAM_MEMBERS = [
  { n: "Rakesh M.", c: "RM", g: "linear-gradient(135deg,#F97316,#F5A524)", s: "active",  st: "Reviewing your PR"   },
  { n: "Sana K.",   c: "SK", g: "linear-gradient(135deg,#9353D3,#FF4ECD)", s: "busy",    st: "In deep focus · 22m" },
  { n: "Diego P.",  c: "DP", g: "linear-gradient(135deg,#338EF7,#06B7DB)", s: "active",  st: "Open for review"     },
  { n: "Mira J.",   c: "MJ", g: "linear-gradient(135deg,#17C964,#45D483)", s: "active",  st: "Shipped 2 tasks"     },
  { n: "Anika R.",  c: "AR", g: "linear-gradient(135deg,#F31260,#FF6B5C)", s: "blocked", st: "Blocked on infra"    },
  { n: "Tomás V.",  c: "TV", g: "linear-gradient(135deg,#F5A524,#F97316)", s: "",        st: "Off today"           },
];

function TeamEnergy() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconUsers />Team energy</div>
        <button className="card-action">All teams<IconChevR /></button>
      </div>
      <div className="team-grid">
        {TEAM_MEMBERS.map((t, i) => (
          <div key={i} className="team-row">
            <div className={"avatar " + t.s} style={{ background: t.g }}>{t.c}</div>
            <div>
              <div className="team-name">{t.n}</div>
              <div className="team-status">{t.st}</div>
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

const PROJECTS = [
  { n: "RetailOS",           pct: 78, due: "Due in 11 days",  health: "good", budget: "Healthy",  blockers: 2, avatars: [["RM","#F97316"],["SK","#9353D3"],["DP","#338EF7"]] },
  { n: "Mantra Mobile",      pct: 42, due: "Due in 38 days",  health: "good", budget: "Healthy",  blockers: 0, avatars: [["MJ","#17C964"],["AR","#F31260"]] },
  { n: "Notifications v2",   pct: 91, due: "Due in 4 days",   health: "warn", budget: "On edge",  blockers: 1, avatars: [["SK","#9353D3"],["TV","#F5A524"],["DP","#338EF7"],["RM","#F97316"]] },
  { n: "Onboarding Refresh", pct: 23, due: "Due in 56 days",  health: "good", budget: "Healthy",  blockers: 0, avatars: [["MJ","#17C964"],["AR","#F31260"],["DP","#338EF7"]] },
];

function ProjectSnapshots() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconBoxes />Project snapshots</div>
        <button className="card-action">All projects<IconChevR /></button>
      </div>
      <div className="proj-grid">
        {PROJECTS.map((p, i) => (
          <div key={i} className="proj-card">
            <div className="proj-head">
              <div>
                <div className="proj-name">{p.n}</div>
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
                {p.avatars.map(([c, g], k) => (
                  <div key={k} className="avatar" style={{ background: g }}>{c}</div>
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

// ─── Recognition Feed ─────────────────────────────────────────────────────────

const RECOGNITION_ITEMS = [
  { c: "RM", g: "linear-gradient(135deg,#F97316,#F5A524)", who: "Rakesh", text: <>appreciated your <span className="target">API cleanup</span> work.</>,         t: "2h ago"    },
  { c: "SK", g: "linear-gradient(135deg,#9353D3,#FF4ECD)", who: "Sana",   text: <>thanked you for the <span className="target">spec review</span>.</>,            t: "Yesterday" },
  { c: "MJ", g: "linear-gradient(135deg,#17C964,#45D483)", who: "Mira",   text: <>recognized you for <span className="target">mentoring</span> two new engineers.</>, t: "Mon"    },
];

function RecognitionFeed() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconAward />Recognition</div>
        <button className="card-action">Send one<IconPlus /></button>
      </div>
      <div className="recog-list">
        {RECOGNITION_ITEMS.map((r, i) => (
          <div key={i} className="recog">
            <div className="avatar" style={{ background: r.g, width: 32, height: 32 }}>{r.c}</div>
            <div>
              <div className="recog-text"><b>{r.who}</b> {r.text}</div>
              <div className="recog-time">{r.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Smart Insights ───────────────────────────────────────────────────────────

const INSIGHT_ITEMS = [
  { ico: "up",   Icon: IconArrowUp,  t: <>Your estimate accuracy improved <b>+18%</b> this month.</>             },
  { ico: "warn", Icon: IconAlert,    t: <>This sprint has <b>more review bottlenecks</b> than last.</>            },
  { ico: "info", Icon: IconTrending, t: <>You&apos;ve worked mostly on <b>frontend</b> tasks this month.</>       },
  { ico: "spark",Icon: IconSpark,    t: <><b>2 teammates</b> are available to review your PR right now.</>        },
];

function SmartInsights() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><IconBrain />Smart insights</div>
        <span className="badge">Updated 09:14</span>
      </div>
      <div className="insights">
        {INSIGHT_ITEMS.map((it, i) => (
          <div key={i} className="insight">
            <div className={"ico " + it.ico}><it.Icon /></div>
            <div>{it.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Journey Pulse ────────────────────────────────────────────────────────────

const PULSE_POINTS: Record<string, number[]> = {
  week:  [12, 18, 22, 16, 28, 24, 32, 30, 36, 28, 38, 42, 40, 48],
  month: [22, 26, 24, 30, 36, 32, 40, 38, 44, 50, 46, 54, 60, 58, 64, 70],
  year:  [10, 18, 24, 22, 30, 28, 38, 42, 36, 48, 56, 60, 70, 78, 84, 88, 96, 102],
};

function JourneyPulse() {
  const [range, setRange] = useState<"week" | "month" | "year">("week");
  const data = PULSE_POINTS[range];
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
  heroState: HeroState;
  density: "spacious" | "balanced" | "dense";
  showJourneyPulse: boolean;
  showInsights: boolean;
  showRecognition: boolean;
  showTeam: boolean;
  showWorkload: boolean;
};

const TWEAK_DEFAULTS: TweakDefaults = {
  theme: "light",
  mode: "planning",
  heroState: "normal",
  density: "balanced",
  showJourneyPulse: true,
  showInsights: true,
  showRecognition: true,
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

          <div className="twk-sect">Hero state</div>
          <div className="twk-row">
            <div className="twk-lbl">State</div>
            <select className="twk-field" value={t.heroState} onChange={e => setTweak("heroState", e.target.value as HeroState)}>
              <option value="normal">Normal day</option>
              <option value="deadline">Deadline / Mission Control</option>
              <option value="achievement">Achievement / Celebratory</option>
            </select>
          </div>

          <div className="twk-sect">Modules</div>
          {([
            ["showInsights",     "Smart insights"],
            ["showRecognition",  "Recognition"],
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
              {!isFocus && <Hero state={t.heroState} />}
              <TodayFlow />
              {!isFocus && <ContributionTimeline />}
              {!isFocus && t.showWorkload && <WorkloadHeatmap />}
              {!isFocus && isReflection && t.showJourneyPulse && <JourneyPulse />}
              {!isFocus && t.showTeam && <TeamEnergy />}
            </div>
            {/* Right column */}
            <div className="col">
              <ActiveFocus />
              {!isFocus && t.showInsights && <SmartInsights />}
              {!isFocus && !isReflection && t.showJourneyPulse && <JourneyPulse />}
              {!isFocus && t.showRecognition && <RecognitionFeed />}
              {!isFocus && <ProjectSnapshots />}
            </div>
          </div>
        </div>
      </div>

      <CmdK open={cmdOpen} onClose={handleCmdClose} />
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} t={t} setTweak={setTweak} />
    </div>
  );
}
