"use client"; // Required for onClick handlers and hooks like useAuthStore

import NotFoundContent from "@/pages/NotFound"; // Your existing NotFound component
import { Layout } from "@/components/layout/Layout";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router

export default function NotFound() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    // Render nothing or a loading spinner while redirecting
    return null;
  }

  return (
    <Layout>
      <NotFoundContent />
    </Layout>
  );
} 