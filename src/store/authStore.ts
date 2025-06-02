import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLoanStore } from './loanStore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<AppUser | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initializeAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/me');
          if (!response.ok) {
            throw new Error('Failed to fetch auth status');
          }
          const data = await response.json();
          if (data.isAuthenticated && data.user) {
            set({
              user: data.user as AppUser,
              isAuthenticated: true,
              isLoading: false,
            });
            useLoanStore.getState().initializeData();
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
            useLoanStore.getState().clearLocalData();
          }
        } catch (e: any) {
          console.error("Initialize auth error:", e);
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: 'Failed to initialize auth state.' 
          });
          useLoanStore.getState().clearLocalData();
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Login failed');
          }
          set({
            user: data.user as AppUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          useLoanStore.getState().initializeData();
        } catch (e: any) {
          console.error("Login action error:", e);
          set({ error: e.message, isLoading: false, user: null, isAuthenticated: false });
          throw e;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          const apiResponse = await fetch('/api/auth/logout', {
            method: 'POST',
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ message: 'Logout API call failed and failed to parse error response.' }));
            throw new Error(errorData.message || 'Logout failed on server');
          }
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          useLoanStore.getState().clearLocalData();
        } catch (e: any) {
          console.error("Logout action error:", e);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: e.message || 'Logout failed',
          });
          useLoanStore.getState().clearLocalData();
          throw e;
        }
      },

      signup: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
          }
          set({ isLoading: false, error: null });
          return data.user as AppUser;
        } catch (e: any) {
          console.error("Signup action error:", e);
          set({ error: e.message, isLoading: false });
          throw e;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => (
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['user', 'isAuthenticated'].includes(key))
        )
      ),
    }
  )
);

if (typeof window !== 'undefined') {
  useAuthStore.getState().initializeAuth();
}