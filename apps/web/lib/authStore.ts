import { create } from "zustand";
import { api, clearToken, type AuthUser } from "./api";

type AuthStore = {
  user: AuthUser | null;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading || get().loaded) return;
    set({ loading: true });
    try {
      const user = await api.getMe();
      set({ user, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  setUser: (user) => set({ user, loaded: true }),

  logout: async () => {
    try { await api.logout(); } catch { /* ignore */ }
    clearToken();
    set({ user: null, loaded: true });
  },

  clear: () => set({ user: null, loaded: false }),
}));
