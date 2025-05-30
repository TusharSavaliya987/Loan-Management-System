"use client";

import { useAuthStore } from "@/store/authStore";
// import { useLoanStore } from "@/store/loanStore"; // We'll re-evaluate this after loanStore is Firebase-aware
import { useEffect } from "react";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // This effect ensures the store is subscribed to and onAuthStateChanged is set up.
    // The initial call to getState() is implicitly handled by useAuthStore hook.
    // console.log("AppInitializer: Auth isLoading:", isLoading, "IsAuthenticated:", isAuthenticated);
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    // console.log("AppInitializer: Showing loading screen because auth is loading.");
    return <div>Loading application...</div>; // Or a proper global loading spinner
  }

  // console.log("AppInitializer: Auth loaded, rendering children.");
  return <>{children}</>;
}