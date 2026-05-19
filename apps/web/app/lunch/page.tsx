"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import OGSidebar from "@/components/OGSidebar";
import { useAuthStore } from "@/lib/authStore";
import {
  lunchApi,
  usersApi,
  workspacesApi,
  type ApiMeal,
  type ApiLunchOrder,
  type ApiCutoff,
  type ApiCalendarCell,
  type ApiLunchTransaction,
  type ApiSuggestion,
  type ApiUserSearchResult,
} from "@/lib/api";
import { pushToast } from "@/hooks/useToast";
import "./lunch.css";
import "../projects/projects.css";

type LunchView = "today" | "weekly" | "history" | "payments" | "suggestions" | "admin";
type ColorKey = "veg" | "chicken" | "egg" | "none";
type PayStatus = "paid" | "pending" | "notset";

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SUGGESTION_CHIPS = [
  "More variety", "Less spicy", "Extra portion", "Vegan options", "Faster service", "Feedback on today", "Special diet",
];

const EGG_LABELS = ["none", "1 egg", "2 eggs", "3 eggs"];
const EGG_DESCS = [
  "Boiled or fried · available every day · Rs 25 each",
  "1 extra egg · boiled or fried · + Rs 25",
  "2 extra eggs · boiled or fried · + Rs 50",
  "3 extra eggs · boiled or fried · + Rs 75",
];

function colorKey(mealKey: string | undefined | null): ColorKey {
  if (!mealKey) return "veg";
  const k = mealKey.toLowerCase();
  if (k.includes("chicken") || k.includes("meat")) return "chicken";
  if (k.includes("egg")) return "egg";
  if (k === "none" || k.includes("skip")) return "none";
  return "veg";
}

