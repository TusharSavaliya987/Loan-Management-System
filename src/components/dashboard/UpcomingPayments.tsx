"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useLoanStore } from "@/store/loanStore";
import { IndianRupee } from "lucide-react";

export function UpcomingPayments() {
  const getUpcomingPaymentsFunc = useLoanStore(state => state.getUpcomingPayments);
  const loans = useLoanStore(state => state.loans);
  const customers = useLoanStore(state => state.customers);
  const isLoadingLoans = useLoanStore(state => state.isLoadingLoans);
  const isLoadingCustomers = useLoanStore(state => state.isLoadingCustomers);
  
  const upcomingPayments = useMemo(() => {
    if (isLoadingLoans || isLoadingCustomers) {
      return []; // Don't compute if essential data is still loading
    }
    return getUpcomingPaymentsFunc(30);
    // getUpcomingPaymentsFunc internally uses get().loans and get().customers
  }, [getUpcomingPaymentsFunc, loans, customers, isLoadingLoans, isLoadingCustomers]);
  
  if (isLoadingLoans || isLoadingCustomers) {
    return (
      <Card className="col-span-1 2xl:col-span-2">
        <CardHeader className="space-y-1 sm:space-y-2">
          <CardTitle className="text-base sm:text-lg md:text-xl lg:text-xl font-semibold">
            Upcoming Payments (Next 30 Days)
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Interest payments due within the next month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">Loading upcoming payments...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="col-span-1 2xl:col-span-2">
      <CardHeader className="space-y-1 sm:space-y-2">
        <CardTitle className="text-base sm:text-lg md:text-xl lg:text-xl font-semibold">
          Upcoming Payments (Next 30 Days)
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
          Interest payments due within the next month
        </CardDescription>
      </CardHeader>

      <CardContent>
        {upcomingPayments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No upcoming payments in the next 30 days</p>
        ) : (
          <div className="space-y-4">
            {upcomingPayments.map(({ loan, payment, customer }) => {
              // Defensive check for customer, in case it's somehow undefined despite loading checks
              const customerName = customer?.name || "N/A";
              const customerMobile = customer?.mobile || "-";
              return (
                <div key={payment.id} className="border rounded-md p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{customerName}</h3>
                      <p className="text-sm text-muted-foreground">{customerMobile}</p>
                    </div>
                    <Badge>{format(parseISO(payment.dueDate), "dd MMM yyyy")}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">Loan Amount: <span className="font-medium flex items-center"><IndianRupee className="h-3 w-3 mr-1" />{loan.principal.toLocaleString('en-IN')}</span></p>
                      <p className="text-sm">Interest Due: <span className="font-medium flex items-center"><IndianRupee className="h-3 w-3 mr-1" />{payment.amount.toLocaleString('en-IN')}</span></p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {loan.interestFrequency}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
