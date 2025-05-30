"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLoanStore } from "@/store/loanStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, Trash, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DeletedLoans = () => {
  const { deletedLoans, restoreLoan, getCustomer } = useLoanStore();
  const router = useRouter();
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRestore = (loanId: string) => {
    const success = restoreLoan(loanId);
    if (success) {
      toast({
        title: "Loan restored",
        description: "The loan has been successfully restored.",
      });
      setRefreshTrigger(prev => prev + 1);
    } else {
      toast({
        variant: "destructive",
        title: "Restore failed",
        description: "Could not restore this loan. Please try again.",
      });
    }
  };

  const calculateDaysLeft = (deletedAt: string) => {
    const deletedDate = parseISO(deletedAt);
    const currentDate = new Date();
    const daysPassed = differenceInDays(currentDate, deletedDate);
    const daysLeft = 100 - daysPassed;
    return daysLeft > 0 ? daysLeft : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Deleted Loans</h1>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {deletedLoans.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <Trash className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No deleted loans</h3>
          <p className="text-muted-foreground mt-1">
            Deleted loans will appear here for up to 100 days before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deletedLoans.map(({ loan, deletedAt }) => {
            const customer = getCustomer(loan.customerId);
            const daysLeft = calculateDaysLeft(deletedAt);
            
            return (
              <Card key={loan.id} className="border-dashed border-destructive/30">
                <CardHeader>
                  <CardTitle>{customer?.name || "Unknown Customer"}</CardTitle>
                  <CardDescription>
                    Deleted on {format(parseISO(deletedAt), "PPP")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Loan Amount:</span>
                      <span>₹{loan.principal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest Rate:</span>
                      <span>{loan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expiry:</span>
                      <span className="text-destructive font-semibold">
                        {daysLeft} days left to restore
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleRestore(loan.id)} 
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Restore Loan
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeletedLoans;
