
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InterestPayment, Loan } from "@/types/loan";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { CalendarIcon, IndianRupee } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLoanStore } from "@/store/loanStore";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentTableProps {
  loan: Loan;
}

export function PaymentTable({ loan }: PaymentTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<InterestPayment | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [manualAmount, setManualAmount] = useState<number | undefined>(undefined);
  const [useManualAmount, setUseManualAmount] = useState(false);
  
  const markInterestPaid = useLoanStore(state => state.markInterestPaid);
  
  const handleMarkPaid = () => {
    if (!selectedPayment || !date) return;
    
    try {
      markInterestPaid(
        loan.id, 
        selectedPayment.id, 
        format(date, "yyyy-MM-dd"), 
        remarks || undefined,
        useManualAmount ? manualAmount : undefined
      );
      
      toast.success("Payment marked as paid");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to mark payment as paid");
      console.error(error);
    }
  };
  
  const resetForm = () => {
    setRemarks("");
    setManualAmount(undefined);
    setUseManualAmount(false);
    setSelectedPayment(null);
  };
  
  const openDialog = (payment: InterestPayment) => {
    setSelectedPayment(payment);
    setManualAmount(payment.amount);
    setOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="outline" className="bg-green-50">Paid</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid On</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loan.interestPayments.map((payment, index) => (
            <TableRow key={payment.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                {payment.periodStart && payment.periodEnd ? (
                  <span className="text-xs">
                    {format(parseISO(payment.periodStart), "dd MMM yyyy")} - {format(parseISO(payment.periodEnd), "dd MMM yyyy")}
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{format(parseISO(payment.dueDate), "dd MMM yyyy")}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <IndianRupee className="h-3 w-3 mr-1" />
                  {payment.amount.toLocaleString('en-IN')}
                  {payment.isManualAmount && (
                    <Badge variant="outline" className="ml-1 text-xs py-0 px-1">Manual</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell>
                {payment.paidOn ? format(parseISO(payment.paidOn), "dd MMM yyyy") : "-"}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {payment.remarks || "-"}
              </TableCell>
              <TableCell className="text-right">
                {payment.status === "pending" && loan.status === "active" && (
                  <Dialog open={open && selectedPayment?.id === payment.id} onOpenChange={(value) => {
                    if (!value) {
                      resetForm();
                    }
                    setOpen(value);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openDialog(payment)}
                      >
                        Mark Paid
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Payment as Paid</DialogTitle>
                        <DialogDescription>
                          Mark the interest payment for period {payment.periodStart && payment.periodEnd ? (
                            <span>
                              {format(parseISO(payment.periodStart), "dd MMM yyyy")} - {format(parseISO(payment.periodEnd), "dd MMM yyyy")}
                            </span>
                          ) : 'current period'} as paid.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Payment Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !date && "text-muted-foreground"
                                )}
                              >
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="flex items-center space-x-2 pb-2">
                          <Checkbox 
                            id="useManualAmount" 
                            checked={useManualAmount} 
                            onCheckedChange={(checked) => {
                              setUseManualAmount(checked === true);
                              if (!checked) {
                                setManualAmount(selectedPayment?.amount);
                              }
                            }} 
                          />
                          <Label htmlFor="useManualAmount">Modify interest amount</Label>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <div className="flex items-center relative">
                            <IndianRupee className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                              type="number"
                              className="pl-8"
                              value={manualAmount}
                              disabled={!useManualAmount}
                              onChange={(e) => setManualAmount(parseFloat(e.target.value))}
                            />
                          </div>
                          {useManualAmount && (
                            <p className="text-xs text-muted-foreground">
                              Default calculated amount: ₹{selectedPayment?.amount.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Remarks (optional)</Label>
                          <Textarea 
                            placeholder="Add any notes about this payment"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setOpen(false);
                          resetForm();
                        }}>Cancel</Button>
                        <Button onClick={handleMarkPaid}>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
