"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import OGSidebar from "@/components/OGSidebar";
import { getToken } from "@/lib/api";
import "./lunch.css";
import "../projects/projects.css";

type LunchView = "today" | "weekly" | "history" | "payments" | "suggestions";
type MealType = "veg" | "chicken" | "egg" | "none";
type PayStatus = "paid" | "pending" | "notset";

interface WeekDay {
  key: string;
  label: string;
  date: number;
  month: string;
  isToday: boolean;
  meal: MealType | null;
  status: PayStatus;
  availableMeals: MealType[];
}

const TODAY_DOW = "wed";

const WEEK: WeekDay[] = [
  { key: "mon", label: "Mon", date: 12, month: "May", isToday: false, meal: "veg",     status: "paid",    availableMeals: ["veg", "egg", "none"] },
  { key: "tue", label: "Tue", date: 13, month: "May", isToday: false, meal: "veg",     status: "paid",    availableMeals: ["veg", "none"] },
  { key: "wed", label: "Wed", date: 14, month: "May", isToday: true,  meal: "veg",     status: "pending", availableMeals: ["veg", "chicken", "none"] },
  { key: "thu", label: "Thu", date: 15, month: "May", isToday: false, meal: null,      status: "notset",  availableMeals: ["veg", "none"] },
  { key: "fri", label: "Fri", date: 16, month: "May", isToday: false, meal: null,      status: "notset",  availableMeals: ["veg", "none"] },
];

const MEAL_INFO = {
  veg:     { emoji: "🥗", name: "Veg",       desc: "Dal · rice · sabzi",         dietary: "VEGAN",  kcal: "≈ 540 kcal", avail: "all",   extraLabel: "" },
  chicken: { emoji: "🍗", name: "Chicken",   desc: "Curry · rice · salad",       dietary: "+ Rs 40", kcal: "≈ 720 kcal", avail: "wed",   extraLabel: "Wed only" },
  egg:     { emoji: "🥚", name: "Egg Curry", desc: "Curry · rice · sabzi",       dietary: "+ Rs 15", kcal: "≈ 610 kcal", avail: "mon",   extraLabel: "Mon only" },
  none:    { emoji: "🚫", name: "Skip",      desc: "No lunch today",             dietary: "FREE",   kcal: "—",          avail: "all",   extraLabel: "" },
};

const EGG_LABELS = ["none", "1 egg", "2 eggs", "3 eggs"];
const EGG_DESCS = [
  "Boiled or fried · available every day · Rs 25 each",
  "1 extra egg · boiled or fried · + Rs 25",
  "2 extra eggs · boiled or fried · + Rs 50",
  "3 extra eggs · boiled or fried · + Rs 75",
];

