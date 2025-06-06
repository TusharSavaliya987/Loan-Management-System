"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoanStore } from "@/store/loanStore";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, Bell, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const Reminders = () => {
  const loans = useLoanStore((state) => state.loans);
  const getCustomer = useLoanStore((state) => state.getCustomer);

  const [selectedDays, setSelectedDays] = useState(30);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
    email: string;
    dueDate: string;
    amount: number;
  } | null>(null);

  // Get upcoming payments based on filter
  const upcomingPayments = useMemo(() => {
    const results = [];
    const today = new Date();
    const futureDate = addDays(today, selectedDays);

    for (const loan of loans) {
      if (loan.status !== "active") continue;

      const customer = getCustomer(loan.customerId);
      if (!customer) continue;

      for (const payment of loan.interestPayments) {
        if (payment.status !== "pending") continue;

        const dueDate = parseISO(payment.dueDate);
        if (isAfter(dueDate, today) && isBefore(dueDate, futureDate)) {
          results.push({
            loanId: loan.id,
            paymentId: payment.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerMobile: customer.mobile,
            principal: loan.principal,
            dueDate: payment.dueDate,
            amount: payment.amount,
            frequency: loan.interestFrequency,
          });
        }
      }
    }

    // Sort by due date
    return results.sort(
      (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
    );
  }, [loans, getCustomer, selectedDays]);

  const handleSendEmail = () => {
    // In a real application, this would connect to a backend to send emails
    toast.success(`Email reminder sent to ${selectedCustomer?.email}`);
    setEmailDialogOpen(false);
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
            Upcoming Interest Payments
          </CardTitle>
          <CardDescription>
            View and manage upcoming interest payments in the next{" "}
            {selectedDays} days
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

          {upcomingPayments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="text-lg font-medium">No upcoming payments</h3>
              <p className="text-muted-foreground mt-1">
                There are no interest payments due in the next {selectedDays}{" "}
                days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingPayments.map((payment) => (
                <Card key={payment.paymentId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{payment.customerName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {payment.customerMobile}
                        </p>
                      </div>
                      <Badge>
                        {format(parseISO(payment.dueDate), "dd MMM yyyy")}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
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
                            {payment.frequency}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reminders;
