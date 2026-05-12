import { create } from "zustand";
import { api, getToken, type AuthUser } from "./api";

type AuthStore = {
  user: AuthUser | null;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:    null,
  loaded:  false,
  loading: false,

  load: async () => {
    if (get().loading || get().loaded || !getToken()) return;
    set({ loading: true });
    try {
      const user = await api.getMe();
      set({ user, loaded: true });
    } catch {
      set({ loaded: false });
    } finally {
      set({ loading: false });
    }
  },

  setUser: (user) => set({ user, loaded: true }),
  clear:   ()     => set({ user: null, loaded: false }),
}));
