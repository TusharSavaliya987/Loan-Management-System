"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoanCard } from "@/components/loans/LoanCard";
import { LoanForm } from "@/components/forms/LoanForm";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { useLoanStore } from "@/store/loanStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, User } from "lucide-react";

const Loans = () => {
  const loans = useLoanStore(state => state.loans);
  const getCustomer = useLoanStore(state => state.getCustomer);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openLoanDialog, setOpenLoanDialog] = useState(false);
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  
  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        const customer = getCustomer(loan.customerId);
        if (!customer) return false;
        
        const matchesSearch = 
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.mobile.includes(searchQuery);
        
        const matchesStatus = 
          statusFilter === "all" || 
          loan.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by status (active first) and then by start date (newest first)
        if (a.status !== b.status) {
          return a.status === "active" ? -1 : 1;
        }
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
  }, [loans, getCustomer, searchQuery, statusFilter]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={openCustomerDialog} onOpenChange={setOpenCustomerDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex gap-2 items-center">
                <User className="h-4 w-4" />
                Add New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer by filling out the details below.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm onSuccess={() => setOpenCustomerDialog(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={openLoanDialog} onOpenChange={setOpenLoanDialog}>
            <DialogTrigger asChild>
              <Button className="flex gap-2 items-center">
                <IndianRupee className="h-4 w-4" />
                Add New Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Loan</DialogTitle>
                <DialogDescription>
                  Create a new loan by filling out the details below.
                </DialogDescription>
              </DialogHeader>
              <LoanForm onSuccess={() => setOpenLoanDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by customer name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredLoans.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <h3 className="text-lg font-medium">No loans found</h3>
          <p className="text-muted-foreground mt-1">
            {loans.length === 0
              ? "You haven't created any loans yet. Click 'Add New Loan' to get started."
              : "No loans match your search criteria. Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLoans.map(loan => {
            const customer = getCustomer(loan.customerId)!;
            return (
              <LoanCard key={loan.id} loan={loan} customer={customer} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Loans;
