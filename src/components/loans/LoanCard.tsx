"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerInfo, Loan } from "@/types/loan";
import { format, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Edit, Eye, IndianRupee, Trash } from "lucide-react";
import { useLoanStore } from "@/store/loanStore";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditLoanForm } from "@/components/forms/EditLoanForm";

interface LoanCardProps {
  loan: Loan;
  customer: CustomerInfo;
}

export function LoanCard({ loan, customer }: LoanCardProps) {
  const { toast } = useToast();
  const deleteLoanSoft = useLoanStore((state) => state.deleteLoanSoft);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteLoanSoft(loan.id);
      toast({
        title: "Loan Deleted",
        description: `The loan for ${customer.name} has been moved to trash and can be restored.`,
      });
    } catch (error) {
      console.error("Failed to delete loan:", error);
      toast({
        title: "Error",
        description: "Failed to delete the loan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const nextPayment = loan.interestPayments.find(
    (payment) => payment.status === "pending"
  );
  const formattedStartDate = format(parseISO(loan.startDate), "PPP");
  const formattedEndDate = format(parseISO(loan.endDate), "PPP");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>{customer.mobile}</CardDescription>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-medium ${
              loan.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : loan.status === "closed"
                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid gap-2">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-sm text-muted-foreground">Principal</span>
            <span className="font-medium sm:text-right">
              ₹{loan.principal.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-sm text-muted-foreground">Interest Rate</span>
            <span className="sm:text-right">
              {loan.interestRate}% per annum
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-sm text-muted-foreground">Term</span>
            <span className="sm:text-right">
              {formattedStartDate} to {formattedEndDate}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-sm text-muted-foreground">Frequency</span>
            <span className="capitalize sm:text-right">
              {loan.interestFrequency}
            </span>
          </div>
          {loan.remarks && (
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm text-muted-foreground">Remarks</span>
              <p className="text-sm font-medium sm:text-right line-clamp-1">
                {loan.remarks}
              </p>
            </div>
          )}
          {nextPayment && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-sm text-muted-foreground">Next payment</span>
                <span className="font-medium sm:text-right">
                  {format(parseISO(nextPayment.dueDate), "PPP")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="sm:text-right">
                  ₹{nextPayment.amount.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Button asChild variant="secondary" className="w-full sm:flex-1">
          <Link href={`/loans/${loan.id}`}>
            <Eye className="h-4 w-4 mr-1" /> View Details
          </Link>
        </Button>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            className="w-full sm:flex-1"
          >
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Loan</DialogTitle>
              <DialogDescription>
                Make changes to the loan details below.
              </DialogDescription>
            </DialogHeader>
            <EditLoanForm
              loan={loan}
              onSuccess={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="w-full sm:w-[40px] md:w-[40px] lg:w-[40px] xl:w-[40px] 2xl:w-[40px] flex justify-center items-center"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Loan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this loan? The loan will be
                moved to trash and can be restored within 100 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
