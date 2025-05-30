"use client";

import { useAuthStore } from "@/store/authStore";
// import { useLoanStore } from "@/store/loanStore"; // We'll re-evaluate this after loanStore is Firebase-aware
import { useEffect } from "react";

export function AppInitializer() {
  // By calling useAuthStore() here, or accessing a state, we ensure the store is initialized
  // and the onAuthStateChanged listener within it is set up when the app loads.
  // We don't actually need to use the returned values here if the goal is just initialization.
  useEffect(() => {
    useAuthStore.getState(); // Accessing the store ensures its creation and listener setup
  }, []);

  return null; 
}