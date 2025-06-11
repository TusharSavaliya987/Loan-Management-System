"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
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
import apiClient from "@/lib/apiClient";
import { Loan, CustomerInfo } from "@/types/loan";
import { SimplePagination } from "@/components/ui/pagination";

const LoanDetails = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const loanIdFromParams = params?.id;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const itemsPerPage = 10;
  
  const loanFromStore = useLoanStore(state => loanIdFromParams ? state.getLoan(loanIdFromParams) : null);
  const getCustomerFromStore = useLoanStore(state => state.getCustomer);
  const updateLoanStoreAction = useLoanStore(state => state.updateLoan);
  const markPrincipalPaidStoreAction = useLoanStore(state => state.markPrincipalPaid);
  
  const [closingConfirmOpen, setClosingConfirmOpen] = useState(false);
  const [principalConfirmOpen, setPrincipalConfirmOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const customerFromStore = useMemo(() => {
    if (!loanFromStore) return null;
    return getCustomerFromStore(loanFromStore.customerId);
  }, [loanFromStore, getCustomerFromStore]);
  
  const pendingInterestPayments = useMemo(() => {
    if (!loanFromStore) return [];
    return loanFromStore.interestPayments.filter(p => p.status === "pending");
  }, [loanFromStore]);
  
  const paidInterestPayments = useMemo(() => {
    if (!loanFromStore) return [];
    return loanFromStore.interestPayments.filter(p => p.status === "paid");
  }, [loanFromStore]);
  
  const totalInterest = useMemo(() => {
    if (!loanFromStore) return 0;
    return loanFromStore.interestPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [loanFromStore]);
  
  const paidInterest = useMemo(() => {
    if (!loanFromStore) return 0;
    return paidInterestPayments.reduce((sum, payment) => sum + (payment.amountPaid ?? payment.amount), 0);
  }, [paidInterestPayments]);
  
  const getPageItems = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };
  
  const totalPages = useMemo(() => {
    if (!loanFromStore) return 1;
    return Math.ceil(loanFromStore.interestPayments.length / itemsPerPage);
  }, [loanFromStore, itemsPerPage]);

  const totalPendingPages = useMemo(() => {
    if (!pendingInterestPayments) return 1;
    return Math.ceil(pendingInterestPayments.length / itemsPerPage);
  }, [pendingInterestPayments, itemsPerPage]);

  const totalPaidPages = useMemo(() => {
    if (!paidInterestPayments) return 1;
    return Math.ceil(paidInterestPayments.length / itemsPerPage);
  }, [paidInterestPayments, itemsPerPage]);
  
  const handleExportPDF = async () => {
    if (!loanIdFromParams) {
      toast.error("Loan ID is missing.");
      return;
    }
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    toast.info("Fetching latest loan details for PDF report...");

    try {
      const fetchedData = await apiClient<{ loan: Loan; customer: CustomerInfo }>(
        `reports/single-loan-data/${loanIdFromParams}`,
        'GET'
      );

      if (fetchedData && fetchedData.loan && fetchedData.customer) {
        exportInterestPaymentsToPDF(fetchedData.loan, fetchedData.customer);
        toast.success("Loan details PDF report generated successfully!");
      } else {
        toast.error("Could not fetch complete loan details for the report.");
      }
    } catch (error: any) {
      console.error("Error fetching loan details for PDF export:", error);
      toast.error(error.message || "Failed to fetch loan details for PDF report.");
    }
    setIsExportingPDF(false);
  };
  
  const handleCloseLoan = async () => {
    if (!loanFromStore) return;
    try {
      await updateLoanStoreAction(loanFromStore.id, { status: "closed" });
      setClosingConfirmOpen(false);
      toast.success("Loan has been closed");
    } catch (error) {
      console.error("Failed to close loan:", error);
      toast.error("Failed to close the loan. Please try again.");
    }
  };
  
  const handleMarkPrincipalPaid = async () => {
    if (!loanFromStore) return;
    try {
      await markPrincipalPaidStoreAction(loanFromStore.id);
      setPrincipalConfirmOpen(false);
      toast.success("Principal amount marked as paid");
    } catch (error) {
      console.error("Failed to mark principal paid:", error);
      toast.error("Failed to mark principal as paid. Please try again.");
    }
  };
  
  if (!loanFromStore || !customerFromStore) {
    return (
      <div className="flex justify-center items-center h-80">
        <p>Loan not found or customer data missing from store.</p>
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
              <Badge variant={loanFromStore.status === "active" ? "default" : "secondary"}>
                {loanFromStore.status === "active" ? "Active" : loanFromStore.status.charAt(0).toUpperCase() + loanFromStore.status.slice(1) }
              </Badge>
            </h1>
            <p className="text-muted-foreground">Customer: {customerFromStore.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex gap-2" onClick={handleExportPDF} disabled={isExportingPDF}>
            <FileText className="h-4 w-4" />
            {isExportingPDF ? "Generating..." : "Export PDF"}
          </Button>
          
          {loanFromStore.status === "active" && (
            <>
              <Dialog open={principalConfirmOpen} onOpenChange={setPrincipalConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex gap-2" disabled={loanFromStore.principalPaid}>
                    <IndianRupee className="h-4 w-4" />
                    {loanFromStore.principalPaid ? "Principal Paid" : "Mark Principal Paid"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Principal Payment</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to mark the principal amount of ₹{loanFromStore.principal.toLocaleString('en-IN')} as paid?
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
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
            <CardDescription>Details of the loan and customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {customerFromStore.name}</p>
                <p><span className="text-muted-foreground">Mobile:</span> {customerFromStore.mobile}</p>
                <p><span className="text-muted-foreground">Email:</span> {customerFromStore.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Loan Information</h3>
              <div className="space-y-1 text-sm">
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-medium flex items-center sm:text-right">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {loanFromStore.principal.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-medium sm:text-right">{loanFromStore.interestRate}% p.a.</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium sm:text-right">{format(parseISO(loanFromStore.startDate), "dd MMM yyyy")}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-medium sm:text-right">{format(parseISO(loanFromStore.endDate), "dd MMM yyyy")}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Payment Frequency:</span>
                  <span className="font-medium capitalize sm:text-right">{loanFromStore.interestFrequency}</span>
                </p>
                {loanFromStore.remarks && (
                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground">Remarks:</span>
                    <p className="font-medium sm:text-right whitespace-pre-wrap">{loanFromStore.remarks}</p>
                  </div>
                )}
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Principal Status:</span>
                  <Badge variant="outline" className={`${loanFromStore.principalPaid ? "bg-green-50" : ""} sm:ml-auto`}>
                    {loanFromStore.principalPaid ? "Paid" : "Outstanding"}
                  </Badge>
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Payment Summary</h3>
              <div className="space-y-1 text-sm">
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Total Interest:</span>
                  <span className="font-medium flex items-center sm:text-right">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {totalInterest.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Paid Interest:</span>
                  <span className="font-medium flex items-center sm:text-right">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {paidInterest.toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Pending Interest:</span>
                  <span className="font-medium flex items-center sm:text-right">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {(totalInterest - paidInterest).toLocaleString('en-IN')}
                  </span>
                </p>
                <p className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground">Paid Installments:</span>
                  <span className="font-medium sm:text-right">{paidInterestPayments.length} of {loanFromStore.interestPayments.length}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Interest Payments</CardTitle>
            <CardDescription>Track all interest payments for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            {loanFromStore.interestPayments.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No payment schedules found</p>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({loanFromStore.interestPayments.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingInterestPayments.length})</TabsTrigger>
                  <TabsTrigger value="paid">Paid ({paidInterestPayments.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="overflow-x-auto">
                  <PaymentTable 
                    loan={{
                      ...loanFromStore,
                      interestPayments: getPageItems(loanFromStore.interestPayments)
                    }}
                    startIndex={(currentPage - 1) * itemsPerPage}
                  />
                  <SimplePagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </TabsContent>
                
                <TabsContent value="pending" className="overflow-x-auto">
                  {pendingInterestPayments.length === 0 ? (
                    <Alert>
                      <AlertTitle>No pending payments</AlertTitle>
                      <AlertDescription>All payments for this loan have been completed.</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <PaymentTable 
                        loan={{
                          ...loanFromStore,
                          interestPayments: getPageItems(pendingInterestPayments)
                        }}
                        startIndex={(currentPage - 1) * itemsPerPage}
                      />
                      <SimplePagination 
                        currentPage={currentPage}
                        totalPages={totalPendingPages}
                        onPageChange={setCurrentPage}
                      />
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="paid" className="overflow-x-auto">
                  {paidInterestPayments.length === 0 ? (
                    <Alert>
                      <AlertTitle>No paid payments</AlertTitle>
                      <AlertDescription>No payments have been marked as paid yet.</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <PaymentTable 
                        loan={{
                          ...loanFromStore,
                          interestPayments: getPageItems(paidInterestPayments)
                        }}
                        startIndex={(currentPage - 1) * itemsPerPage}
                      />
                      <SimplePagination 
                        currentPage={currentPage}
                        totalPages={totalPaidPages}
                        onPageChange={setCurrentPage}
                      />
                    </>
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
