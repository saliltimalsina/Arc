"use client";

import { useEffect, useState, useCallback } from "react";
import OGSidebar from "@/components/OGSidebar";
import { lunchApi, type ApiMeal, type ApiCutoff, type ApiSuggestion } from "@/lib/api";
import { pushToast } from "@/hooks/useToast";

type Tab = "meals" | "topups" | "kitchen" | "suggestions" | "cutoff";

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtRs(minor: number) {
  return `Rs ${(minor / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LunchAdminPage() {
  const [tab, setTab] = useState<Tab>("meals");
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [cutoff, setCutoff] = useState<ApiCutoff | null>(null);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [kitchen, setKitchen] = useState<any | null>(null);
  const [kitchenDate, setKitchenDate] = useState(fmtDate(new Date()));
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [sugStatus, setSugStatus] = useState("open");

  // Meal form
  const [newMeal, setNewMeal] = useState({
    key: "", name: "", emoji: "🥗", description: "", basePriceMinor: 5000,
    availableDows: [1, 2, 3, 4, 5] as number[], sortOrder: 0,
  });

  const reloadMeals = useCallback(() => lunchApi.meals().then(setMeals).catch(() => {}), []);
  useEffect(() => { reloadMeals(); }, [reloadMeals]);

  useEffect(() => { lunchApi.cutoff().then(setCutoff).catch(() => {}); }, []);
  useEffect(() => { if (tab === "topups") lunchApi.pendingTopups().then(setPendingTopups).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === "kitchen") lunchApi.kitchenSheet(kitchenDate).then(setKitchen).catch(() => setKitchen(null)); }, [tab, kitchenDate]);
  useEffect(() => { if (tab === "suggestions") lunchApi.listSuggestions(sugStatus).then(setSuggestions).catch(() => {}); }, [tab, sugStatus]);

  const toggleDow = (dow: number) => {
    setNewMeal(m => ({
      ...m,
      availableDows: m.availableDows.includes(dow) ? m.availableDows.filter(d => d !== dow) : [...m.availableDows, dow].sort(),
    }));
  };

  const createMeal = async () => {
    if (!newMeal.key || !newMeal.name) return pushToast("Key + name required", "error");
    try {
      await lunchApi.createMeal(newMeal);
      pushToast("Meal added", "success");
      setNewMeal({ key: "", name: "", emoji: "🥗", description: "", basePriceMinor: 5000, availableDows: [1,2,3,4,5], sortOrder: 0 });
      reloadMeals();
    } catch (e: any) {
      pushToast(e?.message ?? "Failed", "error");
    }
  };

  const toggleActive = async (meal: ApiMeal) => {
    try {
      await lunchApi.updateMeal(meal.id, { active: !meal.active });
      reloadMeals();
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };

  const deleteMeal = async (id: string) => {
    if (!confirm("Delete this meal?")) return;
    try {
      await lunchApi.deleteMeal(id);
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
    try {
      const updated = await lunchApi.setCutoff(cutoff);
      setCutoff(updated);
      pushToast("Cutoff saved", "success");
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };

  const setSugStatusAction = async (id: string, status: string) => {
    try {
      await lunchApi.setSuggestionStatus(id, status);
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (e: any) { pushToast(e?.message ?? "Failed", "error"); }
  };

  const TABS: { k: Tab; label: string }[] = [
    { k: "meals", label: "Meals" },
    { k: "topups", label: "Top-ups" },
    { k: "kitchen", label: "Kitchen sheet" },
    { k: "suggestions", label: "Suggestions" },
    { k: "cutoff", label: "Cutoff" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <OGSidebar />
      <div style={{ flex: 1, padding: "24px 32px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Lunch Admin</h1>
        <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>Workspace-scoped. Admin or owner only.</p>

        <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          {TABS.map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.k ? "2px solid #338EF7" : "2px solid transparent",
                cursor: "pointer", fontSize: 13,
                fontWeight: tab === t.k ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "meals" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Existing meals</h2>
            <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
              {meals.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, opacity: m.active ? 1 : 0.5 }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{m.name} <span style={{ fontSize: 11, opacity: 0.6 }}>({m.key})</span></div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{m.availableDows.map(d => DOW_NAMES[d]).join(", ")} · {fmtRs(m.basePriceMinor)}</div>
                  </div>
                  <button onClick={() => toggleActive(m)} style={{ padding: "4px 10px", fontSize: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, background: "white", cursor: "pointer" }}>
                    {m.active ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => deleteMeal(m.id)} style={{ padding: "4px 10px", fontSize: 12, background: "transparent", border: "1px solid #F31260", color: "#F31260", borderRadius: 6, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Add meal</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 16, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
              <input placeholder="key (e.g. veg)" value={newMeal.key} onChange={e => setNewMeal({ ...newMeal, key: e.target.value })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
              <input placeholder="name" value={newMeal.name} onChange={e => setNewMeal({ ...newMeal, name: e.target.value })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
              <input placeholder="emoji" value={newMeal.emoji} onChange={e => setNewMeal({ ...newMeal, emoji: e.target.value })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
              <input type="number" placeholder="basePriceMinor (paise)" value={newMeal.basePriceMinor} onChange={e => setNewMeal({ ...newMeal, basePriceMinor: parseInt(e.target.value) || 0 })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
              <input placeholder="description" value={newMeal.description} onChange={e => setNewMeal({ ...newMeal, description: e.target.value })} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, gridColumn: "1 / -1" }} />
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 4 }}>
                {DOW_NAMES.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDow(i)}
                    style={{
                      flex: 1, padding: 6, fontSize: 12,
                      background: newMeal.availableDows.includes(i) ? "#338EF7" : "white",
                      color: newMeal.availableDows.includes(i) ? "white" : "inherit",
                      border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button onClick={createMeal} style={{ gridColumn: "1 / -1", padding: 10, background: "#338EF7", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
                Add meal
              </button>
            </div>
          </div>
        )}

        {tab === "topups" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Pending top-ups</h2>
            {pendingTopups.length === 0 ? (
              <div style={{ opacity: 0.7, padding: 24 }}>No pending top-ups.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {pendingTopups.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{t.wallet?.user?.name} · {fmtRs(t.amountMinor)}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{t.provider} · {t.externalRef ?? "no ref"} · {new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <button onClick={() => verifyTopup(t.id)} style={{ padding: "6px 14px", background: "#17C964", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
                      Verify
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "kitchen" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input type="date" value={kitchenDate} onChange={e => setKitchenDate(e.target.value)} style={{ padding: 8, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }} />
            </div>
            {!kitchen ? (
              <div style={{ opacity: 0.7 }}>No orders for that day.</div>
            ) : (
              <>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Counts</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                  {Object.entries(kitchen.counts ?? {}).map(([k, v]: any) => (
                    <div key={k} style={{ padding: "10px 16px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 24 }}>{v.emoji}</div>
                      <div style={{ fontWeight: 600, fontSize: 20 }}>{v.count}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{v.name}</div>
                    </div>
                  ))}
                </div>

                <h2 style={{ fontSize: 16, marginBottom: 8 }}>Orders ({(kitchen.orders ?? []).length})</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                        <td style={{ padding: 8 }}>{fmtRs(o.totalCostMinor)}</td>
                        <td style={{ padding: 8 }}>{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {tab === "suggestions" && (
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
            {suggestions.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No suggestions.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {suggestions.map(s => (
                  <div key={s.id} style={{ padding: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
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

        {tab === "cutoff" && cutoff && (
          <div style={{ padding: 16, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, maxWidth: 400 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Order cutoff</h2>
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
  );
}
