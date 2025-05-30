import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/index.css"; // Your global styles
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"; // Renamed to avoid conflict
import { Toaster as SonnerToaster } from "@/components/ui/sonner"; // Renamed to avoid conflict
import { QueryProvider } from "@/components/QueryProvider";
import { AppInitializer } from "@/components/AppInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Loan Management App", // You can customize this
  description: "Manage your loans effectively", // You can customize this
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <ShadcnToaster />
              <SonnerToaster />
              <AppInitializer />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
} 