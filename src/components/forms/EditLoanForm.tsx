"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerInfo, Loan } from "@/types/loan";
import { useLoanStore } from "@/store/loanStore";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const formSchema = z.object({
  customerId: z.string({
    required_error: "Please select a customer",
  }),
  principal: z.coerce.number()
    .positive({ message: "Principal amount must be positive" })
    .min(1, { message: "Principal amount is required" })
    .max(1000000000, { message: "Principal amount cannot exceed 1,000,000,000" }),
  interestRate: z.coerce.number()
    .min(1, { message: "Interest rate must be at least 1%" })
    .max(20, { message: "Interest rate cannot exceed 20%" }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  interestFrequency: z.enum(["monthly", "quarterly", "half-yearly", "yearly"], {
    required_error: "Please select interest payment frequency",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditLoanFormProps {
  loan: Loan;
  onSuccess?: (updatedLoan: Loan | undefined) => void;
}

export function EditLoanForm({ loan, onSuccess }: EditLoanFormProps) {
  const customers = useLoanStore(state => state.customers);
  const updateLoan = useLoanStore(state => state.updateLoan);
  const getLoanById = useLoanStore(state => state.getLoan);
  const isLoading = useLoanStore(state => state.isLoadingLoans);
  
  // Handlers for input validation
  const validatePrincipalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers with max 10 digits (up to 1 billion)
    if (value && !/^\d{1,10}$/.test(value)) {
      e.target.value = value.slice(0, 10).replace(/[^0-9]/g, '');
    }
  };
  
  const validateInterestRateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numbers between 1-20 with up to 2 decimal places
    if (value) {
      const parts = value.split('.');
      if (parts.length > 1) {
        // Has decimal point
        const integerPart = parts[0].replace(/[^0-9]/g, '');
        const decimalPart = parts[1].replace(/[^0-9]/g, '').slice(0, 2);
        e.target.value = `${integerPart}.${decimalPart}`;
      } else {
        // No decimal point
        e.target.value = value.replace(/[^0-9]/g, '');
      }
      
      // Check if value is > 20
      const numValue = parseFloat(e.target.value);
      if (numValue > 20) {
        e.target.value = '20';
      }
    }
  };
  
  // State for manual date inputs
  const [startDateInput, setStartDateInput] = useState(loan.startDate);
  const [endDateInput, setEndDateInput] = useState(loan.endDate);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: loan.customerId,
      principal: loan.principal,
      interestRate: loan.interestRate,
      startDate: new Date(loan.startDate),
      endDate: new Date(loan.endDate),
      interestFrequency: loan.interestFrequency,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const loanUpdatePayload: Partial<Omit<Loan, "id" | "interestPayments" | "customerId">> = {
        principal: values.principal,
        interestRate: values.interestRate,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: format(values.endDate, "yyyy-MM-dd"),
        interestFrequency: values.interestFrequency,
      };
      
      await updateLoan(loan.id, loanUpdatePayload);
      
      toast.success("Loan updated successfully");
      
      if (onSuccess) {
        const updatedLoanFromStore = getLoanById(loan.id);
        onSuccess(updatedLoanFromStore);
      }
    } catch (error: any) {
      console.error("Failed to update loan (form submission):", error);
      toast.error(error.message || "Failed to update loan. An unexpected error occurred.");
    }
  }

  // Handle manual date input
  const handleManualStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDateInput(e.target.value);
    try {
      const parsedDate = parse(e.target.value, "yyyy-MM-dd", new Date());
      if (!isNaN(parsedDate.getTime())) {
        form.setValue("startDate", parsedDate);
      }
    } catch (error) {
      console.error("Invalid date format:", error);
    }
  };

  const handleManualEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDateInput(e.target.value);
    try {
      const parsedDate = parse(e.target.value, "yyyy-MM-dd", new Date());
      if (!isNaN(parsedDate.getTime())) {
        form.setValue("endDate", parsedDate);
      }
    } catch (error) {
      console.error("Invalid date format:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.mobile})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the customer for this loan
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="principal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Principal Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter loan amount"
                  {...field}
                  min="1"
                  max="1000000000"
                  onInput={validatePrincipalInput}
                />
              </FormControl>
              <FormDescription>
                The initial loan amount to be repaid (max 1,000,000,000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="interestRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annual Interest Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter interest rate"
                  step="0.01"
                  min="1"
                  max="20"
                  onInput={validateInterestRateInput}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Annual interest rate as a percentage (1-20%)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <div className="grid gap-2">
                  {/* <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          if (date) {
                            setStartDateInput(format(date, "yyyy-MM-dd"));
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        captionLayout="dropdown-buttons"
                        fromYear={2000}
                        toYear={2100}
                      />
                    </PopoverContent>
                  </Popover> */}
                  
                  <FormControl>
                    <Input
                      type="date"
                      value={startDateInput}
                      onChange={handleManualStartDateChange}
                      placeholder="YYYY-MM-DD"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <div className="grid gap-2">
                  <FormControl>
                    <Input
                      type="date"
                      value={endDateInput}
                      onChange={handleManualEndDateChange}
                      placeholder="YYYY-MM-DD"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="interestFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest Payment Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How frequently interest payments will be collected
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Updating Loan..." : "Update Loan"}
        </Button>
      </form>
    </Form>
  );
}
