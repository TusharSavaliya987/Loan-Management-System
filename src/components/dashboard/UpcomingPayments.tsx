"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useLoanStore } from "@/store/loanStore";
import { IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export function UpcomingPayments() {
  const router = useRouter();
  const getUpcomingPaymentsFunc = useLoanStore(
    (state) => state.getUpcomingPayments
  );
  const loans = useLoanStore((state) => state.loans);
  const customers = useLoanStore((state) => state.customers);
  const isLoadingLoans = useLoanStore((state) => state.isLoadingLoans);
  const isLoadingCustomers = useLoanStore((state) => state.isLoadingCustomers);

  const [selectedDays, setSelectedDays] = useState(30);

  const upcomingPayments = useMemo(() => {
    if (isLoadingLoans || isLoadingCustomers) {
      return [];
    }
    return getUpcomingPaymentsFunc(selectedDays);
  }, [
    getUpcomingPaymentsFunc,
    loans,
    customers,
    isLoadingLoans,
    isLoadingCustomers,
    selectedDays,
  ]);

  const handlePaymentClick = (loanId: string) => {
    router.push(`/loans/${loanId}`);
  };

  const CardTitleText = `Upcoming Payments`;
  const CardDescriptionText = `Payments due in the next ${selectedDays} days.`;

  if (isLoadingLoans || isLoadingCustomers) {
    return (
      <Card className="col-span-1 2xl:col-span-2">
        <CardHeader className="space-y-1 sm:space-y-2">
          <CardTitle className="text-base sm:text-lg md:text-xl lg:text-xl font-semibold">
            {CardTitleText}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
            {CardDescriptionText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            Loading payments...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 2xl:col-span-2">
      <CardHeader className="space-y-1 sm:space-y-2">
        <CardTitle className="text-base sm:text-lg md:text-xl lg:text-xl font-semibold">
          {CardTitleText}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
          {CardDescriptionText}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <Label className="text-sm sm:text-base">Time period</Label>
            <div className="flex flex-wrap gap-2">
                {[30, 60, 90, 120, 180].map((days) => (
                    <Button
                    key={days}
                    variant={selectedDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDays(days)}
                    >
                    {days} days
                    </Button>
                ))}
            </div>
        </div>
        {upcomingPayments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No upcoming payments found.
          </p>
        ) : (
          <div className="space-y-4">
            {upcomingPayments.map(({ loan, payment, customer }) => {
              const customerName = customer?.name || "N/A";
              const customerMobile = customer?.mobile || "-";

              return (
                <div
                  key={payment.id}
                  className="border rounded-md p-4 flex flex-col gap-2 cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handlePaymentClick(loan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{customerName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customerMobile}
                      </p>
                    </div>
                    <Badge variant="default">
                        {format(parseISO(payment.dueDate), "dd MMM yyyy")}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                      <p className="text-sm">
                        Interest Due:{" "}
                        <span className="font-medium flex items-center">
                          <IndianRupee className="h-3 w-3 mr-1" />
                          {payment.amount.toLocaleString("en-IN")}
                        </span>
                      </p>
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
