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
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { DatePickerWithInput } from "@/components/ui/date-picker";

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
    .max(100, { message: "Interest rate cannot exceed 100%" }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  interestFrequency: z.enum(["monthly", "quarterly", "half-yearly", "yearly"], {
    required_error: "Please select interest payment frequency",
  }),
  remarks: z.string().optional(),
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
    let value = e.target.value;
    const originalValue = value; 
    const selectionStart = e.target.selectionStart; 

    // 1. Allow only digits and decimal points initially
    value = value.replace(/[^0-9.]/g, "");

    // 2. Ensure only one decimal point (keep the first one if multiple were typed/pasted)
    const firstDotPosition = value.indexOf('.');
    if (firstDotPosition !== -1) {
      value = value.substring(0, firstDotPosition + 1) + value.substring(firstDotPosition + 1).replace(/\./g, '');
    }

    // 3. Limit to two decimal places
    const parts = value.split('.'); 
    if (parts.length > 1 && parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // 4. Max value check (up to "100.xx"). Min value (1) is handled by Zod.
    // Allows "0", "0.", "." as intermediate.
    if (value !== "" && value !== "." ) { 
      if (!value.endsWith('.')) { // Only parse if not ending with a dot (e.g. "1." is allowed)
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) { 
              if (numValue > 100) {
                  value = "100";
              } else if (numValue < 0) { 
                  value = ""; 
              }
          }
      } else { // Value ends with a dot, e.g., "123." or "30."
          if (value.length > 1) { // Avoid parsing just "."
            const numPartBeforeDot = parseFloat(parts[0]);
            if (!isNaN(numPartBeforeDot)) {
                if (numPartBeforeDot > 100) {
                    value = "100."; 
                } else if (numPartBeforeDot < 0) {
                    value = "0."; // Or "" or "." depending on desired behavior
                }
            }
          }
      }
    }

    if (value !== originalValue) {
      e.target.value = value;
      if (selectionStart !== null) {
        const diff = originalValue.length - value.length;
        e.target.setSelectionRange(selectionStart - diff, selectionStart - diff);
      }
    }
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: loan.customerId,
      principal: loan.principal,
      interestRate: loan.interestRate,
      startDate: new Date(loan.startDate),
      endDate: new Date(loan.endDate),
      interestFrequency: loan.interestFrequency,
      remarks: loan.remarks || "",
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
        remarks: values.remarks,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
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
                <SelectContent className="max-h-56">
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
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any remarks for the loan (e.g., cheque no., special conditions)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add any notes or descriptions for this loan.
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
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter interest rate"
                  onInput={validateInterestRateInput}
                  {...field}
                  value={field.value === undefined ? '' : String(field.value)}
                />
              </FormControl>
              <FormDescription>
                Annual interest rate as a percentage
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
                <DatePickerWithInput
                  value={field.value}
                  onChange={(date) => {
                    field.onChange(date);
                    const endDate = form.getValues("endDate");
                    if (date && endDate && date > endDate) {
                      form.setValue("endDate", undefined as any, {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
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
                <DatePickerWithInput
                  value={field.value}
                  onChange={field.onChange}
                  disabled={(date) =>
                    form.getValues("startDate")
                      ? date <= form.getValues("startDate")
                      : false
                  }
                  maxDate={2200}
                />
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
