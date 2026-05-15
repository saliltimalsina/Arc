"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OGSidebar from "@/components/OGSidebar";
import { useAuthStore } from "@/lib/authStore";
import { teamsApi, usersApi, type ApiTeamDetail, type ApiTeamMember, type ApiUserSearchResult } from "@/lib/api";
import "../teams.css";

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}
const IChevL   = mk(<path d="m15 18-6-6 6-6"/>);
const ISearch  = mk(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
const ITrash   = mk(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>);
const IEdit    = mk(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>);

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

function AddMemberPanel({
  teamId, myRole, currentMemberIds,
  onAdded,
}: {
  teamId: string; myRole: string; currentMemberIds: Set<string>;
  onAdded: (team: ApiTeamDetail) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const search = useCallback(async (val: string) => {
    if (val.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await usersApi.search(val);
      setResults(r);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q, search]);

  async function add(user: ApiUserSearchResult) {
    setAdding(user.id);
    setErr("");
    try {
      const updated = await teamsApi.addMember(teamId, user.email);
      onAdded(updated!);
      setQ("");
      setResults([]);
    } catch (e: any) {
      setErr(e.message ?? "Failed to add member");
    } finally {
      setAdding(null);
    }
  }

  if (!["owner", "admin"].includes(myRole)) return null;

  return (
    <div className="t-section" style={{ marginBottom: 20 }}>
      <div className="t-section-head">
        <h2>Add member</h2>
      </div>
      <div className="t-search-box">
        <ISearch style={{ width: 16, height: 16, color: "var(--t-text-3)", flexShrink: 0 }} />
        <input
          className="t-search-input"
          placeholder="Search by name or email…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {err && <p style={{ color: "#dc2828", fontSize: 13, padding: "8px 20px", margin: 0 }}>{err}</p>}
      {q.trim().length >= 2 && (
        <div className="t-search-results">
          {searching && <p className="t-search-msg">Searching…</p>}
          {!searching && results.length === 0 && (
            <p className="t-search-msg">No registered users found for "{q}"</p>
          )}
          {results.map(u => {
            const alreadyIn = currentMemberIds.has(u.id);
            return (
              <div key={u.id} className="t-search-result">
                <div className="t-avatar" style={{ background: avatarColor(u.name), width: 32, height: 32, fontSize: 12 }}>
                  {initials(u.name)}
                </div>
                <div className="t-search-result-info">
                  <div className="t-search-result-name">{u.name}</div>
                  <div className="t-search-result-email">{u.email}</div>
                </div>
                {alreadyIn ? (
                  <span style={{ fontSize: 12, color: "var(--t-text-4)" }}>Already in team</span>
                ) : (
                  <button className="t-btn-primary" style={{ padding: "5px 12px", fontSize: 12 }}
                    disabled={adding === u.id}
                    onClick={() => add(u)}>
                    {adding === u.id ? "Adding…" : "Add"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditTeamModal({ team, onClose, onSaved }: {
  team: ApiTeamDetail; onClose: () => void; onSaved: (t: ApiTeamDetail) => void;
}) {
  const [name, setName] = useState(team.name);
  const [emoji, setEmoji] = useState(team.emoji);
  const [color, setColor] = useState(team.color);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) { setErr("Name required"); return; }
    setSaving(true);
    try {
      const updated = await teamsApi.update(team.id, { name: name.trim(), emoji, color });
      onSaved(updated);
    } catch (e: any) {
      setErr(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="t-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-modal">
        <h2>Edit team</h2>
        <div className="t-field">
          <label className="t-label">Team name</label>
          <input className="t-input" value={name} onChange={e => setName(e.target.value)}
            autoFocus onKeyDown={e => e.key === "Enter" && submit()} />
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
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, load: loadAuth } = useAuthStore();
  const [team, setTeam] = useState<ApiTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadAuth();
    teamsApi.get(id).then(setTeam).catch(() => router.push("/teams")).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myMember = team?.members.find(m => m.user.id === user?.id);
  const myRole = myMember?.role ?? "member";
  const memberIds = new Set(team?.members.map(m => m.user.id) ?? []);

  async function remove(m: ApiTeamMember) {
    if (!confirm(`Remove ${m.user.name} from team?`)) return;
    setRemoving(m.user.id);
    try {
      await teamsApi.removeMember(id, m.user.id);
      setTeam(t => t ? { ...t, members: t.members.filter(x => x.user.id !== m.user.id) } : t);
    } catch (e: any) {
      alert(e.message ?? "Failed");
    } finally {
      setRemoving(null);
    }
  }

  async function changeRole(m: ApiTeamMember, role: string) {
    try {
      await teamsApi.updateMemberRole(id, m.user.id, role);
      setTeam(t => t ? {
        ...t,
        members: t.members.map(x => x.user.id === m.user.id ? { ...x, role } : x),
      } : t);
    } catch (e: any) {
      alert(e.message ?? "Failed");
    }
  }

  if (loading) {
    return (
      <div className="t-shell">
        <OGSidebar />
        <div className="t-main">
          <div className="t-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--t-text-3)", fontSize: 14 }}>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="t-shell">
      <OGSidebar />
      <div className="t-main">
        <div className="t-topbar">
          <Link href="/teams" className="t-btn-ghost" style={{ padding: "5px 10px", textDecoration: "none" }}>
            <IChevL style={{ width: 14, height: 14 }} /> Teams
          </Link>
          <span style={{ color: "var(--t-line-strong)" }}>/</span>
          <span className="t-topbar-title">{team.name}</span>
          <div className="t-topbar-right">
            {["owner", "admin"].includes(myRole) && (
              <button className="t-btn-ghost" onClick={() => setShowEdit(true)}>
                <IEdit style={{ width: 13, height: 13 }} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="t-content">
          <div className="t-detail-header">
            <div className="t-detail-emoji" style={{ background: team.color + "22" }}>{team.emoji}</div>
            <div className="t-detail-info">
              <h1>{team.name}</h1>
              <p>{team.members.length} member{team.members.length !== 1 ? "s" : ""}
                {team.projects.length > 0 ? ` · ${team.projects.length} project${team.projects.length !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>

          <AddMemberPanel
            teamId={id}
            myRole={myRole}
            currentMemberIds={memberIds}
            onAdded={setTeam}
          />

          <div className="t-section">
            <div className="t-section-head">
              <h2>Members ({team.members.length})</h2>
            </div>
            {team.members.map(m => (
              <div key={m.id} className="t-member-row">
                <div className="t-avatar" style={{ background: avatarColor(m.user.name) }}>
                  {initials(m.user.name)}
                </div>
                <div className="t-member-info">
                  <div className="t-member-name">{m.user.name}</div>
                  <div className="t-member-email">{m.user.email}</div>
                </div>
                {m.role === "owner" ? (
                  <span className="t-role-badge t-role-owner">Owner</span>
                ) : myRole === "owner" ? (
                  <select className="t-role-select" value={m.role}
                    onChange={e => changeRole(m, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className={`t-role-badge t-role-${m.role}`}>{m.role}</span>
                )}
                <div className="t-member-actions">
                  {m.role !== "owner" && ["owner", "admin"].includes(myRole) && m.user.id !== user?.id && (
                    <button className="t-btn-danger" disabled={removing === m.user.id}
                      onClick={() => remove(m)}>
                      <ITrash style={{ width: 12, height: 12 }} />
                      {removing === m.user.id ? "…" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {team.projects.length > 0 && (
            <div className="t-section">
              <div className="t-section-head">
                <h2>Projects ({team.projects.length})</h2>
              </div>
              {team.projects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="t-proj-row">
                  <div className="t-proj-dot" style={{ background: p.color }} />
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{p.emoji}</span>
                  <span className="t-proj-name">{p.name}</span>
                  <span className="t-proj-status">{p.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditTeamModal
          team={team}
          onClose={() => setShowEdit(false)}
          onSaved={t => { setTeam(t); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
