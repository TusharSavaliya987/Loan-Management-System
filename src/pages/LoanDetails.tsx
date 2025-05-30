"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLoanStore } from "@/store/loanStore";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentTable } from "@/components/loans/PaymentTable";
import { IndianRupee, ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { exportInterestPaymentsToPDF } from "@/utils/exportUtils";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoanDetails = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const getLoan = useLoanStore(state => state.getLoan);
  const getCustomer = useLoanStore(state => state.getCustomer);
  const updateLoan = useLoanStore(state => state.updateLoan);
  const markPrincipalPaid = useLoanStore(state => state.markPrincipalPaid);
  
  const [closingConfirmOpen, setClosingConfirmOpen] = useState(false);
  const [principalConfirmOpen, setPrincipalConfirmOpen] = useState(false);
  
  const loan = useMemo(() => {
    if (!id) return null;
    return getLoan(id);
  }, [id, getLoan]);
  
  const customer = useMemo(() => {
    if (!loan) return null;
    return getCustomer(loan.customerId);
  }, [loan, getCustomer]);
  
  const pendingInterestPayments = useMemo(() => {
    if (!loan) return [];
    return loan.interestPayments.filter(p => p.status === "pending");
  }, [loan]);
  
  const paidInterestPayments = useMemo(() => {
    if (!loan) return [];
    return loan.interestPayments.filter(p => p.status === "paid");
  }, [loan]);
  
  const totalInterest = useMemo(() => {
    if (!loan) return 0;
    return loan.interestPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [loan]);
  
  const paidInterest = useMemo(() => {
    if (!loan) return 0;
    return paidInterestPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [paidInterestPayments]);
  
  const handleExportPDF = () => {
    if (!loan || !customer) return;
    
    exportInterestPaymentsToPDF(loan, customer);
    toast.success("PDF report generated successfully");
  };
  
  const handleCloseLoan = async () => {
    if (!loan) return;
    
    try {
      await updateLoan(loan.id, { status: "closed" });
      setClosingConfirmOpen(false);
      toast.success("Loan has been closed");
    } catch (error) {
      console.error("Failed to close loan:", error);
      toast.error("Failed to close the loan. Please try again.");
    }
  };
  
  const handleMarkPrincipalPaid = async () => {
    if (!loan) return;
    
    try {
      await markPrincipalPaid(loan.id);
      setPrincipalConfirmOpen(false);
      toast.success("Principal amount marked as paid");
    } catch (error) {
      console.error("Failed to mark principal paid:", error);
      toast.error("Failed to mark principal as paid. Please try again.");
    }
  };
  
  if (!loan || !customer) {
    return (
      <div className="flex justify-center items-center h-80">
        <p>Loan not found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="icon" onClick={() => router.push("/loans")} className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Loan Details
              <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                {loan.status === "active" ? "Active" : "Closed"}
              </Badge>
            </h1>
            <p className="text-muted-foreground">Customer: {customer.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
          
          {loan.status === "active" && (
            <>
              <Dialog open={principalConfirmOpen} onOpenChange={setPrincipalConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex gap-2" disabled={loan.principalPaid}>
                    <IndianRupee className="h-4 w-4" />
                    {loan.principalPaid ? "Principal Paid" : "Mark Principal Paid"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Principal Payment</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to mark the principal amount of ₹{loan.principal.toLocaleString('en-IN')} as paid?
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPrincipalConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleMarkPrincipalPaid}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={closingConfirmOpen} onOpenChange={setClosingConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="flex gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Close Loan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Close Loan</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to close this loan?
                      This will mark the loan as completed and no further interest payments can be recorded.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setClosingConfirmOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleCloseLoan}>Close Loan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
            <CardDescription>Details of the loan and customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {customer.name}</p>
                <p><span className="text-muted-foreground">Mobile:</span> {customer.mobile}</p>
                <p><span className="text-muted-foreground">Email:</span> {customer.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Loan Information</h3>
              <div className="space-y-1 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-medium flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {loan.principal.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-medium">{loan.interestRate}% p.a.</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium">{format(parseISO(loan.startDate), "dd MMM yyyy")}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-medium">{format(parseISO(loan.endDate), "dd MMM yyyy")}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Payment Frequency:</span>
                  <span className="font-medium capitalize">{loan.interestFrequency}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Principal Status:</span>
                  <Badge variant="outline" className={loan.principalPaid ? "bg-green-50" : ""}>
                    {loan.principalPaid ? "Paid" : "Outstanding"}
                  </Badge>
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Payment Summary</h3>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Total Interest:</span>
                  <span className="font-medium flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {totalInterest.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Paid Interest:</span>
                  <span className="font-medium flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {paidInterest.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Pending Interest:</span>
                  <span className="font-medium flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {(totalInterest - paidInterest).toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Paid Installments:</span>
                  <span className="font-medium">{paidInterestPayments.length} of {loan.interestPayments.length}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Interest Payments</CardTitle>
            <CardDescription>Track all interest payments for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            {loan.interestPayments.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No payment schedules found</p>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({loan.interestPayments.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingInterestPayments.length})</TabsTrigger>
                  <TabsTrigger value="paid">Paid ({paidInterestPayments.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="overflow-x-auto">
                  <PaymentTable loan={loan} />
                </TabsContent>
                
                <TabsContent value="pending" className="overflow-x-auto">
                  {pendingInterestPayments.length === 0 ? (
                    <Alert>
                      <AlertTitle>No pending payments</AlertTitle>
                      <AlertDescription>All payments for this loan have been completed.</AlertDescription>
                    </Alert>
                  ) : (
                    <PaymentTable 
                      loan={{
                        ...loan,
                        interestPayments: pendingInterestPayments
                      }} 
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="paid" className="overflow-x-auto">
                  {paidInterestPayments.length === 0 ? (
                    <Alert>
                      <AlertTitle>No paid payments</AlertTitle>
                      <AlertDescription>No payments have been marked as paid yet.</AlertDescription>
                    </Alert>
                  ) : (
                    <PaymentTable 
                      loan={{
                        ...loan,
                        interestPayments: paidInterestPayments
                      }} 
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoanDetails;
