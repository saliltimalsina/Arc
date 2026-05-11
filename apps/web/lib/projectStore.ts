import { create } from "zustand";

export type Project = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  client: string;
  status: string;
};

export const INITIAL_PROJECTS: Project[] = [
  { id: "1", name: "Nova Banking App",    emoji: "🪐", color: "#338EF7", client: "Astra Capital", status: "active"   },
  { id: "2", name: "RetailOS",            emoji: "🏪", color: "#F97316", client: "Internal",      status: "active"   },
  { id: "3", name: "Mantra Mobile",       emoji: "📱", color: "#9353D3", client: "Internal",      status: "active"   },
  { id: "4", name: "Notifications v2",    emoji: "🔔", color: "#17C964", client: "Internal",      status: "active"   },
  { id: "5", name: "Onboarding Refresh",  emoji: "👋", color: "#F5A524", client: "Internal",      status: "active"   },
  { id: "6", name: "Payments Gateway v3", emoji: "💳", color: "#F31260", client: "FinCore Ltd",   status: "archived" },
];

type ProjectStore = {
  projects: Project[];
  addProject: (p: Project) => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: INITIAL_PROJECTS,
  addProject: (p) => set((state) => ({ projects: [...state.projects, p] })),
}));
