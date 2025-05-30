"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Sidebar as SidebarContainer, 
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader
} from "@/components/ui/sidebar";
import { 
  Home, 
  IndianRupee, 
  Bell, 
  User, 
  FileText,
  Trash
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <SidebarContainer>
      <SidebarHeader className="flex items-center pb-2">
        <IndianRupee className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg ml-2">Loan Manager</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" className={cn(
                    "flex items-center space-x-2",
                    isActive("/") && "font-semibold text-primary"
                  )}>
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/loans" className={cn(
                    "flex items-center space-x-2",
                    isActive("/loans") && "font-semibold text-primary"
                  )}>
                    <IndianRupee className="h-4 w-4" />
                    <span>Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/customers" className={cn(
                    "flex items-center space-x-2",
                    isActive("/customers") && "font-semibold text-primary"
                  )}>
                    <User className="h-4 w-4" />
                    <span>Customers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/reminders" className={cn(
                    "flex items-center space-x-2",
                    isActive("/reminders") && "font-semibold text-primary"
                  )}>
                    <Bell className="h-4 w-4" />
                    <span>Reminders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/reports" className={cn(
                    "flex items-center space-x-2",
                    isActive("/reports") && "font-semibold text-primary"
                  )}>
                    <FileText className="h-4 w-4" />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/trash" className={cn(
                    "flex items-center space-x-2",
                    isActive("/trash") && "font-semibold text-primary"
                  )}>
                    <Trash className="h-4 w-4" />
                    <span>Deleted Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarContainer>
  );
}
