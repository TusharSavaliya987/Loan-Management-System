"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "blue" | "purple" | "green" | "sunset" | "forest" | "ocean" | "midnight" | "coffee";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light", // This can be the ultimate fallback if needed
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "loan-manager-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize with defaultTheme or a safe server-side default
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Effect to get theme from localStorage after mount
  useEffect(() => {
    setMounted(true);
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme) {
        setTheme(storedTheme);
      }
    } catch (e) {
      // In case localStorage is not available or disabled
      console.error("Failed to access localStorage for theme:", e);
      setTheme(defaultTheme);
    }
  }, [storageKey, defaultTheme]);

  // Effect to update DOM and localStorage when theme changes
  useEffect(() => {
    if (!mounted) return; // Don't run on server or before hydration

    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "blue", "purple", "green", "sunset", "forest", "ocean", "midnight", "coffee");
    
    root.classList.add(theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      console.error("Failed to set localStorage for theme:", e);
    }
  }, [theme, storageKey, mounted]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Ensure setTheme is only called on client after mount
      if (mounted) {
        setTheme(newTheme);
      }
    },
  };

  // To prevent flash of unstyled content or incorrect theme before hydration,
  // you might consider not rendering children until 'mounted' is true,
  // or using a CSS-only default theme that applies before JS hydration.
  // For now, we'll render children immediately.

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
