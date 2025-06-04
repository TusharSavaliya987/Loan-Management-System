"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLoanStore } from "@/store/loanStore";
import { FileText, IndianRupee, Download } from "lucide-react";
import { toast } from "sonner";
import { exportLoansToExcel, exportCustomersToPDF } from "@/utils/exportUtils";
import apiClient from "@/lib/apiClient";
import { Loan, CustomerInfo } from "@/types/loan";

const Reports = () => {
  const loansFromStore = useLoanStore(state => state.loans);
  const customersFromStore = useLoanStore(state => state.customers);
  const getCustomerFromStore = useLoanStore(state => state.getCustomer);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExportingLoans, setIsExportingLoans] = useState(false);
  const [isExportingCustomers, setIsExportingCustomers] = useState(false);
  
  const filteredLoansForUI = useMemo(() => {
    return loansFromStore
      .filter(loan => {
        if (statusFilter === "all") return true;
        return loan.status === statusFilter;
      })
      .map(loan => {
        const customer = getCustomerFromStore(loan.customerId);
        if (!customer) return null;
        return { loan, customer };
      })
      .filter(Boolean) as { loan: Loan; customer: CustomerInfo }[];
  }, [loansFromStore, getCustomerFromStore, statusFilter]);
  
  const handleExportLoansExcel = async () => {
    if (isExportingLoans) return;
    setIsExportingLoans(true);
    toast.info("Fetching latest loan data for Excel report...");
    try {
      const reportData = await apiClient<Array<{ loan: Loan; customer: CustomerInfo }>>('reports/all-loans-data', 'GET');
      
      if (reportData && reportData.length > 0) {
        exportLoansToExcel(reportData);
        toast.success("Loans Excel report generated successfully!");
      } else {
        toast.info("No loan data found to generate the report.");
      }
    } catch (error: any) {
      console.error("Error fetching loan data for export:", error);
      toast.error(error.message || "Failed to fetch loan data for Excel report.");
    }
    setIsExportingLoans(false);
  };
  
  const handleExportCustomersPDF = async () => {
    if (isExportingCustomers) return;
    setIsExportingCustomers(true);
    toast.info("Fetching latest customer data for PDF report...");
    try {
      const customersData = await apiClient<CustomerInfo[]>('reports/all-customers-data', 'GET');
      if (customersData && customersData.length > 0) {
        exportCustomersToPDF(customersData);
        toast.success("Customers PDF report generated successfully!");
      } else {
        toast.info("No customer data found to generate the report.");
      }
    } catch (error: any) {
      console.error("Error fetching customer data for export:", error);
      toast.error(error.message || "Failed to fetch customer data for PDF report.");
    }
    setIsExportingCustomers(false);
  };
  
  const stats = useMemo(() => {
    const activeLoans = loansFromStore.filter(loan => loan.status === "active");
    const closedLoans = loansFromStore.filter(loan => loan.status === "closed");
    
    const totalPrincipal = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalInterest = activeLoans.reduce((sum, loan) => {
      return sum + loan.interestPayments.reduce((interestSum, payment) => interestSum + payment.amount, 0);
    }, 0);
    
    const paidInterest = activeLoans.reduce((sum, loan) => {
      return sum + loan.interestPayments
        .filter(payment => payment.status === "paid")
        .reduce((interestSum, payment) => interestSum + (payment.amountPaid ?? payment.amount), 0);
    }, 0);
    
    return {
      activeLoansCount: activeLoans.length,
      closedLoansCount: closedLoans.length,
      customersCount: customersFromStore.length,
      totalPrincipal,
      totalInterest,
      paidInterest
    };
  }, [loansFromStore, customersFromStore]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">{stats.activeLoansCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closed Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">{stats.closedLoansCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {stats.totalPrincipal.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {stats.paidInterest.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Export your loan and customer data for record keeping</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="loans">
            <TabsList className="mb-4">
              <TabsTrigger value="loans">Loan Reports</TabsTrigger>
              <TabsTrigger value="customers">Customer Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="loans">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by status (For UI Display Only)</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Loans</SelectItem>
                      <SelectItem value="active">Active Loans</SelectItem>
                      <SelectItem value="closed">Closed Loans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Loans Report (Excel)</h3>
                      <p className="text-sm text-muted-foreground">
                        Export all your loans to Excel format (uses latest data from database)
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleExportLoansExcel}
                      disabled={isExportingLoans}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {isExportingLoans ? "Generating..." : "Export Excel"}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>This report will include all loans associated with your account from the database.</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="customers">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Customers Report (PDF)</h3>
                      <p className="text-sm text-muted-foreground">
                        Export all customers to PDF format (uses latest data from database)
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleExportCustomersPDF}
                      disabled={isExportingCustomers}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {isExportingCustomers ? "Generating..." : "Export PDF"}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>This report includes information on all customers from the database.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-between">
          <p className="text-sm text-muted-foreground">
            Reports are generated based on the current data in your system fetched live from the database.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Reports;
