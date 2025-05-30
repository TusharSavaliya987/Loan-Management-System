"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import LoginPageContent from "@/pages/Login";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show login content if not authenticated
  if (!isAuthenticated) {
    return <LoginPageContent />;
  }

  // Return null while redirecting
  return null;
} 