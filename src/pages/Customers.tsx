"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { useLoanStore } from "@/store/loanStore";
import { User } from "lucide-react";

const Customers = () => {
  const customers = useLoanStore(state => state.customers);
  const loans = useLoanStore(state => state.loans);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.mobile.includes(searchQuery) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Function to count active loans for a customer
  const getActiveLoansCount = (customerId: string) => {
    return loans.filter(loan => 
      loan.customerId === customerId && loan.status === "active"
    ).length;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2 items-center">
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
            <CustomerForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, mobile or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-muted-foreground mt-1">
            {customers.length === 0
              ? "You haven't added any customers yet. Click 'Add New Customer' to get started."
              : "No customers match your search criteria. Try adjusting your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => {
            const activeLoansCount = getActiveLoansCount(customer.id);
            
            return (
              <Card key={customer.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{customer.name}</h3>
                        <p className="text-muted-foreground">{customer.mobile}</p>
                      </div>
                      <div className="bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
                        {activeLoansCount}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{customer.email}</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Active Loans:</span>
                        <span>{activeLoansCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Customers;
