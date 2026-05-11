import { create } from "zustand";
import { projectsApi, type ApiProject } from "./api";

export type Project = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  client: string;
  status: string;
};

type ProjectStore = {
  projects: Project[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  addProject: (data: { name: string; emoji: string; color: string; client: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading || get().loaded) return;
    set({ loading: true });
    try {
      const apiProjects = await projectsApi.list();
      const remote: Project[] = apiProjects.map((p: ApiProject) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        client: p.client,
        status: p.status,
      }));
      set({ projects: remote, loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (data) => {
    // Optimistic: add with temp ID immediately so UI responds without waiting for API
    const tempId = `temp-${Date.now()}`;
    const optimistic: Project = {
      id: tempId,
      name: data.name,
      emoji: data.emoji ?? "🚀",
      color: data.color ?? "#338EF7",
      client: data.client ?? "Internal",
      status: "active",
    };
    set((state) => ({ projects: [...state.projects, optimistic] }));

    try {
      const created = await projectsApi.create(data);
      const real: Project = {
        id: created.id,
        name: created.name,
        emoji: created.emoji,
        color: created.color,
        client: created.client,
        status: created.status,
      };
      set((state) => ({
        projects: state.projects.map(p => (p.id === tempId ? real : p)),
      }));
      return real;
    } catch {
      // Keep optimistic project; will be gone on next page load but visible now
      return optimistic;
    }
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },
}));
