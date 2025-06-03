"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLoanStore } from "@/store/loanStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, Trash, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Loan as LoanType } from "@/types/loan";

const DeletedLoans = () => {
  const loans = useLoanStore(state => state.loans);
  const restoreLoan = useLoanStore(state => state.restoreLoan);
  const getCustomer = useLoanStore(state => state.getCustomer);
  const getStoreError = useLoanStore(state => state.error);

  const router = useRouter();
  const { toast } = useToast();

  const deletedLoansArray: LoanType[] = useMemo(() => {
    return loans.filter(loan => loan.status === 'deleted');
  }, [loans]);

  const handleRestore = async (loanId: string) => {
    try {
      await restoreLoan(loanId);
      toast({
        title: "Loan restored",
        description: "The loan has been successfully restored.",
      });
    } catch (error) {
      console.error("Restore failed in component:", error);
      const storeError = getStoreError;
      toast({
        variant: "destructive",
        title: "Restore failed",
        description: storeError || "Could not restore the loan. Please try again.",
      });
    }
  };

  const calculateDaysLeft = (deletedAt?: string | null) => {
    if (!deletedAt) return 0;
    const deletedDate = parseISO(deletedAt);
    const currentDate = new Date();
    const daysPassed = differenceInDays(currentDate, deletedDate);
    const daysLeft = 10- daysPassed;
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

      {deletedLoansArray.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <Trash className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No deleted loans</h3>
          <p className="text-muted-foreground mt-1">
            Deleted loans will appear here for up to 10 days before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {deletedLoansArray.map((loan) => {
            const customer = getCustomer(loan.customerId);
            const daysLeft = calculateDaysLeft(loan.deletedAt);
            
            return (
              <Card key={loan.id} className="border-dashed border-destructive/30">
                <CardHeader>
                  <CardTitle>{customer?.name || "Unknown Customer"}</CardTitle>
                  <CardDescription>
                    Deleted on {loan.deletedAt ? format(parseISO(loan.deletedAt), "PPP") : "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Loan Amount:</span>
                      <span className="font-medium sm:text-right">₹{loan.principal.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Interest Rate:</span>
                      <span className="font-medium sm:text-right">{loan.interestRate}%</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Expiry:</span>
                      <span className="text-destructive font-semibold sm:text-right">
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
