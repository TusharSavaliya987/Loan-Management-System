"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stats } from "@/components/dashboard/Stats";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { useLoanStore } from "@/store/loanStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { LoanForm } from "@/components/forms/LoanForm";
import { Check, IndianRupee } from "lucide-react";
import { useRouter } from "next/navigation";

const Dashboard = () => {
  const customers = useLoanStore((state) => state.customers);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-xl md:text-xl lg:text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
      </div>

      <Stats />

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
        <UpcomingPayments />

        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 lg:space-y-3">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Manage your loans and customers
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {customers.length === 0 ? (
              <Tabs defaultValue="customer">
                <TabsList className="grid grid-cols-2 gap-2 w-full mb-4">
                  <TabsTrigger value="customer">Add Customer</TabsTrigger>
                  <TabsTrigger value="loan" disabled>
                    Add Loan
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="customer">
                  <CardContent className="p-0">
                    <CustomerForm />
                  </CardContent>
                </TabsContent>
              </Tabs>
            ) : (
              <Tabs defaultValue="customer">
                <TabsList className="grid grid-cols-2 gap-2 w-full mb-4">
                  <TabsTrigger value="customer">Add Customer</TabsTrigger>
                  <TabsTrigger value="loan">Add Loan</TabsTrigger>
                </TabsList>
                <TabsContent value="customer">
                  <CustomerForm />
                </TabsContent>
                <TabsContent value="loan">
                  <LoanForm />
                </TabsContent>
              </Tabs>
            )}

            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={() => router.push("/loans")}
              >
                <IndianRupee className="mr-2 h-4 w-4" />
                View All Loans
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={() => router.push("/customers")}
              >
                <Check className="mr-2 h-4 w-4" />
                Manage Customers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
