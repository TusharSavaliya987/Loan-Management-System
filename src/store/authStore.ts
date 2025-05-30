import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  Unsubscribe,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  clearError: () => void;
}

let globalUnsubscribe: Unsubscribe | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      if (typeof window !== 'undefined' && !globalUnsubscribe) {
        globalUnsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
          let appUser: AppUser | null = null;
          let authenticated = false;
          let authError: string | null = null;
          try {
            if (firebaseUser) {
              appUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
              };
              authenticated = true;
              const token = await firebaseUser.getIdToken();
              Cookies.set('auth-session', token, {
                expires: 7,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
              });
              useLoanStore.getState().initializeData();
            } else {
              Cookies.remove('auth-session', { path: '/' });
              useLoanStore.getState().clearLocalData();
            }
          } catch (error: any) {
            console.error('Error during onAuthStateChanged processing:', error);
            authError = error.message || 'Error processing auth state.';
            Cookies.remove('auth-session', { path: '/' });
            useLoanStore.getState().clearLocalData();
            appUser = null;
            authenticated = false;
          } finally {
            set({
              user: appUser,
              isAuthenticated: authenticated,
              isLoading: false,
              error: authError,
            });
          }
        });
      }

      return {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch (e: any) {
            console.error("Login action error:", e);
            let errorMessage = 'Login failed. Please check your credentials.';
            if (e.code) {
              switch (e.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                  errorMessage = 'Invalid email or password.';
                  break;
                case 'auth/invalid-email':
                  errorMessage = 'Invalid email format.';
                  break;
                default:
                  errorMessage = e.message || 'An unknown error occurred during login.';
              }
            }
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },

        logout: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });

            Cookies.remove('auth-session', { path: '/' });
            localStorage.removeItem('auth-storage');
            
            if (!response.ok) {
              const data = await response.json().catch(() => ({ message: 'Logout API call failed and failed to parse error response.' }));
              console.error('Logout API call failed:', data.message || 'Unknown API error');
            }

            await firebaseSignOut(auth);
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });

          } catch (e: any) {
            console.error("Logout action error:", e);
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              console.error("Firebase signOut error during logout catch block:", signOutError);
            }
            Cookies.remove('auth-session', { path: '/' });
            localStorage.removeItem('auth-storage');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: e.message || 'Logout failed on client',
            });
          }
        },

        signup: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch('/api/auth/signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || 'Signup failed');
            }
          } catch (e: any) {
            console.error("Signup action error:", e);
            set({ error: e.message, isLoading: false });
            throw e;
          }
        },

        clearError: () => {
          set({ error: null });
        },
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);