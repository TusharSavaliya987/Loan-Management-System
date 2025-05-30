"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useLoanStore } from "@/store/loanStore";
import { IndianRupee } from "lucide-react";

export function UpcomingPayments() {
  const getUpcomingPayments = useLoanStore(state => state.getUpcomingPayments);
  
  const upcomingPayments = useMemo(() => getUpcomingPayments(30), [getUpcomingPayments]);
  
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Upcoming Payments (Next 30 Days)</CardTitle>
        <CardDescription>Interest payments due within the next month</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingPayments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No upcoming payments in the next 30 days</p>
        ) : (
          <div className="space-y-4">
            {upcomingPayments.map(({ loan, payment, customer }) => (
              <div key={payment.id} className="border rounded-md p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-muted-foreground">{customer.mobile}</p>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
