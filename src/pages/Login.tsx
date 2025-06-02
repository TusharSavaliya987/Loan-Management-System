"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link"; // For Signup link

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { 
    login, 
    isAuthenticated, 
    isLoading: authIsLoading,
    error: authError,       
    clearError             // Use clearError from authStore
  } = useAuthStore();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Clear auth error on component mount or when email/password changes
  useEffect(() => {
    clearError();
  }, [clearError, email, password]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = searchParams.get("redirect") || "/";
      router.replace(redirectPath);
    }
  }, [isAuthenticated, router, searchParams]);

  // Display auth errors using toast
  useEffect(() => {
    if (authError) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: authError,
      });
      clearError(); // Clear error after displaying
    }
  }, [authError, toast, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear previous errors before attempting login
    clearError(); 
    try {
      await login(email, password);
      // On successful login, authStore updates isAuthenticated.
      // The useEffect above will handle redirection automatically.
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
        variant: "default",
      });
      // No explicit router.push here, relies on isAuthenticated effect.
    } catch (error: any) {
      // The authStore's login action now throws the error, 
      // and sets state.error, which the useEffect for authError will pick up.
      // So, no specific error handling needed here unless you want to do something additional.
      // The toast for errors is already handled by the authError useEffect.
      // console.error("Login page submit error:", error.message); 
    }
  };

  // If already authenticated and redirecting, render nothing or a minimal loader.
  if (isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>; 
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Loan Manager</CardTitle>
          <CardDescription>Login to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label> {/* Changed from username */}
              <Input
                id="email"
                type="email" // Changed from text
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authIsLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={authIsLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={authIsLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={authIsLoading}>
              {authIsLoading ? (
                "Logging in..."
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
