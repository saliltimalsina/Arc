"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OGSidebar from "@/components/OGSidebar";
import { useTeamStore } from "@/lib/teamStore";
import { useAuthStore } from "@/lib/authStore";
import { teamsApi, type ApiTeamDetail } from "@/lib/api";
import "./teams.css";

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}
const IPlus  = mk(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IUsers = mk(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);

const EMOJIS = ["🏢","🚀","⚡","🎯","🔥","💎","🌟","🎨","🛠","🌍"];
const COLORS = ["#338EF7","#F5A524","#17C964","#F31260","#9353D3","#06B7DB","#FF6B35","#4ADE80"];

function avatarColor(name: string) {
  const colors = ["#F5A524","#338EF7","#17C964","#9353D3","#F31260","#06B7DB"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 2);
}

function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: ApiTeamDetail) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏢");
  const [color, setColor] = useState("#338EF7");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) { setErr("Name required"); return; }
    setSaving(true);
    try {
      const t = await teamsApi.create({ name: name.trim(), emoji, color });
      onCreated(t);
    } catch (e: any) {
      setErr(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="t-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-modal">
        <h2>Create team</h2>
        <div className="t-field">
          <label className="t-label">Team name</label>
          <input className="t-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Engineering, Design, Marketing…" autoFocus
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div className="t-field">
          <label className="t-label">Emoji</label>
          <div className="t-emoji-row">
            {EMOJIS.map(e => (
              <button key={e} className={"t-emoji-btn" + (emoji === e ? " selected" : "")} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
        </div>
        <div className="t-field">
          <label className="t-label">Color</label>
          <div className="t-color-row">
            {COLORS.map(c => (
              <div key={c} className={"t-color-swatch" + (color === c ? " selected" : "")}
                style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        {err && <p style={{ color: "#dc2828", fontSize: 13, marginTop: 4 }}>{err}</p>}
        <div className="t-modal-footer">
          <button className="t-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="t-btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create team"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const router = useRouter();
  const { teams, loaded, loading, load } = useTeamStore();
  const { load: loadAuth } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadAuth(); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCreated(t: ApiTeamDetail) {
    useTeamStore.setState(s => ({ teams: [...s.teams, t], loaded: true }));
    setShowCreate(false);
    router.push(`/teams/${t.id}`);
  }

  return (
    <div className="t-shell">
      <OGSidebar />
      <div className="t-main">
        <div className="t-topbar">
          <span className="t-topbar-title">Teams</span>
          <div className="t-topbar-right">
            <button className="t-btn-primary" onClick={() => setShowCreate(true)}>
              <IPlus /> New team
            </button>
          </div>
        </div>

        <div className="t-content">
          {loading && !loaded && (
            <p style={{ color: "var(--t-text-3)", fontSize: 14 }}>Loading…</p>
          )}

          {loaded && teams.length === 0 && (
            <div className="t-empty">
              <div className="t-empty-icon"><IUsers style={{ width: 28, height: 28, color: "var(--t-text-3)" }} /></div>
              <h2>No teams yet</h2>
              <p>Create your first team and add colleagues who are already signed up.</p>
              <button className="t-btn-primary" onClick={() => setShowCreate(true)}>
                <IPlus /> Create team
              </button>
            </div>
          )}

          {teams.length > 0 && (
            <div className="t-grid">
              {teams.map(team => (
                <Link key={team.id} href={`/teams/${team.id}`} className="t-card">
                  <div className="t-card-header">
                    <div className="t-card-emoji" style={{ background: team.color + "22" }}>{team.emoji}</div>
                    <div>
                      <div className="t-card-name">{team.name}</div>
                      <div className="t-card-meta">
                        {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                        {team._count ? ` · ${team._count.projects} project${team._count.projects !== 1 ? "s" : ""}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="t-card-avatars">
                    {team.members.slice(0, 5).map(m => (
                      <div key={m.id} className="t-mini-avatar"
                        style={{ background: avatarColor(m.user.name) }}
                        title={m.user.name}>
                        {initials(m.user.name)}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="t-mini-avatar" style={{ background: "var(--t-surface-3)", color: "var(--t-text-3)" }}>
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
