"use client";

import { useAuthStore } from "@/store/authStore";
// import { useLoanStore } from "@/store/loanStore"; // We'll re-evaluate this after loanStore is Firebase-aware
import { useEffect } from "react";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  // isLoading is true initially and set to false after initializeAuth completes.
  const isLoading = useAuthStore((state) => state.isLoading);
  // const isAuthenticated = useAuthStore((state) => state.isAuthenticated); // Not directly used for rendering decision here

  useEffect(() => {
    // The authStore now self-initializes by calling initializeAuth().
    // This useEffect can be used for debugging or if any reaction to isLoading change is needed here.
    // console.log("AppInitializer: Auth isLoading state:", isLoading);
  }, [isLoading]);

  if (isLoading) {
    // console.log("AppInitializer: Auth state is loading. Showing loading screen.");
    return <div className="flex items-center justify-center min-h-screen">Loading application...</div>; 
  }

  // console.log("AppInitializer: Auth loaded, rendering children.");
  return <>{children}</>;
}