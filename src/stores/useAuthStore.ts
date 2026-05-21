import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initDB, clearDB, getDB } from '@/api/github-db';

const DATA_REPO = 'english-tracker-data';

interface AuthState {
  token: string | null;
  owner: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  getDB: () => ReturnType<typeof getDB>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      owner: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          // Verify token by fetching user info
          const res = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (!res.ok) {
            throw new Error('Invalid token or insufficient permissions');
          }

          const user = await res.json();
          const owner = user.login;

          // Initialize DB
          const db = initDB(token, owner, DATA_REPO);

          // Ensure data repo exists
          await db.ensureRepoExists();

          set({
            token,
            owner,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
          });
          throw error;
        }
      },

      logout: () => {
        clearDB();
        set({
          token: null,
          owner: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      getDB: () => {
        const { token, owner } = get();
        if (!token || !owner) return null;
        // Re-init if needed
        const existing = getDB();
        if (existing) return existing;
        return initDB(token, owner, DATA_REPO);
      },
    }),
    {
      name: 'english-tracker-auth',
      partialize: (state) => ({
        token: state.token,
        owner: state.owner,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
