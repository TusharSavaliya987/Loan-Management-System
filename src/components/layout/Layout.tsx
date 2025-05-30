"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Button } from "@/components/ui/button";
import { 
  LogOut,
  LogIn,
  User,
  Home,
  Settings,
  FileText,
  Trash,
 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    console.log("logging out");
    
    router.push("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center gap-3">
                <ThemeSwitcher />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleLogout}
                  title="Logout"
                  className="rounded-full transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="transition-colors">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