const TEAMMATES = [
  { name: "Rakesh Kumar",  initials: "RK", team: "Engineering",  status: "pending",   color: "linear-gradient(135deg,#f97316,#db2777)" },
  { name: "Mira Shrestha", initials: "MS", team: "Design",       status: "submitted", color: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  { name: "Jaya Thapa",   initials: "JT", team: "Product",      status: "pending",   color: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
  { name: "Dev Karki",    initials: "DK", team: "Engineering",  status: "pending",   color: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { name: "Lakshmi Rai",  initials: "LR", team: "Operations",   status: "submitted", color: "linear-gradient(135deg,#f59e0b,#ef4444)" },
];

const SUGGESTION_CHIPS = [
  "More variety", "Less spicy", "Extra portion", "Vegan options", "Faster service", "Feedback on today", "Special diet"
];

// Calendar data (May 2025)
type CalMeal = "veg" | "chicken" | "egg" | "none" | "empty" | "weekend";
interface CalCell { day: number; type: CalMeal; emoji: string; }
function buildCal(): CalCell[] {
  const cells: CalCell[] = [];
  // May 1 = Thursday (offset 4 in Mon-start grid)
  for (let i = 0; i < 3; i++) cells.push({ day: 0, type: "empty", emoji: "" });
  const data: [number, CalMeal, string][] = [
    [1,"veg","🥗"],[2,"chicken","🍗"],
    [5,"veg","🥗"],[6,"egg","🥚"],[7,"veg","🥗"],[8,"chicken","🍗"],[9,"veg","🥗"],
    [12,"veg","🥗"],[13,"veg","🥗"],[14,"veg","🥗"],[15,"none","—"],[16,"none","—"],
    [19,"veg","🥗"],[20,"egg","🥚"],[21,"veg","🥗"],[22,"chicken","🍗"],[23,"veg","🥗"],
    [26,"veg","🥗"],[27,"veg","🥗"],[28,"none","—"],[29,"egg","🥚"],[30,"veg","🥗"],
  ];
  const weekendDays = [3,4,10,11,17,18,24,25,31];
  for (let d = 1; d <= 31; d++) {
    if (weekendDays.includes(d)) { cells.push({ day: d, type: "weekend", emoji: "" }); continue; }
    const found = data.find(([day]) => day === d);
    if (found) cells.push({ day: d, type: found[1], emoji: found[2] });
    else cells.push({ day: d, type: "empty", emoji: "" });
  }
  return cells;
}
const CAL_CELLS = buildCal();

export default function LunchPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const [view, setView]             = useState<LunchView>("today");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("veg");
  const [eggCount, setEggCount]     = useState(0);
  const [proxyMode, setProxyMode]   = useState(false);
  const [proxyPerson, setProxyPerson] = useState<typeof TEAMMATES[0] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [toastMsg, setToastMsg]     = useState("");
  const [toastShow, setToastShow]   = useState(false);
  const [saveNote, setSaveNote]     = useState("✓ Saved 09:14. Change anytime before 10:30.");
  const [selectedDay, setSelectedDay] = useState<number>(2); // Wed = index 2
  const [weekMeals, setWeekMeals]   = useState<(MealType | null)[]>([...WEEK.map(w => w.meal)]);
  const [selectedAmt, setSelectedAmt] = useState<number>(1);
  const [qrAmt, setQrAmt]           = useState("1,500");
  const [qrProvider, setQrProvider] = useState<"esewa" | "khalti">("esewa");
  type TxState = "verified" | "pending" | "unverified";
  type TxRow = { ico: string; name: string; sub: string; amt: string; date: string; state: TxState };
  const SEED_TX: TxRow[] = [
    { ico: "💸", name: "May contribution", sub: "eSewa · #TX8821",   amt: "+ Rs 1,500", date: "May 10, 2025", state: "verified" },
    { ico: "🍗", name: "Chicken meal × 4", sub: "W19 surcharge",     amt: "− Rs 160",   date: "May 9, 2025",  state: "verified" },
    { ico: "💸", name: "April top-up",     sub: "Khalti · #TX7712",   amt: "+ Rs 1,000", date: "Apr 28, 2025", state: "verified" },
    { ico: "🥗", name: "Veg meals × 18",   sub: "Apr settlement",    amt: "− Rs 900",   date: "Apr 27, 2025", state: "verified" },
    { ico: "💸", name: "Top-up pending",   sub: "eSewa · #TX9901",    amt: "+ Rs 500",   date: "May 13, 2025", state: "pending" },
  ];
  const [txLog, setTxLog] = useState<TxRow[]>(SEED_TX);
  const [chips, setChips]           = useState<Set<number>>(new Set());
  const [calSelected, setCalSelected] = useState<number | null>(14);
  const [clock, setClock]           = useState("");
  const [ppSearch, setPpSearch]     = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function tick() {
      const d = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setClock(`${days[d.getDay()]} · ${hh}:${mm}`);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2400);
  }, []);

  function selectMeal(meal: MealType) {
    const info = MEAL_INFO[meal];
    if (info.avail !== "all" && info.avail !== TODAY_DOW) return;
    setSelectedMeal(meal);
    const suffix = eggCount > 0 && meal !== "none" ? ` + ${EGG_LABELS[eggCount]}` : "";
    setSaveNote(`Changed to ${info.name}${suffix}. Don't forget to save.`);
  }

  function changeEgg(delta: number) {
    const next = Math.max(0, Math.min(3, eggCount + delta));
    setEggCount(next);
    if (delta > 0 && next !== eggCount) showToast(`${EGG_LABELS[next]} on the side`);
    if (delta < 0) showToast(next === 0 ? "Extra egg removed" : `${EGG_LABELS[next]} on the side`);
    if (next !== eggCount) {
      const suffix = next > 0 && selectedMeal !== "none" ? ` + ${EGG_LABELS[next]}` : "";
      setSaveNote(`Changed to ${MEAL_INFO[selectedMeal].name}${suffix}. Don't forget to save.`);
    }
  }

  function saveLunch() {
    const suffix = eggCount > 0 && selectedMeal !== "none" ? ` + ${EGG_LABELS[eggCount]}` : "";
    if (proxyMode && proxyPerson) {
      showToast(`Saved · ${MEAL_INFO[selectedMeal].name.toLowerCase()}${suffix} for ${proxyPerson.name.split(" ")[0]}`);
    } else {
      showToast(`Saved · ${MEAL_INFO[selectedMeal].name.toLowerCase()}${suffix}`);
    }
  }

  function enterProxy(person: typeof TEAMMATES[0]) {
    setProxyMode(true);
    setProxyPerson(person);
    setPickerOpen(false);
    showToast(`Now submitting for ${person.name.split(" ")[0]}`);
  }

  function exitProxy() {
    setProxyMode(false);
    setProxyPerson(null);
    showToast("Back to your own lunch");
  }

  function goTo(v: LunchView) {
    setView(v);
  }

  const VIEWS: { key: LunchView; emoji: string; label: string; badge?: string; badgeType?: string }[] = [
    { key: "today",       emoji: "☀️", label: "Today",       badge: "LIVE",   badgeType: "live" },
    { key: "weekly",      emoji: "📅", label: "Weekly Plan", badge: "W20" },
    { key: "history",     emoji: "📓", label: "History" },
    { key: "payments",    emoji: "💸", label: "Payments",    badge: "1" },
    { key: "suggestions", emoji: "💡", label: "Suggestions" },
  ];

  const plannedCount = weekMeals.filter(m => m !== null && m !== "none").length;

  const filteredTeammates = TEAMMATES.filter(t =>
    ppSearch === "" || t.name.toLowerCase().includes(ppSearch.toLowerCase()) || t.team.toLowerCase().includes(ppSearch.toLowerCase())
  );

  // Close picker on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && pickerOpen) setPickerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  const viewLabels: Record<LunchView, string> = {
    today: "Today", weekly: "Weekly Plan", history: "History",
    payments: "Payments", suggestions: "Suggestions",
  };

  return (
    <div className="ln-shell" data-theme="light">
      <OGSidebar />
      <div className="ln-app">
        {/* ── Lunch sidebar ── */}
        <aside className="proj-nav" style={{ width: 220 }}>
          <div className="proj-nav-head">
            <div className="proj-switch-row" style={{ cursor: "default" }}>
              <div className="proj-switch-icon">🍱</div>
              <div className="proj-switch-info">
                <div className="proj-switch-name">Lunch</div>
                <div className="proj-switch-client">DAILY · MANTRA HQ</div>
              </div>
            </div>
          </div>

          <div className="proj-nav-body">
            <div className="proj-nav-section">
              <div className="proj-nav-label">Module</div>
              {VIEWS.map(v => (
                <button
                  key={v.key}
                  className={`pn-item ${view === v.key ? "active" : ""}`}
                  onClick={() => goTo(v.key)}
                >
                  <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{v.emoji}</span>
                  <span className="pn-label">{v.label}</span>
                  {v.badge && (
                    <span className={`pn-badge ${v.badgeType === "live" ? "ln-badge-live" : ""}`}>{v.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="ln-sb-today">
              <div className="lbl">Today&apos;s pick</div>
              <div className="pick">
                <span className="pe">{MEAL_INFO[selectedMeal].emoji}</span>
                {MEAL_INFO[selectedMeal].name}
              </div>
              <div className="countdown">
                <span className="dot" />
                editable for 24m
              </div>
            </div>
          </div>

        </aside>

        {/* ── Main workspace ── */}
        <main className="ln-main">
          {/* Topbar */}
          <div className="ln-topbar">
            <div className="ln-crumbs">
              Lunch
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
              <strong>{viewLabels[view]}</strong>
            </div>
            <div className="ln-tb-spacer" />
            <span className="ln-mobile-hint"><span className="dot" />Mobile-ready</span>
            <div className="ln-tb-divider" />
            <span className="ln-tb-time">{clock}</span>
            <button className="ln-icon-btn" onClick={() => setTweaksOpen(o => !o)} title="Tweaks">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </div>

          {/* Workspace */}
          <div className="ln-workspace">

            {/* ============ TODAY ============ */}
            <div className={`ln-view ${view === "today" ? "active" : ""}`}>
              <div className="ln-wrap">

                {/* Proxy bar */}
                <div className={`ln-proxy-bar ${proxyMode ? "show" : ""}`}>
                  <span className="ln-pb-stripe" />
                  <div className="ln-pb-av" style={{ background: proxyPerson?.color }}>
                    {proxyPerson?.initials}
                  </div>
                  <div className="ln-pb-text">
                    <div className="ln-pb-line-1">Submitting for <strong>{proxyPerson?.name}</strong></div>
                    <div className="ln-pb-line-2">Today only · history &amp; payments stay private · your name attached as source</div>
                  </div>
                  <button className="ln-pb-exit" onClick={exitProxy}>Exit · back to mine</button>
                </div>

                {/* Status banner */}
                <div className="ln-status-banner">
                  <span className="ln-sb-dot" />
                  <div className="ln-sb-text">
                    <div className="h">
                      {proxyMode && proxyPerson
                        ? <>Pick lunch <em>for {proxyPerson.name.split(" ")[0]}</em></>
                        : <>Today&apos;s lunch · <em>{MEAL_INFO[selectedMeal].name}</em></>
                      }
                    </div>
                    <div className="s">
                      {proxyMode
                        ? "Today · their meal only · they'll see who submitted"
                        : <>Editable for the next <span className="lock">24 min</span> · locks at 10:30</>
                      }
                    </div>
                  </div>
                  <button className="ln-sb-cta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    Change
                  </button>
                </div>

                {/* Proxy note */}
                <div className={`ln-proxy-note ${proxyMode ? "show" : ""}`}>
                  <svg className="ln-proxy-note-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  <div>You&apos;re submitting lunch for someone else. You can set today&apos;s pick — their history, payments, and saved preferences stay private. The kitchen will see who was the source.</div>
                </div>

                {/* Proxy entry */}
                {!proxyMode && (
                  <button className="ln-proxy-entry" onClick={() => setPickerOpen(true)}>
                    <span className="ln-proxy-entry-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    </span>
                    <span className="ln-proxy-entry-text">
                      <div className="ln-proxy-entry-line-1">Submit lunch for a teammate</div>
                      <div className="ln-proxy-entry-line-2">For someone offline, on leave, or who asked you to · their data stays private</div>
                    </span>
                    <span className="ln-proxy-entry-arrow">→</span>
                  </button>
                )}

                {/* Day strip */}
                <div className="ln-sec-title">
                  This week
                  <span className="kick">W20 · MAY 12–16</span>
                  <span className="right">Tap a day to plan</span>
                </div>
                <div className="ln-day-strip">
                  {WEEK.map((day, i) => (
                    <button
                      key={day.key}
                      className={`ln-day-pill ${day.isToday ? "today" : ""} ${i === selectedDay ? "active" : ""} ${!day.meal ? "none" : ""}`}
                      onClick={() => setSelectedDay(i)}
                    >
                      <div className="ln-dp-top">
                        <span className="ln-dp-day">{day.label}</span>
                        <span className={`ln-dp-status ${day.status}`} />
                      </div>
                      <div className="ln-dp-meal">
                        <span className="pe">{day.meal ? MEAL_INFO[day.meal].emoji : "—"}</span>
                        <span className="lbl">{day.meal ? MEAL_INFO[day.meal].name : "Not set"}</span>
                      </div>
                      <div className="ln-dp-date">{day.month} {day.date}</div>
                    </button>
                  ))}
                </div>

                {/* Meal card */}
                <div className="ln-meal-card">
                  <div className="ln-meal-card-head">
                    <div>
                      <div className="ln-mch-title">
                        {proxyMode && proxyPerson
                          ? <>Pick lunch <em>for {proxyPerson.name.split(" ")[0]}</em></>
                          : <>What&apos;s <em>for lunch</em>?</>
                        }
                      </div>
                      <div className="ln-mch-sub">Today · Wednesday, May 14 · Served at 13:00</div>
                    </div>
                    <div className="ln-mch-lock">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      Locks 10:30
                    </div>
                  </div>

                  <div className="ln-meal-tiles">
                    {(["veg", "chicken", "egg", "none"] as MealType[]).map(meal => {
                      const info = MEAL_INFO[meal];
                      const isAvail = info.avail === "all" || info.avail === TODAY_DOW;
                      return (
                        <button
                          key={meal}
                          className={`ln-meal-tile ${meal} ${selectedMeal === meal ? "selected" : ""} ${!isAvail ? "unavailable" : ""}`}
                          onClick={() => selectMeal(meal)}
                        >
                          <span className="mt-emoji">{info.emoji}</span>
                          <span className="mt-name">{info.name}</span>
                          <span className="mt-desc">{info.desc}</span>
                          {info.extraLabel && <span className="mt-avail">{info.extraLabel}</span>}
                          <span className="mt-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <div className="ln-meal-tile-foot">
                            <span className="ln-mt-dietary">{info.dietary}</span>
                            <span>{info.kcal}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Extra egg stepper */}
                  <div className="ln-addon-row">
                    <div className={`ln-addon-tile ${eggCount > 0 ? "has-count" : ""}`}>
                      <span className="ln-addon-emoji">🍳</span>
                      <div className="ln-addon-body">
                        <div className="ln-addon-name">Extra egg on the side</div>
                        <div className="ln-addon-desc">{EGG_DESCS[eggCount]}</div>
                      </div>
                      <div className="ln-egg-stepper">
                        <button
                          className={`ln-stepper-btn minus ${eggCount === 0 ? "disabled" : ""}`}
                          onClick={() => changeEgg(-1)}
                        >−</button>
                        <span className={`ln-stepper-count ${eggCount === 0 ? "zero" : ""}`}>
                          {EGG_LABELS[eggCount]}
                        </span>
                        <button
                          className={`ln-stepper-btn plus ${eggCount === 3 ? "disabled" : ""}`}
                          onClick={() => changeEgg(1)}
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <div className="ln-save-row">
                    <div className="ln-save-note">{saveNote}</div>
                    <button className="ln-btn-secondary">Add a note</button>
                    <button className="ln-btn-primary" onClick={saveLunch}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Save lunch
                    </button>
                  </div>
                </div>

                {/* Two col: payment + recent */}
                {!proxyMode && (
                  <div className="ln-two-col">
                    <div className="ln-pay-card">
                      <div className="ln-pc-head">
                        <div className="ln-pc-title">May contribution</div>
                        <div className="ln-pc-status verified"><span className="d" />Verified</div>
                      </div>
                      <div className="ln-pc-amount">
                        <span className="currency">Rs</span>1,500
                        <span className="period">of Rs 2,200 covered · 8 of 11 working days</span>
                      </div>
                      <div className="ln-pc-bar"><div style={{ width: "68%" }} /></div>
                      <div className="ln-pc-bar-meta">
                        <span><strong>Rs 1,500</strong> paid</span>
                        <span><strong>Rs 700</strong> remaining</span>
                      </div>
                      <div className="ln-pc-foot">
                        <button className="ln-btn-primary" onClick={() => goTo("payments")}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12h18M14 5l7 7-7 7" />
                          </svg>
                          Top up
                        </button>
                        <button className="ln-btn-secondary" onClick={() => goTo("payments")}>View log</button>
                      </div>
                    </div>

                    <div className="ln-recent-card">
                      <div className="ln-sec-title" style={{ marginBottom: 6 }}>
                        Recent meals <span className="right">last 5</span>
                      </div>
                      <div className="ln-recent-list">
                        {[
                          { type: "chicken" as const, name: "Chicken Meal", date: "FRI · MAY 8", state: "paid" as const },
                          { type: "veg" as const,     name: "Veg Meal",     date: "THU · MAY 7", state: "paid" as const },
                          { type: "veg" as const,     name: "Veg Meal · extra rice", date: "WED · MAY 6", state: "paid" as const },
                          { type: "egg" as const,     name: "Egg Meal",     date: "TUE · MAY 5", state: "pending" as const },
                          { type: "none" as const,    name: "Skipped",      date: "MON · MAY 4", state: "skip" as const },
                        ].map((row, i) => (
                          <div key={i} className="ln-recent-row">
                            <div className={`ln-recent-chip ${row.type}`}>{MEAL_INFO[row.type].emoji}</div>
                            <div className="ln-recent-meta">
                              <div className="n">{row.name}</div>
                              <div className="d">{row.date}</div>
                            </div>
                            <div className={`ln-recent-state ${row.state}`}>
                              {row.state === "paid" ? "Paid" : row.state === "pending" ? "Pending" : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                {!proxyMode && (
                  <>
                    <div className="ln-sec-title">Quick actions</div>
                    <div className="ln-qa-row">
                      <button className="ln-qa-tile" onClick={() => goTo("weekly")}>
                        <div className="ln-qa-ico green">📅</div>
                        <div className="ln-qa-body">
                          <div className="t">Plan the week</div>
                          <div className="s">Set Tue–Fri picks in 20 seconds.</div>
                        </div>
                      </button>
                      <button className="ln-qa-tile" onClick={() => goTo("payments")}>
                        <div className="ln-qa-ico cool">💸</div>
                        <div className="ln-qa-body">
                          <div className="t">Top up balance</div>
                          <div className="s">Scan QR · eSewa or Khalti. Auto verified.</div>
                        </div>
                      </button>
                      <button className="ln-qa-tile" onClick={() => goTo("suggestions")}>
                        <div className="ln-qa-ico warm">💭</div>
                        <div className="ln-qa-body">
                          <div className="t">Suggest a meal</div>
                          <div className="s">Tell Saraswati di what you&apos;d love.</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ============ WEEKLY PLAN ============ */}
            <div className={`ln-view ${view === "weekly" ? "active" : ""}`}>
              <div className="ln-wrap">
                <div className="ln-week-hero">
                  <div className="ln-week-hero-left">
                    <div className="ln-week-hero-title">Plan the week — <em>5 lunches</em>, one minute</div>
                    <div className="ln-week-hero-sub">Tap a meal pill on each day. Changes save instantly.</div>
                  </div>
                  <div className="ln-week-hero-stat">
                    <div className="ln-whs-num"><span>{plannedCount}</span><span className="slash">/</span><span>5</span></div>
                    <div className="ln-whs-lbl">Planned</div>
                  </div>
                </div>

                <div className="ln-week-rows">
                  {WEEK.map((day, di) => {
                    const curMeal = weekMeals[di];
                    return (
                      <div key={day.key} className={`ln-week-row ${day.isToday ? "today" : ""}`}>
                        <div className="ln-wr-day">
                          <div className="ln-wr-day-name">{day.label}</div>
                          <div className="ln-wr-day-date">{day.date}</div>
                        </div>
                        <div className="ln-wr-meals">
                          {day.availableMeals.map(m => (
                            <button
                              key={m}
                              className={`ln-wr-meal-pill ${m} ${curMeal === m ? "active" : ""}`}
                              onClick={() => {
                                const next = [...weekMeals];
                                next[di] = m;
                                setWeekMeals(next);
                                showToast(`${MEAL_INFO[m].name} · ${day.label}`);
                              }}
                            >
                              <span className="wmp-emoji">{MEAL_INFO[m].emoji}</span>
                              {MEAL_INFO[m].name}
                            </button>
                          ))}
                        </div>
                        <div className="ln-wr-status">
                          <span className={`ln-wr-status-dot ${day.status}`} />
                          {day.status === "paid" ? "Paid" : day.status === "pending" ? "Pending" : "Not set"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ============ HISTORY ============ */}
            <div className={`ln-view ${view === "history" ? "active" : ""}`}>
              <div className="ln-wrap">
                <div className="ln-hist-head">
                  <div className="ln-hist-title">History</div>
                  <div className="ln-hist-month">
                    <button className="arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <span className="lbl">May 2025</span>
                    <button className="arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>

                <div className="ln-hist-grid">
                  <div className="ln-hist-cal">
                    <div className="ln-cal-grid">
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(h => (
                        <div key={h} className="ln-cal-h">{h}</div>
                      ))}
                      {CAL_CELLS.map((cell, i) => (
                        <div
                          key={i}
                          className={`ln-cal-cell ${cell.type} ${cell.day === calSelected ? "selected" : ""}`}
                          onClick={() => cell.type !== "empty" && cell.day > 0 && setCalSelected(cell.day)}
                        >
                          {cell.day > 0 && <span className="d">{cell.day}</span>}
                          {cell.emoji && cell.type !== "weekend" && cell.type !== "empty" && (
                            <span className="e">{cell.emoji}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="ln-cal-legend">
                      {(["veg","chicken","egg","none"] as const).map(t => (
                        <div key={t} className="item">
                          <div className={`sw ${t}`} />
                          {MEAL_INFO[t].name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ln-hist-side">
                    <div className="ln-hist-stats">
                      <div className="lbl">This month</div>
                      {[
                        { type: "veg" as const,     count: 14, pct: 70 },
                        { type: "chicken" as const, count: 4,  pct: 20 },
                        { type: "egg" as const,     count: 2,  pct: 10 },
                        { type: "none" as const,    count: 2,  pct: 10 },
                      ].map(row => (
                        <div key={row.type} className="ln-stat-row">
                          <div className={`sw ${row.type}`}>{MEAL_INFO[row.type].emoji}</div>
                          <div className="nm">{MEAL_INFO[row.type].name}</div>
                          <div className="ct">{row.count}</div>
                          <div className="bar"><div className={row.type} style={{ width: `${row.pct}%` }} /></div>
                        </div>
                      ))}
                    </div>

                    <div className="ln-hist-detail">
                      <div className="ln-hd-date">
                        <span className="day-of">Wednesday</span>
                        May {calSelected ?? 14}, 2025
                      </div>
                      <div className={`ln-hd-pick chicken`}>
                        <span className="pe">🍗</span>
                        <div>
                          <div className="nm">Chicken Meal</div>
                          <div className="desc">Curry · rice · salad</div>
                        </div>
                      </div>
                      <div className="ln-hd-rows">
                        <div className="ln-hd-row"><span className="k">Meal</span><span className="v">Chicken</span></div>
                        <div className="ln-hd-row"><span className="k">Extra egg</span><span className="v">None</span></div>
                        <div className="ln-hd-row"><span className="k">Amount</span><span className="v">Rs 280</span></div>
                        <div className="ln-hd-row"><span className="k">Payment</span><span className="v tagged">Verified</span></div>
                        <div className="ln-hd-row"><span className="k">Served</span><span className="v">13:04</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============ PAYMENTS ============ */}
            <div className={`ln-view ${view === "payments" ? "active" : ""}`}>
              <div className="ln-wrap">
                <div className="ln-pay-head">
                  <div className="ln-pay-title">Payments</div>
                  <div className="ln-pay-balance">
                    <div className="lbl">Current balance</div>
                    <div className="val"><span className="currency">Rs</span>1,500</div>
                  </div>
                </div>

                <div className="ln-pay-grid">
                  <div className="ln-contrib">
                    <h3>Top up balance</h3>
                    <div className="sub">Choose an amount or enter custom · auto-verified via eSewa / Khalti</div>
                    <div className="ln-amount-row">
                      {[
                        { amt: 500,  label: "2 weeks", note: "≈ 10 meals" },
                        { amt: 1000, label: "1 month",  note: "≈ 20 meals" },
                        { amt: 1500, label: "top-up",   note: "≈ 30 meals" },
                      ].map((a, i) => (
                        <button
                          key={a.amt}
                          className={`ln-amount-tile ${selectedAmt === i ? "selected" : ""}`}
                          onClick={() => { setSelectedAmt(i); setQrAmt(a.amt.toLocaleString("en-IN")); }}
                        >
                          <div className="small">{a.label.toUpperCase()}</div>
                          <div className="num"><span className="currency">Rs</span>{a.amt.toLocaleString("en-IN")}</div>
                          <div className="note">{a.note}</div>
                        </button>
                      ))}
                    </div>
                    <div className="ln-amount-custom">
                      <span className="lbl">Custom</span>
                      <span className="currency">Rs</span>
                      <input
                        placeholder="0"
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          if (v) { setSelectedAmt(-1); setQrAmt(parseInt(v).toLocaleString("en-IN")); }
                        }}
                      />
                    </div>
                    <button
                      className="ln-btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        const amtNum = parseInt(qrAmt.replace(/[^0-9]/g, "")) || 0;
                        const now = new Date();
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
                        const txId = `#TX${Math.floor(1000 + Math.random() * 9000)}`;
                        const providerName = qrProvider === "esewa" ? "eSewa" : "Khalti";
                        setTxLog(prev => [
                          {
                            ico: "💸",
                            name: "Top-up",
                            sub: `${providerName} · ${txId}`,
                            amt: `+ Rs ${amtNum.toLocaleString("en-IN")}`,
                            date: dateStr,
                            state: "unverified",
                          },
                          ...prev,
                        ]);
                        showToast("Submitted · awaiting admin verification");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      I have paid
                    </button>
                  </div>

                  <div className="ln-qr-card">
                    <div className="ln-qr-head">
                      <div className="title">Scan to pay</div>
                      <div className="ln-qr-providers">
                        <button
                          className={`p ${qrProvider === "esewa" ? "active" : ""}`}
                          onClick={() => setQrProvider("esewa")}
                        >eSewa</button>
                        <button
                          className={`p ${qrProvider === "khalti" ? "active" : ""}`}
                          onClick={() => setQrProvider("khalti")}
                        >Khalti</button>
                      </div>
                    </div>
                    <div className="ln-qr-frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrProvider === "esewa" ? "/qr/esewa.png" : "/qr/khalti.png"}
                        alt={`${qrProvider} QR`}
                        className="ln-qr-img"
                      />
                    </div>
                    <div className="ln-qr-amount"><span className="currency">Rs</span>{qrAmt}</div>
                    <div className="ln-qr-foot">
                      <div className="ln-qr-hint">Scan with {qrProvider === "esewa" ? "eSewa" : "Khalti"} · then tap “I have paid”</div>
                    </div>
                  </div>
                </div>

                <div className="ln-log-card">
                  <div className="ln-log-head">
                    <div className="t">Transaction log</div>
                    <div className="ln-log-filters">
                      {["All", "Paid", "Pending"].map(f => (
                        <button key={f} className={`ln-log-filter ${f === "All" ? "active" : ""}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  {txLog.map((row, i) => (
                    <div key={i} className="ln-log-row">
                      <div className={`ico ${row.ico === "💸" ? "in" : ""}`}>{row.ico}</div>
                      <div className="nm">{row.name}<span className="sub">{row.sub}</span></div>
                      <div className="amt">{row.amt}</div>
                      <div className="date">{row.date}</div>
                      <div className={`state ${row.state}`}>{row.state}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ============ SUGGESTIONS ============ */}
            <div className={`ln-view ${view === "suggestions" ? "active" : ""}`}>
              <div className="ln-wrap">
                <div className="ln-sug-head">
                  <div>
                    <div className="ln-sug-title">Suggest a <em>meal</em></div>
                    <div className="ln-sug-sub">Help Saraswati di plan better. All suggestions are anonymous unless you choose to sign your name.</div>
                  </div>
                </div>

                <div className="ln-sug-grid">
                  <div className="ln-sug-card">
                    <div className="ln-sug-card-h">Quick tags</div>
                    <div className="ln-sug-card-sub">Select all that apply</div>
                    <div className="ln-chip-row">
                      {SUGGESTION_CHIPS.map((c, i) => (
                        <button
                          key={i}
                          className={`ln-chip ${chips.has(i) ? "on" : ""}`}
                          onClick={() => {
                            const next = new Set(chips);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            setChips(next);
                          }}
                        >
                          <span className="plus">{chips.has(i) ? "+" : "+"}</span>
                          {c}
                        </button>
                      ))}
                    </div>
                    <textarea className="ln-sug-textarea" placeholder="Describe your suggestion in detail… (e.g. more protein options on Fridays)" />
                    <div className="ln-sug-foot">
                      <span className="note">Seen by Saraswati di · reviewed weekly</span>
                      <button className="ln-btn-primary" onClick={() => showToast("Suggestion submitted!")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Submit
                      </button>
                    </div>
                  </div>

                  <div className="ln-wall-card">
                    <div className="ln-sec-title" style={{ marginBottom: 12 }}>
                      Community wall <span className="kick">THIS WEEK</span>
                    </div>
                    {[
                      { initials: "RK", color: "linear-gradient(135deg,#f97316,#db2777)", text: <><strong>Rakesh</strong> loved the mushroom dal last Thursday — wants it weekly!</>, time: "2h ago", upvotes: 8 },
                      { initials: "MS", color: "linear-gradient(135deg,#06b6d4,#3b82f6)", text: <><strong>Mira</strong> suggests adding a soup option on cold days.</>, time: "5h ago", upvotes: 14 },
                      { initials: "JT", color: "linear-gradient(135deg,#8b5cf6,#ec4899)", text: <><strong>Jaya</strong> requests more egg options — maybe scrambled as an add-on?</>, time: "1d ago", upvotes: 6 },
                    ].map((w, i) => (
                      <div key={i} className="ln-wall-row">
                        <div className="ln-wall-av" style={{ background: w.color }}>{w.initials}</div>
                        <div className="ln-wall-body">
                          <div className="l">{w.text}</div>
                          <div className="meta">
                            <span>{w.time}</span>
                            <span className="up">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              {w.upvotes}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>{/* /ln-workspace */}
        </main>

        {/* ── Tweaks panel ── */}
        <div className={`ln-tweaks ${tweaksOpen ? "show" : ""}`}>
          <h4>
            Tweaks
            <button className="ln-tweaks-x" onClick={() => setTweaksOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </h4>
          <div className="sub">Demo controls for design review</div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Banner state</div>
            <div className="ln-tweak-row">
              <button className="ln-tweak-btn on">Submitted</button>
              <button className="ln-tweak-btn">Not set</button>
              <button className="ln-tweak-btn">Locked</button>
            </div>
          </div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Payment</div>
            <div className="ln-tweak-row">
              <button className="ln-tweak-btn on">Verified</button>
              <button className="ln-tweak-btn">Pending</button>
              <button className="ln-tweak-btn">Failed</button>
            </div>
          </div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Density</div>
            <div className="ln-tweak-row">
              <button className="ln-tweak-btn on">Default</button>
              <button className="ln-tweak-btn">Compact</button>
            </div>
          </div>
        </div>

        {/* ── Person picker modal ── */}
        <div className={`ln-pp-backdrop ${pickerOpen ? "open" : ""}`} onClick={e => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
          <div className="ln-pp-box">
            <div className="ln-pp-head">
              <div className="ln-pp-title">Submit for <em>a teammate</em></div>
              <div className="ln-pp-sub">Choose who you&apos;re submitting for. They&apos;ll see your name as the source, but their data stays private.</div>
            </div>
            <div className="ln-pp-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="ln-pp-search"
                placeholder="Search teammates…"
                value={ppSearch}
                onChange={e => setPpSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="ln-pp-list">
              {filteredTeammates.map(t => (
                <button key={t.name} className="ln-pp-row" onClick={() => enterProxy(t)}>
                  <div className="ln-pp-av" style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <div className="ln-pp-name">{t.name}</div>
                    <div className="ln-pp-team">{t.team}</div>
                  </div>
                  <div className={`ln-pp-status ${t.status}`}>{t.status}</div>
                </button>
              ))}
            </div>
            <div className="ln-pp-foot">
              <div className="ln-pp-foot-note">Only today&apos;s meal · their history stays private</div>
              <button className="ln-pp-cancel" onClick={() => setPickerOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>

        {/* ── Toast ── */}
        <div className={`ln-toast ${toastShow ? "show" : ""}`}>
          <div className="ln-toast-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {toastMsg}
        </div>
      </div>
    </div>
  );
}
