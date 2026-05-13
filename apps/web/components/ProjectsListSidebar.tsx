"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useProjectStore, type Project } from "@/lib/projectStore";
import { pushToast } from "@/hooks/useToast";

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}

const IPlus       = mk(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IArchive    = mk(<><rect x="2" y="4" width="20" height="5" rx="2"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></>);
const ISettings   = mk(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
const IClose      = mk(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);
const ICheck      = mk(<polyline points="20 6 9 17 4 12"/>);
const IOverview   = mk(<><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>);
const IMyWork     = mk(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>);
const IMyTasks    = mk(<><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/></>);
const IAssigned   = mk(<><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 10.5-6"/><path d="m17 17 2 2 4-4"/></>);

const EMOJI_OPTS = ["🪐","🏦","📱","🔔","👋","💳","🚀","🔑","💰","🏪","📊","🎯","⚡","🌐","🔧","🎨","📦","🤖"];
const COLOR_OPTS = [
  { label: "Blue",   val: "#338EF7" },
  { label: "Purple", val: "#9353D3" },
  { label: "Green",  val: "#17C964" },
  { label: "Orange", val: "#F97316" },
  { label: "Amber",  val: "#F5A524" },
  { label: "Red",    val: "#F31260" },
  { label: "Cyan",   val: "#06B7DB" },
  { label: "Pink",   val: "#FF4ECD" },
];
const TEMPLATES = [
  { id: "blank",  label: "Blank",  desc: "Start from scratch" },
  { id: "scrum",  label: "Scrum",  desc: "Sprints + backlog"  },
  { id: "kanban", label: "Kanban", desc: "Continuous flow"    },
];


const PERSONAL_ITEMS = [
  { k: "my-work",  label: "My Work",       badge: "5",  Icon: IMyWork   },
  { k: "my-tasks", label: "My Tasks",       badge: null, Icon: IMyTasks  },
  { k: "assigned", label: "Assigned to me", badge: "8",  Icon: IAssigned },
];

function genKey(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 4) || "PRJ";
}

export function NewProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (p: Omit<Project, "id">) => void;
}) {
  const [name, setName]         = useState("");
  const [key, setKey]           = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [emoji, setEmoji]       = useState("🚀");
  const [color, setColor]       = useState("#338EF7");
  const [type, setType]         = useState<"client" | "internal">("internal");
  const [client, setClient]     = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("scrum");
  const [nameErr, setNameErr]   = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    setNameErr(false);
    if (!keyEdited) setKey(genKey(v));
  }

  function handleCreate() {
    if (!name.trim()) { setNameErr(true); return; }
    onCreated({
      name:   name.trim(),
      key:    key.trim() || undefined,
      emoji,
      color,
      client: type === "client" ? (client.trim() || "Client") : "Internal",
      status: "active",
      description: description.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="np-backdrop" onClick={onClose}>
      <div className="np-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="np-head">
          <span className="np-title">Create new project</span>
          <button className="np-close" onClick={onClose}><IClose style={{ width: 16, height: 16 }} /></button>
        </div>

        <div className="np-body">

          {/* Emoji + Name row */}
          <div className="np-name-row">
            <div className="np-emoji-btn-wrap">
              <button className="np-emoji-btn" onClick={() => setShowEmoji(v => !v)}>
                <span style={{ fontSize: 22 }}>{emoji}</span>
              </button>
              {showEmoji && (
                <div className="np-emoji-grid" onClick={e => e.stopPropagation()}>
                  {EMOJI_OPTS.map(e => (
                    <button key={e} className={"np-emoji-opt" + (emoji === e ? " active" : "")}
                      onClick={() => { setEmoji(e); setShowEmoji(false); }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label className="np-label">Project name <span className="np-req">*</span></label>
              <input
                className={"np-input" + (nameErr ? " np-input-err" : "")}
                placeholder="e.g. Nova Banking App"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                autoFocus
              />
              {nameErr && <span className="np-err">Name is required</span>}
            </div>
          </div>

          {/* Key */}
          <div className="np-field">
            <label className="np-label">Project key</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                className="np-input np-key-input"
                value={key}
                onChange={e => { setKey(e.target.value.toUpperCase().slice(0, 6)); setKeyEdited(true); }}
                placeholder="NB"
                maxLength={6}
              />
              <span className="np-key-hint">Auto-generated · used as ticket prefix (e.g. {key || "NB"}-123)</span>
            </div>
          </div>

          {/* Color */}
          <div className="np-field">
            <label className="np-label">Accent color</label>
            <div className="np-colors">
              {COLOR_OPTS.map(c => (
                <button key={c.val} className={"np-color-swatch" + (color === c.val ? " active" : "")}
                  style={{ background: c.val }}
                  title={c.label}
                  onClick={() => setColor(c.val)}
                >
                  {color === c.val && <ICheck style={{ width: 12, height: 12, color: "#fff", strokeWidth: 3 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="np-field">
            <label className="np-label">Project type</label>
            <div className="np-type-toggle">
              <button className={"np-type-btn" + (type === "internal" ? " active" : "")} onClick={() => setType("internal")}>
                Internal
              </button>
              <button className={"np-type-btn" + (type === "client" ? " active" : "")} onClick={() => setType("client")}>
                Client project
              </button>
            </div>
          </div>

          {/* Client name (conditional) */}
          {type === "client" && (
            <div className="np-field">
              <label className="np-label">Client name</label>
              <input className="np-input" placeholder="e.g. Astra Capital" value={client} onChange={e => setClient(e.target.value)} />
            </div>
          )}

          {/* Template */}
          <div className="np-field">
            <label className="np-label">Template</label>
            <div className="np-templates">
              {TEMPLATES.map(t => (
                <button key={t.id} className={"np-template" + (template === t.id ? " active" : "")}
                  onClick={() => setTemplate(t.id)}
                  style={template === t.id ? { borderColor: color, background: color + "10" } : undefined}
                >
                  <span className="np-tmpl-name">{t.label}</span>
                  <span className="np-tmpl-desc">{t.desc}</span>
                  {template === t.id && (
                    <span className="np-tmpl-check" style={{ background: color }}>
                      <ICheck style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="np-field">
            <label className="np-label">Description <span style={{ color: "var(--text-4)", fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="np-input"
              placeholder="What is this project about?"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="np-foot">
          <button className="np-cancel" onClick={onClose}>Cancel</button>
          <button className="np-create" style={{ background: color }} onClick={handleCreate}>
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsListSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { projects, addProject, load, loaded } = useProjectStore();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { if (!loaded) load(); }, [load, loaded]);

  const active = projects.filter(p => p.status === "active");

  async function handleCreated(data: Omit<Project, "id">) {
    try {
      const p = await addProject(data);
      pushToast(`Project "${p.name}" created`);
      router.push(`/projects/${p.id}`);
    } catch {
      pushToast("Failed to create project", "error");
    }
  }

  return (
    <>
      <aside className="pl-sidebar">
        <div className="pl-sb-header">
          <span className="pl-sb-workspace">Mantra Arc</span>
          <button className="pl-new-btn" onClick={() => setShowNew(true)} title="New project"><IPlus /></button>
        </div>

        <div className="pl-sb-body">
          <div className="pl-sb-section">
            <div className="pl-sb-section-label">Personal</div>
            <Link href="/projects/overview"
              className={"pl-sb-item" + (pathname === "/projects/overview" || pathname === "/projects" ? " active" : "")}
            >
              <IOverview className="pl-sb-icon" />
              <span className="pl-sb-item-label">Overview</span>
            </Link>
            {PERSONAL_ITEMS.map(({ k, label, badge, Icon }) => (
              <Link key={k} href={`/projects/${k}`}
                className={"pl-sb-item" + (pathname === `/projects/${k}` ? " active" : "")}
              >
                <Icon className="pl-sb-icon" />
                <span className="pl-sb-item-label">{label}</span>
                {badge && <span className="pl-sb-badge">{badge}</span>}
              </Link>
            ))}
          </div>

          <div className="pl-sb-section">
            <div className="pl-sb-section-label">Projects</div>
            {active.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className={"pl-sb-item" + (pathname === `/projects/${p.id}` ? " active" : "")}
              >
                <span className="pl-sb-dot" style={{ background: p.color }} />
                <span className="pl-sb-item-label">{p.name}</span>
              </Link>
            ))}
            <button className="pl-sb-item pl-sb-item-new" onClick={() => setShowNew(true)}>
              <IPlus style={{ width: 13, height: 13, flexShrink: 0 }} />
              <span className="pl-sb-item-label">New project</span>
            </button>
          </div>

          <div className="pl-sb-section">
            <div className="pl-sb-section-label">Workspace</div>
            <button className="pl-sb-item"><IArchive className="pl-sb-icon" /><span className="pl-sb-item-label">Archived</span></button>
            <button className="pl-sb-item"><ISettings className="pl-sb-icon" /><span className="pl-sb-item-label">Settings</span></button>
          </div>
        </div>
      </aside>

      {showNew && (
        <NewProjectModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
