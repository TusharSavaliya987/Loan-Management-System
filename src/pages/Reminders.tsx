"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoanStore } from "@/store/loanStore";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, Bell, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const Reminders = () => {
  const router = useRouter();
  const loans = useLoanStore((state) => state.loans);
  const getCustomer = useLoanStore((state) => state.getCustomer);
  const getOverduePayments = useLoanStore((state) => state.getOverduePayments);
  const getUpcomingPayments = useLoanStore(state => state.getUpcomingPayments);

  const [selectedDays, setSelectedDays] = useState(30);

  const upcomingPayments = useMemo(() => {
    return getUpcomingPayments(selectedDays);
  }, [getUpcomingPayments, selectedDays]);

  const overduePayments = useMemo(() => {
    return getOverduePayments();
  }, [getOverduePayments]);
  
  const combinedPayments = useMemo(() => {
    return [...overduePayments, ...upcomingPayments];
  }, [overduePayments, upcomingPayments]);

  const handlePaymentClick = (loanId: string) => {
    router.push(`/loans/${loanId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Payment Reminders</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Upcoming & Overdue Payments
          </CardTitle>
          <CardDescription>
            Overdue payments and payments due in the next {selectedDays} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <Label className="text-sm sm:text-base">Time period</Label>
            <div className="flex flex-wrap gap-2">
              {[7, 15, 30, 60, 90].map((days) => (
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

          {combinedPayments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="text-lg font-medium">No Payments Found</h3>
              <p className="text-muted-foreground mt-1">
                There are no overdue payments or payments due in the next {selectedDays} days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {combinedPayments.map(({ loan, payment, customer }) => {
                const isOverdue = isBefore(parseISO(payment.dueDate), new Date());
                return (
                    <Card
                    key={payment.id}
                    onClick={() => handlePaymentClick(loan.id)}
                    className={`cursor-pointer transition-colors ${
                        isOverdue
                        ? "border-destructive/50 hover:bg-destructive/10"
                        : "hover:bg-muted/50"
                    }`}
                    >
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium">{customer?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                            {customer?.mobile}
                            </p>
                        </div>
                        <Badge variant={isOverdue ? "destructive" : "default"}>
                            {format(parseISO(payment.dueDate), "dd MMM yyyy")}
                        </Badge>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <p className="text-sm">
                                Interest Due:{" "}
                                <span className="font-medium flex items-center">
                                <IndianRupee className="h-3 w-3 mr-1" />
                                {payment.amount.toLocaleString("en-IN")}
                                </span>
                            </p>
                            <p className="text-sm mt-1">
                                Payment Type:{" "}
                                <span className="font-medium capitalize">
                                {loan.interestFrequency}
                                </span>
                            </p>
                        </div>
                    </CardContent>
                    </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reminders;
