"use client";

import { useRouter } from "next/navigation";

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}

const IPlus    = mk(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
const IArchive = mk(<><rect x="2" y="4" width="20" height="5" rx="2"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></>);
const ISettings = mk(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);

export const ALL_PROJECTS = [
  { id: "1", name: "Nova Banking App",    emoji: "🪐", color: "#338EF7", client: "Astra Capital", status: "active"   },
  { id: "2", name: "RetailOS",            emoji: "🏪", color: "#F97316", client: "Internal",      status: "active"   },
  { id: "3", name: "Mantra Mobile",       emoji: "📱", color: "#9353D3", client: "Internal",      status: "active"   },
  { id: "4", name: "Notifications v2",    emoji: "🔔", color: "#17C964", client: "Internal",      status: "active"   },
  { id: "5", name: "Onboarding Refresh",  emoji: "👋", color: "#F5A524", client: "Internal",      status: "active"   },
  { id: "6", name: "Payments Gateway v3", emoji: "💳", color: "#F31260", client: "FinCore Ltd",   status: "archived" },
];

const PERSONAL_ITEMS = [
  { k: "my-work",  label: "My Work",       badge: "5"  },
  { k: "my-tasks", label: "My Tasks",       badge: null },
  { k: "assigned", label: "Assigned to me", badge: "8"  },
];

interface Props {
  selected: string;
  onSelect?: (id: string) => void;
}

export default function ProjectsListSidebar({ selected, onSelect }: Props) {
  const router = useRouter();
  const active = ALL_PROJECTS.filter(p => p.status === "active");

  function handleSelect(id: string) {
    if (onSelect) onSelect(id);
    else router.push(`/projects/${id}`);
  }

  return (
    <aside className="pl-sidebar">
      <div className="pl-sb-header">
        <span className="pl-sb-workspace">Mantra Arc</span>
        <button className="pl-new-btn"><IPlus /></button>
      </div>

      <div className="pl-sb-body">
        <div className="pl-sb-section">
          <div className="pl-sb-section-label">Personal</div>
          {PERSONAL_ITEMS.map(item => (
            <button key={item.k} className="pl-sb-item">
              <span className="pl-sb-item-label">{item.label}</span>
              {item.badge && <span className="pl-sb-badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        <div className="pl-sb-section">
          <div className="pl-sb-section-label">Projects</div>
          {active.map(p => (
            <button
              key={p.id}
              className={"pl-sb-item" + (selected === p.id ? " active" : "")}
              onClick={() => handleSelect(p.id)}
            >
              <span className="pl-sb-dot" style={{ background: p.color }} />
              <span className="pl-sb-item-label">{p.name}</span>
            </button>
          ))}
          <button className="pl-sb-item pl-sb-item-new">
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
  );
}
