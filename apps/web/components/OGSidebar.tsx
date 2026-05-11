"use client";

import { usePathname, useRouter } from "next/navigation";
import "./sidebar.css";

type IP = React.SVGProps<SVGSVGElement>;
function mk(d: React.ReactNode) {
  return function Icon(p: IP) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
    );
  };
}

const IHome     = mk(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>);
const IBoxes    = mk(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
const ICheck    = mk(<><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></>);
const ITimeline = mk(<><path d="M4 6h10"/><circle cx="18" cy="6" r="2"/><path d="M4 12h6"/><circle cx="14" cy="12" r="2"/><path d="M4 18h12"/><circle cx="20" cy="18" r="2"/></>);
const IUsers    = mk(<><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15 19a5 5 0 0 1 6 0"/></>);
const ITrophy   = mk(<><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2a2 2 0 0 1 0 4h-2"/><path d="M7 5H5a2 2 0 0 0 0 4h2"/></>);
const IChart    = mk(<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V9"/><path d="M16 15v-7"/></>);
const ISearch   = mk(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
const ISettings = mk(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);

const TOP_NAV = [
  { k: "home",        Icon: IHome,     label: "Home",        path: "/dashboard"   },
  { k: "projects",    Icon: IBoxes,    label: "Projects",    path: "/projects"    },
  { k: "tasks",       Icon: ICheck,    label: "Tasks",       path: "/tasks"       },
  { k: "timeline",    Icon: ITimeline, label: "Timeline",    path: "/timeline"    },
  { k: "teams",       Icon: IUsers,    label: "Teams",       path: "/teams"       },
  { k: "recognition", Icon: ITrophy,   label: "Recognition", path: "/recognition" },
  { k: "reports",     Icon: IChart,    label: "Reports",     path: "/reports"     },
];
const BOT_NAV = [
  { k: "search",   Icon: ISearch,   label: "Search",   path: "/search"   },
  { k: "settings", Icon: ISettings, label: "Settings", path: "/settings" },
];

function pathToKey(pathname: string): string {
  if (pathname.startsWith("/projects"))    return "projects";
  if (pathname.startsWith("/dashboard"))   return "home";
  if (pathname.startsWith("/tasks"))       return "tasks";
  if (pathname.startsWith("/timeline"))    return "timeline";
  if (pathname.startsWith("/teams"))       return "teams";
  if (pathname.startsWith("/recognition")) return "recognition";
  if (pathname.startsWith("/reports"))     return "reports";
  return "home";
}

interface OGSidebarProps {
  initials?: string;
}

export default function OGSidebar({ initials = "SK" }: OGSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathToKey(pathname);

  return (
    <aside className="og-sidebar">
      <div className="og-logo">M</div>

      <div className="og-nav-group">
        {TOP_NAV.map(({ k, Icon, label, path }) => (
          <button
            key={k}
            className={"og-item" + (active === k ? " active" : "")}
            onClick={() => router.push(path)}
          >
            <Icon />
            <span className="og-tip">{label}</span>
          </button>
        ))}
      </div>

      <div className="og-spacer" />

      <div className="og-nav-group">
        {BOT_NAV.map(({ k, Icon, label, path }) => (
          <button key={k} className="og-item" onClick={() => router.push(path)}>
            <Icon />
            <span className="og-tip">{label}</span>
          </button>
        ))}
        <div className="og-avatar" title={initials}>{initials}</div>
      </div>
    </aside>
  );
}
