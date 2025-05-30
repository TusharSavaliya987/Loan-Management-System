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
            } else {
              Cookies.remove('auth-session', { path: '/' });
            }
          } catch (error: any) {
            console.error('Error during onAuthStateChanged processing:', error);
            authError = error.message || 'Error processing auth state.';
            Cookies.remove('auth-session', { path: '/' });
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
            // Attempt server-side logout first
            const response = await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });

            // Proactive client-side cleanup (cookies and storage)
            Cookies.remove('auth-session', { path: '/' });
            localStorage.removeItem('auth-storage');
            sessionStorage.removeItem('auth-storage');

            if (!response.ok) {
              const data = await response.json().catch(() => ({ message: 'Logout API call failed and failed to parse error response.' }));
              // Log the error but still attempt client-side sign out
              console.error('Logout API call failed:', data.message || 'Unknown API error');
              // Fall through to client-side sign out and state update
            }

            // Perform client-side Firebase sign out
            // This is crucial for onAuthStateChanged to pick up the change
            await firebaseSignOut(auth);

            // onAuthStateChanged will handle setting user, isAuthenticated, isLoading to false.
            // However, we can set isLoading to false and clear user/isAuthenticated here for faster UI update
            // if onAuthStateChanged is slow or if we want to be absolutely sure.
            // The previous version of the fix already set these, which is fine.
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false, // Explicitly false
              error: null, // Clear any previous login errors
            });

          } catch (e: any) {
            console.error("Logout action error (outer catch, possibly firebaseSignOut error or network issue):");
            // Ensure client-side Firebase sign out is attempted even if API call failed earlier and threw
            // or if firebaseSignOut itself fails.
            try {
              await firebaseSignOut(auth); // Attempt signout again if initial fetch failed
            } catch (signOutError) {
              console.error("Firebase signOut error during logout catch block:", signOutError);
            }

            // Final state update for logout failure
            Cookies.remove('auth-session', { path: '/' });
            localStorage.removeItem('auth-storage');
            sessionStorage.removeItem('auth-storage');
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