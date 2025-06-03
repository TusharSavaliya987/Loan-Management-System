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

const Reports = () => {
  const loans = useLoanStore(state => state.loans);
  const customers = useLoanStore(state => state.customers);
  const getCustomer = useLoanStore(state => state.getCustomer);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        if (statusFilter === "all") return true;
        return loan.status === statusFilter;
      })
      .map(loan => {
        const customer = getCustomer(loan.customerId);
        if (!customer) return null;
        return { loan, customer };
      })
      .filter(Boolean) as { loan: typeof loans[0]; customer: typeof customers[0] }[];
  }, [loans, getCustomer, statusFilter]);
  
  const handleExportLoansExcel = () => {
    exportLoansToExcel(filteredLoans);
    toast.success("Excel report generated successfully");
  };
  
  const handleExportCustomersPDF = () => {
    exportCustomersToPDF(customers);
    toast.success("PDF report generated successfully");
  };
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const activeLoans = loans.filter(loan => loan.status === "active");
    const closedLoans = loans.filter(loan => loan.status === "closed");
    
    const totalPrincipal = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalInterest = activeLoans.reduce((sum, loan) => {
      return sum + loan.interestPayments.reduce((interestSum, payment) => interestSum + payment.amount, 0);
    }, 0);
    
    const paidInterest = activeLoans.reduce((sum, loan) => {
      return sum + loan.interestPayments
        .filter(payment => payment.status === "paid")
        .reduce((interestSum, payment) => interestSum + payment.amount, 0);
    }, 0);
    
    return {
      activeLoansCount: activeLoans.length,
      closedLoansCount: closedLoans.length,
      customersCount: customers.length,
      totalPrincipal,
      totalInterest,
      paidInterest
    };
  }, [loans, customers]);
  
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
                  <Label>Filter by status</Label>
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
                        Export all {statusFilter === "all" ? "loans" : `${statusFilter} loans`} to Excel format
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleExportLoansExcel}
                      disabled={filteredLoans.length === 0}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {filteredLoans.length === 0 ? 
                    <p>No loans match the selected filter criteria.</p> : 
                    <p>This report includes {filteredLoans.length} {statusFilter === "all" ? "loans" : `${statusFilter} loans`}.</p>
                  }
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
                        Export all customers to PDF format
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleExportCustomersPDF}
                      disabled={customers.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {customers.length === 0 ? 
                    <p>No customers found in the system.</p> : 
                    <p>This report includes information on all {customers.length} customers.</p>
                  }
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-between">
          <p className="text-sm text-muted-foreground">
            Reports are generated based on the current data in your system.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Reports;
