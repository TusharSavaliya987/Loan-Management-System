"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoanStore } from "@/store/loanStore";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, Bell, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const Reminders = () => {
  const loans = useLoanStore(state => state.loans);
  const getCustomer = useLoanStore(state => state.getCustomer);
  
  const [selectedDays, setSelectedDays] = useState(30);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; email: string; dueDate: string; amount: number; } | null>(null);
  
  // Get upcoming payments based on filter
  const upcomingPayments = useMemo(() => {
    const results = [];
    const today = new Date();
    const futureDate = addDays(today, selectedDays);
    
    for (const loan of loans) {
      if (loan.status !== "active") continue;
      
      const customer = getCustomer(loan.customerId);
      if (!customer) continue;
      
      for (const payment of loan.interestPayments) {
        if (payment.status !== "pending") continue;
        
        const dueDate = parseISO(payment.dueDate);
        if (isAfter(dueDate, today) && isBefore(dueDate, futureDate)) {
          results.push({
            loanId: loan.id,
            paymentId: payment.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerMobile: customer.mobile,
            principal: loan.principal,
            dueDate: payment.dueDate,
            amount: payment.amount,
            frequency: loan.interestFrequency,
          });
        }
      }
    }
    
    // Sort by due date
    return results.sort((a, b) => 
      parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
    );
  }, [loans, getCustomer, selectedDays]);
  
  const handleSendEmail = () => {
    // In a real application, this would connect to a backend to send emails
    toast.success(`Email reminder sent to ${selectedCustomer?.email}`);
    setEmailDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Payment Reminders</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Upcoming Interest Payments
          </CardTitle>
          <CardDescription>
            View and manage upcoming interest payments in the next {selectedDays} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label>Time period</Label>
            <div className="flex space-x-2 mt-2">
              {[7, 15, 30, 60, 90].map(days => (
                <Button
                  key={days}
                  variant={selectedDays === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDays(days)}
                >
                  {days} days
                </Button>
              ))}
            </div>
          </div>
          
          {upcomingPayments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="text-lg font-medium">No upcoming payments</h3>
              <p className="text-muted-foreground mt-1">
                There are no interest payments due in the next {selectedDays} days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingPayments.map((payment) => (
                <Card key={payment.paymentId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{payment.customerName}</h3>
                        <p className="text-sm text-muted-foreground">{payment.customerMobile}</p>
                      </div>
                      <Badge>{format(parseISO(payment.dueDate), "dd MMM yyyy")}</Badge>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <p className="text-sm">Interest Due: <span className="font-medium flex items-center">
                          <IndianRupee className="h-3 w-3 mr-1" />{payment.amount.toLocaleString('en-IN')}
                        </span></p>
                        <p className="text-sm mt-1">Payment Type: <span className="font-medium capitalize">{payment.frequency}</span></p>
                      </div>
                      <Dialog open={emailDialogOpen && selectedCustomer?.email === payment.customerEmail} onOpenChange={(open) => {
                        setEmailDialogOpen(open);
                        if (!open) setSelectedCustomer(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedCustomer({
                              name: payment.customerName,
                              email: payment.customerEmail,
                              dueDate: payment.dueDate,
                              amount: payment.amount
                            })}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Payment Reminder</DialogTitle>
                            <DialogDescription>
                              Send an email reminder to {selectedCustomer?.name} about their upcoming interest payment.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="recipient">Recipient</Label>
                              <Input id="recipient" value={selectedCustomer?.email || ""} readOnly />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="subject">Subject</Label>
                              <Input 
                                id="subject" 
                                value={`Interest Payment Reminder - Due on ${selectedCustomer ? format(parseISO(selectedCustomer.dueDate), "dd MMM yyyy") : ""}`} 
                                readOnly 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="message">Message</Label>
                              <Textarea 
                                id="message" 
                                rows={5}
                                defaultValue={`Dear ${selectedCustomer?.name},

This is a friendly reminder that your interest payment of ₹${selectedCustomer?.amount.toLocaleString('en-IN')} is due on ${selectedCustomer ? format(parseISO(selectedCustomer.dueDate), "dd MMMM yyyy") : ""}.

Please make your payment before the due date to avoid any late fees.

Thank you.`}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSendEmail}>Send Email</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            In a production environment, reminders would be automatically sent via email based on your settings.
            This interface demonstrates how the notification system would work.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Reminders;