function fmtRs(minor: number) {
  return `${(minor / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeekMon(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function LunchPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loaded = useAuthStore(s => s.loaded);

  useEffect(() => {
    if (loaded && !user) router.replace("/login");
  }, [loaded, user, router]);

  // ── State ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<LunchView>("today");
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [cutoff, setCutoff] = useState<ApiCutoff | null>(null);
  const [todayOrder, setTodayOrder] = useState<ApiLunchOrder | null>(null);
  const [selectedMealId, setSelectedMealId] = useState<string>("");
  const [eggCount, setEggCount] = useState(0);
  const [weekOrders, setWeekOrders] = useState<ApiLunchOrder[]>([]);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<ApiLunchTransaction[]>([]);
  const [calendar, setCalendar] = useState<ApiCalendarCell[]>([]);
  const [calMonth, setCalMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [calSelected, setCalSelected] = useState<number | null>(new Date().getDate());

  const [isAdmin, setIsAdmin] = useState(false);

  const [proxyMode, setProxyMode] = useState(false);
  const [proxyTarget, setProxyTarget] = useState<ApiUserSearchResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ppSearch, setPpSearch] = useState("");
  const [ppResults, setPpResults] = useState<ApiUserSearchResult[]>([]);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveNote, setSaveNote] = useState("Pick today's meal then hit Save.");
  const [clock, setClock] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);

  const [selectedAmt, setSelectedAmt] = useState<number>(1);
  const [qrAmt, setQrAmt] = useState("1,500");
  const [qrProvider, setQrProvider] = useState<"esewa" | "khalti">("esewa");
  const [customAmt, setCustomAmt] = useState("");

  const [chips, setChips] = useState<Set<number>>(new Set());
  const [suggestionBody, setSuggestionBody] = useState("");

  // Admin sub-state
  const [adminTab, setAdminTab] = useState<"meals" | "topups" | "kitchen" | "suggestions" | "cutoff">("meals");
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [kitchen, setKitchen] = useState<any | null>(null);
  const [kitchenDate, setKitchenDate] = useState(fmtDateKey(new Date()));
  const [adminSuggestions, setAdminSuggestions] = useState<ApiSuggestion[]>([]);
  const [sugStatus, setSugStatus] = useState("open");
  const [newMeal, setNewMeal] = useState({
    key: "", name: "", emoji: "🥗", description: "", basePriceMinor: 5000,
    availableDows: [1, 2, 3, 4, 5] as number[], sortOrder: 0,
  });

  // ── Derived ───────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayKey = fmtDateKey(today);
  const todayDow = today.getDay();

  const weekStart = useMemo(() => startOfWeekMon(today), [today]);
  const week = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return {
        key: fmtDateKey(d),
        date: d,
        label: DOW_SHORT[d.getDay()],
        dateNum: d.getDate(),
        month: MONTHS[d.getMonth()],
        isToday: fmtDateKey(d) === todayKey,
        dow: d.getDay(),
      };
    });
  }, [weekStart, todayKey]);

  const todayMeals = useMemo(() => meals.filter(m => m.availableDows.includes(todayDow)), [meals, todayDow]);
  const selectedMeal = useMemo(() => meals.find(m => m.id === selectedMealId), [meals, selectedMealId]);

  const eggAddon = useMemo(() => {
    return meals.flatMap(m => m.addons ?? []).find(a => a.key === "egg_extra");
  }, [meals]);

  const orderTotalMinor = selectedMeal
    ? selectedMeal.basePriceMinor + (eggAddon ? eggAddon.unitPriceMinor * eggCount : 0)
    : 0;

  const cutoffPassed = useMemo(() => {
    if (!cutoff) return false;
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    return now >= cutoff.cutoffHour * 60 + cutoff.cutoffMinute + cutoff.gracePeriodMinutes;
  }, [cutoff]);

  const cutoffLabel = cutoff
    ? `${String(cutoff.cutoffHour).padStart(2, "0")}:${String(cutoff.cutoffMinute).padStart(2, "0")}`
    : "10:30";

  const minutesUntilCutoff = useMemo(() => {
    if (!cutoff) return null;
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    const lock = cutoff.cutoffHour * 60 + cutoff.cutoffMinute;
    return lock - now;
  }, [cutoff]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2400);
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────
  const fetchToday = useCallback(async () => {
    try {
      const orders = await lunchApi.orders(todayKey, todayKey);
      const o = orders[0] ?? null;
      setTodayOrder(o);
      if (o) {
        setSelectedMealId(o.mealId);
        setEggCount((o.addons as any)?.egg_extra ?? 0);
      }
    } catch { /* */ }
  }, [todayKey]);

  const fetchWallet = useCallback(async () => {
    try {
      const w = await lunchApi.wallet();
      setBalance(w.balanceMinor);
      setTransactions(w.recent);
    } catch { /* */ }
  }, []);

  const fetchWeek = useCallback(async () => {
    if (!user) return;
    const end = new Date(weekStart); end.setDate(weekStart.getDate() + 4);
    try {
      const o = await lunchApi.orders(fmtDateKey(weekStart), fmtDateKey(end));
      setWeekOrders(o);
    } catch { /* */ }
  }, [user, weekStart]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [m, c] = await Promise.all([lunchApi.meals(), lunchApi.cutoff()]);
        setMeals(m);
        setCutoff(c);
      } catch { /* */ }
    })();
    fetchToday();
    fetchWallet();
    workspacesApi.listMine().then(list => {
      const cur = list.find(w => w.isDefault) ?? list[0];
      if (cur && (cur.role === "admin" || cur.role === "owner" || cur.isOwner)) setIsAdmin(true);
    }).catch(() => {});
  }, [user, fetchToday, fetchWallet]);

  useEffect(() => { fetchWeek(); }, [fetchWeek, todayOrder?.id]);

  useEffect(() => {
    if (!user) return;
    lunchApi.calendar(calMonth).then(setCalendar).catch(() => {});
  }, [user, calMonth]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setClock(`${DOW_SHORT[d.getDay()]} · ${hh}:${mm}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Person picker search
  useEffect(() => {
    if (ppSearch.trim().length < 1) { setPpResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      usersApi.search(ppSearch).then(r => { if (!cancelled) setPpResults(r); }).catch(() => {});
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [ppSearch]);

  // Picker Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && pickerOpen) setPickerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  // Admin loaders
  useEffect(() => { if (view === "admin" && adminTab === "topups") lunchApi.pendingTopups().then(setPendingTopups).catch(() => {}); }, [view, adminTab]);
  useEffect(() => { if (view === "admin" && adminTab === "kitchen") lunchApi.kitchenSheet(kitchenDate).then(setKitchen).catch(() => setKitchen(null)); }, [view, adminTab, kitchenDate]);
  useEffect(() => { if (view === "admin" && adminTab === "suggestions") lunchApi.listSuggestions(sugStatus).then(setAdminSuggestions).catch(() => {}); }, [view, adminTab, sugStatus]);

  // ── Mutations ─────────────────────────────────────────────────────────
  function selectMeal(meal: ApiMeal) {
    if (cutoffPassed) return;
    setSelectedMealId(meal.id);
    const suffix = eggCount > 0 && meal.key !== "none" ? ` + ${EGG_LABELS[eggCount]}` : "";
    setSaveNote(`Changed to ${meal.name}${suffix}. Don't forget to save.`);
  }

  function changeEgg(delta: number) {
    if (cutoffPassed) return;
    const max = eggAddon?.maxQty ?? 3;
    const next = Math.max(0, Math.min(max, eggCount + delta));
    if (next === eggCount) return;
    setEggCount(next);
    showToast(next === 0 ? "Extra egg removed" : `${EGG_LABELS[next]} on the side`);
    if (selectedMeal) {
      const suffix = next > 0 && selectedMeal.key !== "none" ? ` + ${EGG_LABELS[next]}` : "";
      setSaveNote(`Changed to ${selectedMeal.name}${suffix}. Don't forget to save.`);
    }
  }

  async function saveLunch() {
    if (!selectedMealId || !selectedMeal) return pushToast("Pick a meal first", "error");
    const addons: Record<string, number> = eggCount > 0 ? { egg_extra: eggCount } : {};
    try {
      let result: ApiLunchOrder;
      if (todayOrder) {
        result = await lunchApi.updateOrder(todayOrder.id, { mealId: selectedMealId, addons });
      } else {
        result = await lunchApi.placeOrder({
          date: todayKey,
          mealId: selectedMealId,
          addons,
          onBehalfOfUserId: proxyTarget?.id,
        });
      }
      setTodayOrder(result);
      const suffix = eggCount > 0 && selectedMeal.key !== "none" ? ` + ${EGG_LABELS[eggCount]}` : "";
      const who = proxyMode && proxyTarget ? ` for ${proxyTarget.name.split(" ")[0]}` : "";
      showToast(`Saved · ${selectedMeal.name.toLowerCase()}${suffix}${who}`);
      setSaveNote(`Saved · ${selectedMeal.name}${suffix}. Change anytime before ${cutoffLabel}.`);
      fetchWallet();
      fetchWeek();
    } catch (e: any) {
      pushToast(e?.message ?? "Failed to save", "error");
    }
  }

  async function placeForDay(date: string, mealId: string) {
    try {
      const existing = weekOrders.find(o => fmtDateKey(new Date(o.date)) === date);
      if (existing) await lunchApi.updateOrder(existing.id, { mealId });
      else await lunchApi.placeOrder({ date, mealId, addons: {} });
      fetchWeek();
      fetchWallet();
      const m = meals.find(x => x.id === mealId);
      showToast(`${m?.name ?? "Meal"} saved`);
    } catch (e: any) {
      pushToast(e?.message ?? "Failed", "error");
    }
  }

  async function doTopup() {
    const amtRupees = parseInt((customAmt || qrAmt).replace(/[^0-9]/g, "")) || 0;
    if (amtRupees <= 0) return pushToast("Enter an amount", "error");
    try {
      await lunchApi.topup(amtRupees * 100, qrProvider);
      showToast("Submitted · awaiting admin verification");
      fetchWallet();
    } catch (e: any) {
      pushToast(e?.message ?? "Failed", "error");
    }
  }

  async function submitSuggestion() {
    const body = suggestionBody.trim();
    if (body.length < 3) return pushToast("Add a few words first", "error");
    const tags = Array.from(chips).map(i => SUGGESTION_CHIPS[i]).join(", ");
    const category = tags || "General";
    try {
      await lunchApi.createSuggestion(category, body);
      setSuggestionBody("");
      setChips(new Set());
      showToast("Suggestion submitted!");
    } catch (e: any) {
      pushToast(e?.message ?? "Failed", "error");
    }
  }

  function enterProxy(person: ApiUserSearchResult) {
    setProxyMode(true);
    setProxyTarget(person);
    setPickerOpen(false);
    setPpSearch("");
    showToast(`Now submitting for ${person.name.split(" ")[0]}`);
  }
  function exitProxy() {
    setProxyMode(false);
    setProxyTarget(null);
    showToast("Back to your own lunch");
  }

  // ── Admin actions ─────────────────────────────────────────────────────
  const reloadMeals = useCallback(() => lunchApi.meals().then(setMeals).catch(() => {}), []);
  const toggleAdminDow = (dow: number) => {
    setNewMeal(m => ({
      ...m,
      availableDows: m.availableDows.includes(dow) ? m.availableDows.filter(d => d !== dow) : [...m.availableDows, dow].sort(),
    }));
  };
  const createAdminMeal = async () => {
    if (!newMeal.key || !newMeal.name) return pushToast("Key + name required", "error");
    try {
      await lunchApi.createMeal(newMeal);
      pushToast("Meal added", "success");
      setNewMeal({ key: "", name: "", emoji: "🥗", description: "", basePriceMinor: 5000, availableDows: [1,2,3,4,5], sortOrder: 0 });
      reloadMeals();
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const toggleMealActive = async (m: ApiMeal) => {
    try { await lunchApi.updateMeal(m.id, { active: !m.active }); reloadMeals(); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const deleteAdminMeal = async (id: string) => {
    if (!confirm("Delete this meal?")) return;
    try { await lunchApi.deleteMeal(id); reloadMeals(); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const toggleMealDow = async (meal: ApiMeal, dow: number) => {
    const next = meal.availableDows.includes(dow)
      ? meal.availableDows.filter(d => d !== dow)
      : [...meal.availableDows, dow].sort();
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, availableDows: next } : m));
    try { await lunchApi.updateMeal(meal.id, { availableDows: next }); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); reloadMeals(); }
  };
  const patchMealField = async (meal: ApiMeal, patch: Partial<ApiMeal>) => {
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, ...patch } : m));
    try { await lunchApi.updateMeal(meal.id, patch); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); reloadMeals(); }
  };
  const seedSampleMeals = async () => {
    const samples = [
      { key: "veg", name: "Veg", emoji: "🥗", description: "Dal · rice · sabzi", basePriceMinor: 5000, availableDows: [1,2,3,4,5], sortOrder: 0 },
      { key: "chicken", name: "Chicken", emoji: "🍗", description: "Curry · rice · salad", basePriceMinor: 9000, availableDows: [3], extraLabel: "Wed special", sortOrder: 1 },
      { key: "egg", name: "Egg Curry", emoji: "🥚", description: "Curry · rice · sabzi", basePriceMinor: 6500, availableDows: [1], extraLabel: "Mon special", sortOrder: 2 },
      { key: "none", name: "Skip", emoji: "🚫", description: "No lunch today", basePriceMinor: 0, availableDows: [1,2,3,4,5], sortOrder: 99 },
    ];
    try {
      for (const s of samples) {
        if (meals.some(m => m.key === s.key)) continue;
        await lunchApi.createMeal(s);
      }
      pushToast("Sample menu loaded", "success");
      reloadMeals();
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const verifyTopup = async (id: string) => {
    try {
      await lunchApi.verifyTopup(id);
      setPendingTopups(prev => prev.filter(p => p.id !== id));
      pushToast("Verified", "success");
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const saveCutoff = async () => {
    if (!cutoff) return;
    try { const updated = await lunchApi.setCutoff(cutoff); setCutoff(updated); pushToast("Cutoff saved", "success"); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };
  const setSugStatusAction = async (id: string, status: string) => {
    try { await lunchApi.setSuggestionStatus(id, status); setAdminSuggestions(prev => prev.filter(s => s.id !== id)); }
    catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };

  // ── Sidebar config ────────────────────────────────────────────────────
  const VIEWS: { key: LunchView; emoji: string; label: string; badge?: string; badgeType?: string; visible?: boolean }[] = [
    { key: "today",       emoji: "☀️", label: "Today",       badge: "LIVE",   badgeType: "live" },
    { key: "weekly",      emoji: "📅", label: "Weekly Plan", badge: `W${isoWeekNumber(today)}` },
    { key: "history",     emoji: "📓", label: "History" },
    { key: "payments",    emoji: "💸", label: "Payments" },
    { key: "suggestions", emoji: "💡", label: "Suggestions" },
    { key: "admin",       emoji: "🛠", label: "Admin", visible: isAdmin },
  ];
  const VIEW_LABELS: Record<LunchView, string> = {
    today: "Today", weekly: "Weekly Plan", history: "History",
    payments: "Payments", suggestions: "Suggestions", admin: "Admin",
  };

  // Helpers for rendering
  const dayStatus = (key: string): PayStatus => {
    const o = weekOrders.find(x => fmtDateKey(new Date(x.date)) === key);
    if (!o) return "notset";
    if (o.status === "paid") return "paid";
    return "pending";
  };
  const dayMealFor = (key: string): ApiMeal | null => {
    const o = weekOrders.find(x => fmtDateKey(new Date(x.date)) === key);
    if (!o) return null;
    return meals.find(m => m.id === o.mealId) ?? null;
  };

  const plannedCount = useMemo(
    () => week.filter(d => weekOrders.some(o => fmtDateKey(new Date(o.date)) === d.key)).length,
    [week, weekOrders],
  );

  // History grid (cal cells aligned Mon-start)
  const calCells = useMemo(() => {
    const [yr, mo] = calMonth.split("-").map(Number);
    const first = new Date(yr, mo - 1, 1);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    // Mon-start offset
    const firstDow = (first.getDay() + 6) % 7;
    const cells: { day: number; type: ColorKey | "empty" | "weekend"; emoji: string; mealName?: string; cost?: number }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, type: "empty", emoji: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(yr, mo - 1, d);
      const dow = date.getDay();
      const dateKey = `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (dow === 0 || dow === 6) { cells.push({ day: d, type: "weekend", emoji: "" }); continue; }
      const cell = calendar.find(c => c.date === dateKey);
      if (cell) cells.push({ day: d, type: colorKey(cell.mealKey), emoji: cell.emoji, mealName: cell.mealName, cost: cell.totalCostMinor });
      else cells.push({ day: d, type: "empty", emoji: "" });
    }
    return cells;
  }, [calMonth, calendar]);

  const selectedHistoryCell = useMemo(() => {
    if (calSelected == null) return null;
    const [yr, mo] = calMonth.split("-").map(Number);
    const dateKey = `${yr}-${String(mo).padStart(2, "0")}-${String(calSelected).padStart(2, "0")}`;
    return calendar.find(c => c.date === dateKey) ?? null;
  }, [calSelected, calMonth, calendar]);

  // Month stats
  const monthStats = useMemo(() => {
    const buckets: Record<ColorKey, number> = { veg: 0, chicken: 0, egg: 0, none: 0 };
    let total = 0;
    for (const c of calendar) {
      const k = colorKey(c.mealKey);
      buckets[k]++; total++;
    }
    return { buckets, total };
  }, [calendar]);

  // Recent meals (last 5 from week orders + earlier calendar)
  const recentMeals = useMemo(() => {
    const cal = calendar
      .filter(c => new Date(c.date) <= today)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);
    return cal.map(c => ({
      meal: meals.find(m => m.key === c.mealKey),
      color: colorKey(c.mealKey),
      emoji: c.emoji,
      name: c.mealName,
      date: c.date,
      state: c.status === "paid" ? "paid" : c.status === "pending" ? "pending" : c.mealKey === "none" ? "skip" : "paid",
    }));
  }, [calendar, meals, today]);

  // ── Render ────────────────────────────────────────────────────────────
  const todayLockText =
    minutesUntilCutoff == null ? `editable today` :
    minutesUntilCutoff <= 0 ? `locked` :
    minutesUntilCutoff < 60 ? `editable for ${minutesUntilCutoff}m` :
    `editable for ${Math.floor(minutesUntilCutoff / 60)}h`;

  const sidebarTodayPick = todayOrder
    ? { emoji: meals.find(m => m.id === todayOrder.mealId)?.emoji ?? "🍱", name: meals.find(m => m.id === todayOrder.mealId)?.name ?? "Set" }
    : selectedMeal
      ? { emoji: selectedMeal.emoji, name: selectedMeal.name }
      : { emoji: "—", name: "Not set" };

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
              {VIEWS.filter(v => v.visible !== false).map(v => (
                <button
                  key={v.key}
                  className={`pn-item ${view === v.key ? "active" : ""}`}
                  onClick={() => setView(v.key)}
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
                <span className="pe">{sidebarTodayPick.emoji}</span>
                {sidebarTodayPick.name}
              </div>
              <div className="countdown">
                <span className="dot" />
                {cutoffPassed ? "Locked for today" : todayLockText}
              </div>
            </div>

            <div className="ln-sb-today" style={{ marginTop: 8 }}>
              <div className="lbl">Wallet</div>
              <div className="pick">
                <span className="pe">💰</span>
                Rs {fmtRs(balance)}
              </div>
              <div className="countdown">
                <span className="dot" />
                Cutoff {cutoffLabel}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main workspace ── */}
        <main className="ln-main">
          <div className="ln-topbar">
            <div className="ln-crumbs">
              Lunch
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
              <strong>{VIEW_LABELS[view]}</strong>
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

          <div className="ln-workspace">

            {/* ============ TODAY ============ */}
            <div className={`ln-view ${view === "today" ? "active" : ""}`}>
              <div className="ln-wrap">

                {/* Proxy bar */}
                <div className={`ln-proxy-bar ${proxyMode ? "show" : ""}`}>
                  <span className="ln-pb-stripe" />
                  <div className="ln-pb-av" style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}>
                    {proxyTarget?.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="ln-pb-text">
                    <div className="ln-pb-line-1">Submitting for <strong>{proxyTarget?.name}</strong></div>
                    <div className="ln-pb-line-2">Today only · their data stays private · your name attached as source</div>
                  </div>
                  <button className="ln-pb-exit" onClick={exitProxy}>Exit · back to mine</button>
                </div>

                {/* Status banner */}
                <div className="ln-status-banner">
                  <span className="ln-sb-dot" />
                  <div className="ln-sb-text">
                    <div className="h">
                      {proxyMode && proxyTarget
                        ? <>Pick lunch <em>for {proxyTarget.name.split(" ")[0]}</em></>
                        : todayOrder
                          ? <>Today&apos;s lunch · <em>{meals.find(m => m.id === todayOrder.mealId)?.name ?? "Set"}</em></>
                          : <>Today · <em>not set</em></>
                      }
                    </div>
                    <div className="s">
                      {cutoffPassed
                        ? <>Locked · pickup at lunchtime</>
                        : <>Editable for the next <span className="lock">{minutesUntilCutoff != null ? `${Math.max(minutesUntilCutoff, 0)} min` : todayLockText}</span> · locks at {cutoffLabel}</>
                      }
                    </div>
                  </div>
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
                  <span className="kick">W{isoWeekNumber(today)} · {week[0].month} {week[0].dateNum}–{week[4].dateNum}</span>
                  <span className="right">Tap a day to plan</span>
                </div>
                <div className="ln-day-strip">
                  {week.map((day, i) => {
                    const dm = dayMealFor(day.key);
                    const st = dayStatus(day.key);
                    return (
                      <button
                        key={day.key}
                        className={`ln-day-pill ${day.isToday ? "today" : ""} ${i === selectedDay ? "active" : ""} ${!dm ? "none" : ""}`}
                        onClick={() => { setSelectedDay(i); if (day.isToday) setView("today"); else setView("weekly"); }}
                      >
                        <div className="ln-dp-top">
                          <span className="ln-dp-day">{day.label}</span>
                          <span className={`ln-dp-status ${st}`} />
                        </div>
                        <div className="ln-dp-meal">
                          <span className="pe">{dm?.emoji ?? "—"}</span>
                          <span className="lbl">{dm?.name ?? "Not set"}</span>
                        </div>
                        <div className="ln-dp-date">{day.month} {day.dateNum}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Meal card */}
                <div className="ln-meal-card">
                  <div className="ln-meal-card-head">
                    <div>
                      <div className="ln-mch-title">
                        {proxyMode && proxyTarget
                          ? <>Pick lunch <em>for {proxyTarget.name.split(" ")[0]}</em></>
                          : <>What&apos;s <em>for lunch</em>?</>
                        }
                      </div>
                      <div className="ln-mch-sub">Today · {DOW_LONG[todayDow]}, {MONTHS_FULL[today.getMonth()]} {today.getDate()} · Served at 13:00</div>
                    </div>
                    <div className="ln-mch-lock">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      Locks {cutoffLabel}
                    </div>
                  </div>

                  <div className="ln-meal-tiles">
                    {todayMeals.length === 0 && (
                      <div style={{ gridColumn: "1 / -1", padding: 24, opacity: 0.6, textAlign: "center" }}>
                        No meals available today.
                      </div>
                    )}
                    {todayMeals.map(m => {
                      const ck = colorKey(m.key);
                      const isSel = selectedMealId === m.id;
                      return (
                        <button
                          key={m.id}
                          className={`ln-meal-tile ${ck} ${isSel ? "selected" : ""} ${cutoffPassed ? "unavailable" : ""}`}
                          onClick={() => selectMeal(m)}
                        >
                          <span className="mt-emoji">{m.emoji}</span>
                          <span className="mt-name">{m.name}</span>
                          <span className="mt-desc">{m.description ?? ""}</span>
                          {m.extraLabel && <span className="mt-avail">{m.extraLabel}</span>}
                          <span className="mt-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <div className="ln-meal-tile-foot">
                            <span className="ln-mt-dietary">{m.dietary ?? `Rs ${fmtRs(m.basePriceMinor)}`}</span>
                            <span>{m.kcal ? `≈ ${m.kcal} kcal` : ""}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Extra egg stepper */}
                  {eggAddon && selectedMeal && selectedMeal.key !== "none" && (
                    <div className="ln-addon-row">
                      <div className={`ln-addon-tile ${eggCount > 0 ? "has-count" : ""}`}>
                        <span className="ln-addon-emoji">🍳</span>
                        <div className="ln-addon-body">
                          <div className="ln-addon-name">Extra egg on the side</div>
                          <div className="ln-addon-desc">{EGG_DESCS[Math.min(eggCount, 3)]}</div>
                        </div>
                        <div className="ln-egg-stepper">
                          <button
                            className={`ln-stepper-btn minus ${eggCount === 0 ? "disabled" : ""}`}
                            onClick={() => changeEgg(-1)}
                          >−</button>
                          <span className={`ln-stepper-count ${eggCount === 0 ? "zero" : ""}`}>
                            {EGG_LABELS[Math.min(eggCount, 3)]}
                          </span>
                          <button
                            className={`ln-stepper-btn plus ${eggCount >= (eggAddon.maxQty ?? 3) ? "disabled" : ""}`}
                            onClick={() => changeEgg(1)}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="ln-save-row">
                    <div className="ln-save-note">
                      {orderTotalMinor > 0 ? `Total Rs ${fmtRs(orderTotalMinor)} · ` : ""}{saveNote}
                    </div>
                    {todayOrder && !cutoffPassed && (
                      <button
                        className="ln-btn-secondary"
                        onClick={async () => {
                          if (!todayOrder) return;
                          try {
                            await lunchApi.cancelOrder(todayOrder.id);
                            setTodayOrder(null);
                            setSelectedMealId("");
                            setEggCount(0);
                            showToast("Order cancelled");
                            fetchWallet();
                            fetchWeek();
                          } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
                        }}
                      >
                        Cancel order
                      </button>
                    )}
                    <button className="ln-btn-primary" onClick={saveLunch} disabled={cutoffPassed || !selectedMealId}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {todayOrder ? "Update lunch" : "Save lunch"}
                    </button>
                  </div>
                </div>

                {/* Two col: payment + recent */}
                {!proxyMode && (
                  <div className="ln-two-col">
                    <div className="ln-pay-card">
                      <div className="ln-pc-head">
                        <div className="ln-pc-title">Wallet balance</div>
                        <div className={`ln-pc-status ${balance > 0 ? "verified" : ""}`}><span className="d" />{balance > 0 ? "Funded" : "Low"}</div>
                      </div>
                      <div className="ln-pc-amount">
                        <span className="currency">Rs</span>{fmtRs(balance)}
                        <span className="period">recent activity below</span>
                      </div>
                      <div className="ln-pc-foot">
                        <button className="ln-btn-primary" onClick={() => setView("payments")}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12h18M14 5l7 7-7 7" />
                          </svg>
                          Top up
                        </button>
                        <button className="ln-btn-secondary" onClick={() => setView("payments")}>View log</button>
                      </div>
                    </div>

                    <div className="ln-recent-card">
                      <div className="ln-sec-title" style={{ marginBottom: 6 }}>
                        Recent meals <span className="right">last 5</span>
                      </div>
                      <div className="ln-recent-list">
                        {recentMeals.length === 0 ? (
                          <div style={{ padding: 16, fontSize: 12, opacity: 0.6 }}>No recent meals yet.</div>
                        ) : recentMeals.map((row, i) => {
                          const d = new Date(row.date);
                          return (
                            <div key={i} className="ln-recent-row">
                              <div className={`ln-recent-chip ${row.color}`}>{row.emoji || "—"}</div>
                              <div className="ln-recent-meta">
                                <div className="n">{row.name}</div>
                                <div className="d">{DOW_SHORT[d.getDay()].toUpperCase()} · {MONTHS[d.getMonth()]} {d.getDate()}</div>
                              </div>
                              <div className={`ln-recent-state ${row.state}`}>
                                {row.state === "paid" ? "Paid" : row.state === "pending" ? "Pending" : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                {!proxyMode && (
                  <>
                    <div className="ln-sec-title">Quick actions</div>
                    <div className="ln-qa-row">
                      <button className="ln-qa-tile" onClick={() => setView("weekly")}>
                        <div className="ln-qa-ico green">📅</div>
                        <div className="ln-qa-body">
                          <div className="t">Plan the week</div>
                          <div className="s">Set Tue–Fri picks in 20 seconds.</div>
                        </div>
                      </button>
                      <button className="ln-qa-tile" onClick={() => setView("payments")}>
                        <div className="ln-qa-ico cool">💸</div>
                        <div className="ln-qa-body">
                          <div className="t">Top up balance</div>
                          <div className="s">Scan QR · eSewa or Khalti. Admin verifies.</div>
                        </div>
                      </button>
                      <button className="ln-qa-tile" onClick={() => setView("suggestions")}>
                        <div className="ln-qa-ico warm">💭</div>
                        <div className="ln-qa-body">
                          <div className="t">Suggest a meal</div>
                          <div className="s">Tell the kitchen what you&apos;d love.</div>
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
                  {week.map(day => {
                    const o = weekOrders.find(x => fmtDateKey(new Date(x.date)) === day.key);
                    const curMealId = o?.mealId;
                    const dayMeals = meals.filter(m => m.availableDows.includes(day.dow));
                    const st = dayStatus(day.key);
                    return (
                      <div key={day.key} className={`ln-week-row ${day.isToday ? "today" : ""}`}>
                        <div className="ln-wr-day">
                          <div className="ln-wr-day-name">{day.label}</div>
                          <div className="ln-wr-day-date">{day.dateNum}</div>
                        </div>
                        <div className="ln-wr-meals">
                          {dayMeals.map(m => (
                            <button
                              key={m.id}
                              className={`ln-wr-meal-pill ${colorKey(m.key)} ${curMealId === m.id ? "active" : ""}`}
                              onClick={() => placeForDay(day.key, m.id)}
                            >
                              <span className="wmp-emoji">{m.emoji}</span>
                              {m.name}
                            </button>
                          ))}
                        </div>
                        <div className="ln-wr-status">
                          <span className={`ln-wr-status-dot ${st}`} />
                          {st === "paid" ? "Paid" : st === "pending" ? "Pending" : "Not set"}
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
                    <button className="arrow" onClick={() => {
                      const [y, m] = calMonth.split("-").map(Number);
                      const d = new Date(y, m - 2, 1);
                      setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <span className="lbl">{(() => { const [y, m] = calMonth.split("-").map(Number); return `${MONTHS_FULL[m - 1]} ${y}`; })()}</span>
                    <button className="arrow" onClick={() => {
                      const [y, m] = calMonth.split("-").map(Number);
                      const d = new Date(y, m, 1);
                      setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                    }}>
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
                      {calCells.map((cell, i) => (
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
                          {t === "veg" ? "Veg" : t === "chicken" ? "Chicken" : t === "egg" ? "Egg" : "Skip"}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ln-hist-side">
                    <div className="ln-hist-stats">
                      <div className="lbl">This month · {monthStats.total} meals</div>
                      {(["veg","chicken","egg","none"] as const).map(t => {
                        const c = monthStats.buckets[t];
                        const pct = monthStats.total ? Math.round((c / monthStats.total) * 100) : 0;
                        const emoji = t === "veg" ? "🥗" : t === "chicken" ? "🍗" : t === "egg" ? "🥚" : "🚫";
                        const name = t === "veg" ? "Veg" : t === "chicken" ? "Chicken" : t === "egg" ? "Egg" : "Skip";
                        return (
                          <div key={t} className="ln-stat-row">
                            <div className={`sw ${t}`}>{emoji}</div>
                            <div className="nm">{name}</div>
                            <div className="ct">{c}</div>
                            <div className="bar"><div className={t} style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedHistoryCell && (
                      <div className="ln-hist-detail">
                        <div className="ln-hd-date">
                          <span className="day-of">{DOW_LONG[new Date(selectedHistoryCell.date).getDay()]}</span>
                          {MONTHS_FULL[new Date(selectedHistoryCell.date).getMonth()]} {new Date(selectedHistoryCell.date).getDate()}, {new Date(selectedHistoryCell.date).getFullYear()}
                        </div>
                        <div className={`ln-hd-pick ${colorKey(selectedHistoryCell.mealKey)}`}>
                          <span className="pe">{selectedHistoryCell.emoji}</span>
                          <div>
                            <div className="nm">{selectedHistoryCell.mealName}</div>
                            <div className="desc">—</div>
                          </div>
                        </div>
                        <div className="ln-hd-rows">
                          <div className="ln-hd-row"><span className="k">Meal</span><span className="v">{selectedHistoryCell.mealName}</span></div>
                          <div className="ln-hd-row"><span className="k">Amount</span><span className="v">Rs {fmtRs(selectedHistoryCell.totalCostMinor)}</span></div>
                          <div className="ln-hd-row"><span className="k">Status</span><span className={`v ${selectedHistoryCell.status === "paid" ? "tagged" : ""}`}>{selectedHistoryCell.status}</span></div>
                        </div>
                      </div>
                    )}
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
                    <div className="val"><span className="currency">Rs</span>{fmtRs(balance)}</div>
                  </div>
                </div>

                <div className="ln-pay-grid">
                  <div className="ln-contrib">
                    <h3>Top up balance</h3>
                    <div className="sub">Choose an amount or enter custom · eSewa / Khalti QR · admin verifies</div>
                    <div className="ln-amount-row">
                      {[
                        { amt: 500,  label: "2 weeks", note: "≈ 10 meals" },
                        { amt: 1000, label: "1 month",  note: "≈ 20 meals" },
                        { amt: 1500, label: "top-up",   note: "≈ 30 meals" },
                      ].map((a, i) => (
                        <button
                          key={a.amt}
                          className={`ln-amount-tile ${selectedAmt === i ? "selected" : ""}`}
                          onClick={() => { setSelectedAmt(i); setQrAmt(a.amt.toLocaleString("en-IN")); setCustomAmt(""); }}
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
                        value={customAmt}
                        placeholder="0"
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setCustomAmt(v);
                          if (v) { setSelectedAmt(-1); setQrAmt(parseInt(v).toLocaleString("en-IN")); }
                        }}
                      />
                    </div>
                    <button
                      className="ln-btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={doTopup}
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
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ padding: 20, opacity: 0.6, fontSize: 13 }}>No transactions yet.</div>
                  ) : transactions.map(t => {
                    const isIn = t.amountMinor > 0;
                    const ico = isIn ? "💸" : (t.kind === "charge" ? "🍱" : "•");
                    return (
                      <div key={t.id} className="ln-log-row">
                        <div className={`ico ${isIn ? "in" : ""}`}>{ico}</div>
                        <div className="nm">{t.description}<span className="sub">{t.provider ?? ""} {t.externalRef ? `· ${t.externalRef}` : ""}</span></div>
                        <div className="amt">{isIn ? "+ " : "− "}Rs {fmtRs(Math.abs(t.amountMinor))}</div>
                        <div className="date">{new Date(t.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className={`state ${t.status === "verified" ? "verified" : t.status === "pending" ? "pending" : "unverified"}`}>{t.status}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ============ SUGGESTIONS ============ */}
            <div className={`ln-view ${view === "suggestions" ? "active" : ""}`}>
              <div className="ln-wrap">
                <div className="ln-sug-head">
                  <div>
                    <div className="ln-sug-title">Suggest a <em>meal</em></div>
                    <div className="ln-sug-sub">Help the kitchen plan better. All suggestions go to admins.</div>
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
                          <span className="plus">+</span>
                          {c}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="ln-sug-textarea"
                      placeholder="Describe your suggestion in detail… (e.g. more protein options on Fridays)"
                      value={suggestionBody}
                      onChange={e => setSuggestionBody(e.target.value)}
                    />
                    <div className="ln-sug-foot">
                      <span className="note">Reviewed weekly by the kitchen team</span>
                      <button className="ln-btn-primary" onClick={submitSuggestion}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Submit
                      </button>
                    </div>
                  </div>

                  <div className="ln-wall-card">
                    <div className="ln-sec-title" style={{ marginBottom: 12 }}>
                      Community wall <span className="kick">THIS WEEK</span>
                    </div>
                    <div style={{ padding: 20, fontSize: 13, opacity: 0.6 }}>
                      Public wall coming soon — your submissions go straight to admins for now.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============ ADMIN ============ */}
            {isAdmin && (
              <div className={`ln-view ${view === "admin" ? "active" : ""}`}>
                <div className="ln-wrap">
                  <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Lunch Admin</h2>
                    <p style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>Workspace-scoped · admin or owner only.</p>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {(["meals","topups","kitchen","suggestions","cutoff"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAdminTab(t)}
                        style={{
                          padding: "8px 14px", background: "transparent", border: "none",
                          borderBottom: adminTab === t ? "2px solid #338EF7" : "2px solid transparent",
                          cursor: "pointer", fontSize: 13,
                          fontWeight: adminTab === t ? 600 : 400,
                          textTransform: "capitalize",
                        }}
                      >
                        {t === "topups" ? "Top-ups" : t === "kitchen" ? "Kitchen sheet" : t}
                      </button>
                    ))}
                  </div>

                  {adminTab === "meals" && (
                    <div>
                      <div style={{ padding: 14, background: "rgba(51,142,247,0.06)", border: "1px solid rgba(51,142,247,0.25)", borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
                        <strong>Standing weekly menu.</strong> Set it once — runs every week forever, no daily updates needed.<br />
                        Each meal has a name, price, emoji. Tick which days of the week it&apos;s offered. Tick Mon–Fri for daily; tick Wed only for Wed special.
                      </div>

                      {meals.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: 10, background: "#fff" }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>🍱</div>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>No meals yet</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 14 }}>Start with a sample weekly menu — you can edit anything after.</div>
                          <button onClick={seedSampleMeals} style={{ padding: "8px 20px", background: "#338EF7", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
                            Load sample menu
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1.4fr) repeat(5, 60px) 100px 100px", padding: "10px 14px", background: "rgba(0,0,0,0.03)", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.6)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                              <div>Meal</div>
                              {[1,2,3,4,5].map(d => <div key={d} style={{ textAlign: "center" }}>{DOW_SHORT[d]}</div>)}
                              <div style={{ textAlign: "right" }}>Price (Rs)</div>
                              <div style={{ textAlign: "right" }}>Actions</div>
                            </div>
                            {meals.map(m => (
                              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "minmax(220px,1.4fr) repeat(5, 60px) 100px 100px", padding: "10px 14px", borderTop: "1px solid rgba(0,0,0,0.06)", alignItems: "center", opacity: m.active ? 1 : 0.5 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <input
                                    value={m.emoji}
                                    onChange={e => patchMealField(m, { emoji: e.target.value })}
                                    style={{ width: 32, fontSize: 18, textAlign: "center", border: "1px solid transparent", borderRadius: 4, padding: "2px 0", background: "transparent" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
                                    onBlur={e => e.target.style.borderColor = "transparent"}
                                  />
                                  <input
                                    value={m.name}
                                    onChange={e => patchMealField(m, { name: e.target.value })}
                                    style={{ flex: 1, fontWeight: 500, fontSize: 13, border: "1px solid transparent", borderRadius: 4, padding: "4px 6px", background: "transparent" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
                                    onBlur={e => e.target.style.borderColor = "transparent"}
                                  />
                                </div>
                                {[1,2,3,4,5].map(d => {
                                  const on = m.availableDows.includes(d);
                                  return (
                                    <button
                                      key={d}
                                      onClick={() => toggleMealDow(m, d)}
                                      title={`${on ? "Remove from" : "Add to"} ${DOW_SHORT[d]}`}
                                      style={{
                                        width: 30, height: 30, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center",
                                        background: on ? "#338EF7" : "white",
                                        color: on ? "white" : "rgba(0,0,0,0.3)",
                                        border: on ? "1px solid #338EF7" : "1px solid rgba(0,0,0,0.15)",
                                        borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
                                      }}
                                    >
                                      {on ? "✓" : ""}
                                    </button>
                                  );
                                })}
                                <div style={{ textAlign: "right" }}>
                                  <input
                                    type="number"
                                    value={Math.round(m.basePriceMinor / 100)}
                                    onChange={e => patchMealField(m, { basePriceMinor: (parseInt(e.target.value) || 0) * 100 })}
                                    style={{ width: 80, padding: "4px 8px", textAlign: "right", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4, fontSize: 13 }}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                  <button onClick={() => toggleMealActive(m)} title={m.active ? "Hide from menu" : "Show on menu"} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, background: "white", cursor: "pointer" }}>
                                    {m.active ? "Hide" : "Show"}
                                  </button>
                                  <button onClick={() => deleteAdminMeal(m.id)} title="Delete meal" style={{ padding: "4px 8px", fontSize: 11, background: "transparent", border: "1px solid #E11D48", color: "#E11D48", borderRadius: 5, cursor: "pointer" }}>
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <details style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 14 }}>
                            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>+ Add new meal</summary>
                            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 100px", gap: 8, marginTop: 12 }}>
                              <input placeholder="🍛" value={newMeal.emoji} onChange={e => setNewMeal({ ...newMeal, emoji: e.target.value })} style={{ padding: 8, fontSize: 18, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
                              <input placeholder="Name (e.g. Dal Bhat)" value={newMeal.name} onChange={e => setNewMeal({ ...newMeal, name: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
                              <input placeholder="Description (optional)" value={newMeal.description} onChange={e => setNewMeal({ ...newMeal, description: e.target.value })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
                              <input type="number" placeholder="Price Rs" value={Math.round(newMeal.basePriceMinor / 100)} onChange={e => setNewMeal({ ...newMeal, basePriceMinor: (parseInt(e.target.value) || 0) * 100 })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, textAlign: "right" }} />
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 12, opacity: 0.7, marginRight: 4 }}>Offered on:</span>
                              {[1,2,3,4,5].map(i => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => toggleAdminDow(i)}
                                  style={{
                                    padding: "6px 12px", fontSize: 12,
                                    background: newMeal.availableDows.includes(i) ? "#338EF7" : "white",
                                    color: newMeal.availableDows.includes(i) ? "white" : "inherit",
                                    border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, cursor: "pointer",
                                  }}
                                >
                                  {DOW_SHORT[i]}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setNewMeal(m => ({ ...m, availableDows: m.availableDows.length === 5 ? [] : [1,2,3,4,5] }))}
                                style={{ marginLeft: "auto", padding: "6px 10px", fontSize: 11, background: "transparent", border: "1px dashed rgba(0,0,0,0.2)", borderRadius: 6, cursor: "pointer" }}
                              >
                                {newMeal.availableDows.length === 5 ? "Clear all" : "Every weekday"}
                              </button>
                            </div>
                            <button onClick={createAdminMeal} style={{ marginTop: 12, width: "100%", padding: 10, background: "#338EF7", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
                              Add to weekly menu
                            </button>
                          </details>

                          <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6, textAlign: "center" }}>
                            Need to reset? <button onClick={seedSampleMeals} style={{ background: "transparent", border: "none", color: "#338EF7", cursor: "pointer", textDecoration: "underline", fontSize: 11 }}>Re-load sample menu</button> (won&apos;t duplicate existing).
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {adminTab === "topups" && (
                    <div>
                      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Pending top-ups</h3>
                      {pendingTopups.length === 0 ? (
                        <div style={{ opacity: 0.7, padding: 24 }}>No pending top-ups.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {pendingTopups.map(t => (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, background: "#fff" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{t.wallet?.user?.name} · Rs {fmtRs(t.amountMinor)}</div>
                                <div style={{ fontSize: 11, opacity: 0.6 }}>{t.provider} · {t.externalRef ?? "no ref"} · {new Date(t.createdAt).toLocaleString()}</div>
                              </div>
                              <button onClick={() => verifyTopup(t.id)} style={{ padding: "6px 14px", background: "#10B981", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
                                Verify
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === "kitchen" && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <input type="date" value={kitchenDate} onChange={e => setKitchenDate(e.target.value)} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
                      </div>
                      {!kitchen ? (
                        <div style={{ opacity: 0.7 }}>No orders for that day.</div>
                      ) : (
                        <>
                          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Counts</h3>
                          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                            {Object.entries(kitchen.counts ?? {}).map(([k, v]: any) => (
                              <div key={k} style={{ padding: "10px 16px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, textAlign: "center", background: "#fff" }}>
                                <div style={{ fontSize: 24 }}>{v.emoji}</div>
                                <div style={{ fontWeight: 600, fontSize: 20 }}>{v.count}</div>
                                <div style={{ fontSize: 11, opacity: 0.7 }}>{v.name}</div>
                              </div>
                            ))}
                          </div>

                          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Orders ({(kitchen.orders ?? []).length})</h3>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
                            <thead>
                              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                <th style={{ padding: 8 }}>User</th>
                                <th style={{ padding: 8 }}>Meal</th>
                                <th style={{ padding: 8 }}>Addons</th>
                                <th style={{ padding: 8 }}>Total</th>
                                <th style={{ padding: 8 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(kitchen.orders ?? []).map((o: any) => (
                                <tr key={o.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                  <td style={{ padding: 8 }}>{o.user.name}</td>
                                  <td style={{ padding: 8 }}>{o.meal.emoji} {o.meal.name}</td>
                                  <td style={{ padding: 8, fontSize: 11, opacity: 0.7 }}>
                                    {o.addons ? Object.entries(o.addons).map(([k, v]) => `${k}:${v}`).join(", ") : "—"}
                                  </td>
                                  <td style={{ padding: 8 }}>Rs {fmtRs(o.totalCostMinor)}</td>
                                  <td style={{ padding: 8 }}>{o.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  )}

                  {adminTab === "suggestions" && (
                    <div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                        {["open", "reviewed", "closed", "all"].map(s => (
                          <button key={s} onClick={() => setSugStatus(s)} style={{
                            padding: "6px 12px", borderRadius: 6,
                            background: sugStatus === s ? "#338EF7" : "white",
                            color: sugStatus === s ? "white" : "inherit",
                            border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer", fontSize: 12, textTransform: "capitalize",
                          }}>
                            {s}
                          </button>
                        ))}
                      </div>
                      {adminSuggestions.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>No suggestions.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {adminSuggestions.map(s => (
                            <div key={s.id} style={{ padding: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, background: "#fff" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <strong style={{ fontSize: 13 }}>{s.category}</strong>
                                <span style={{ fontSize: 11, opacity: 0.6 }}>{s.user?.name} · {new Date(s.createdAt).toLocaleString()}</span>
                              </div>
                              <div style={{ fontSize: 13, marginBottom: 8 }}>{s.body}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => setSugStatusAction(s.id, "reviewed")} style={{ padding: "4px 10px", fontSize: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, background: "white", cursor: "pointer" }}>Reviewed</button>
                                <button onClick={() => setSugStatusAction(s.id, "closed")} style={{ padding: "4px 10px", fontSize: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, background: "white", cursor: "pointer" }}>Close</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === "cutoff" && cutoff && (
                    <div style={{ padding: 16, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, maxWidth: 400, background: "#fff" }}>
                      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Order cutoff</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={{ fontSize: 12 }}>
                          Hour
                          <input type="number" min={0} max={23} value={cutoff.cutoffHour} onChange={e => setCutoff({ ...cutoff, cutoffHour: parseInt(e.target.value) || 0 })} style={{ width: "100%", padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, marginTop: 4 }} />
                        </label>
                        <label style={{ fontSize: 12 }}>
                          Minute
                          <input type="number" min={0} max={59} value={cutoff.cutoffMinute} onChange={e => setCutoff({ ...cutoff, cutoffMinute: parseInt(e.target.value) || 0 })} style={{ width: "100%", padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, marginTop: 4 }} />
                        </label>
                        <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>
                          Grace period (minutes)
                          <input type="number" min={0} value={cutoff.gracePeriodMinutes} onChange={e => setCutoff({ ...cutoff, gracePeriodMinutes: parseInt(e.target.value) || 0 })} style={{ width: "100%", padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, marginTop: 4 }} />
                        </label>
                      </div>
                      <button onClick={saveCutoff} style={{ marginTop: 16, padding: "8px 16px", background: "#338EF7", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
                        Save cutoff
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          <div className="sub">Quick info</div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Cutoff</div>
            <div className="ln-tweak-row">
              <button className={`ln-tweak-btn ${cutoffPassed ? "" : "on"}`}>{cutoffPassed ? "Locked" : `Open · ${cutoffLabel}`}</button>
            </div>
          </div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Today selection</div>
            <div className="ln-tweak-row">
              <button className={`ln-tweak-btn ${todayOrder ? "on" : ""}`}>{todayOrder ? "Submitted" : "Not set"}</button>
            </div>
          </div>
          <div className="ln-tweak-block">
            <div className="ln-tweak-lbl">Wallet</div>
            <div className="ln-tweak-row">
              <button className={`ln-tweak-btn ${balance > 0 ? "on" : ""}`}>Rs {fmtRs(balance)}</button>
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
                placeholder="Search teammates by name or email…"
                value={ppSearch}
                onChange={e => setPpSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="ln-pp-list">
              {ppResults.length === 0 && (
                <div style={{ padding: 20, fontSize: 13, opacity: 0.6, textAlign: "center" }}>
                  {ppSearch.trim() ? "No matches" : "Start typing to search"}
                </div>
              )}
              {ppResults.map(t => {
                const initials = t.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button key={t.id} className="ln-pp-row" onClick={() => enterProxy(t)}>
                    <div className="ln-pp-av" style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}>{initials}</div>
                    <div>
                      <div className="ln-pp-name">{t.name}</div>
                      <div className="ln-pp-team">{t.email}</div>
                    </div>
                  </button>
                );
              })}
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
