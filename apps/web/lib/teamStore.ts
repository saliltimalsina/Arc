import { create } from "zustand";
import { teamsApi, type ApiTeam, type ApiTeamDetail } from "./api";

type TeamStore = {
  teams: ApiTeam[];
  current: ApiTeamDetail | null;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  loadTeam: (id: string) => Promise<void>;
  setCurrent: (t: ApiTeamDetail | null) => void;
  reset: () => void;
};

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  current: null,
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const teams = await teamsApi.list();
      set({ teams, loaded: true });
    } catch {
      set({ loaded: false });
    } finally {
      set({ loading: false });
    }
  },

  loadTeam: async (id: string) => {
    const team = await teamsApi.get(id);
    set({ current: team });
  },

  setCurrent: (t) => set({ current: t }),
  reset: () => set({ teams: [], current: null, loaded: false }),
}));
