import axios from "axios";
import { create } from "zustand";
import { authApi } from "../lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });

        // Verify token is still valid on the server
        await authApi.verify();
      } catch (e) {
        if (
          axios.isAxiosError(e) &&
          e.response &&
          [401, 403].includes(e.response.status)
        ) {
          console.error("Token verification failed:", e);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        console.warn(
          "Token verification skipped because the backend is temporarily unavailable:",
          e,
        );
      }
    }
  },
}));
