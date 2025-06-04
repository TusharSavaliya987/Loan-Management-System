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
import { format, parse, parseISO } from "date-fns";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { CalendarIcon, FileImage, X } from "lucide-react";
// import { cn } from "@/lib/utils";
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
  contractNote: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LoanFormProps {
  onSuccess?: (newLoan: Loan | null) => void;
}

export function LoanForm({ onSuccess }: LoanFormProps) {
  const customers = useLoanStore(state => state.customers);
  const addLoan = useLoanStore(state => state.addLoan);
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
    
    // 4. Max value check (up to "20.xx"). Min value (1) is handled by Zod.
    // Allows "0", "0.", "." as intermediate.
    if (value !== "" && value !== "." ) { 
      if (!value.endsWith('.')) { // Only parse if not ending with a dot (e.g. "1." is allowed)
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) { 
              if (numValue > 20) {
                  value = "20";
              } else if (numValue < 0) { 
                  value = ""; 
              }
          }
      } else { // Value ends with a dot, e.g., "123." or "30."
          if (value.length > 1) { // Avoid parsing just "."
            const numPartBeforeDot = parseFloat(parts[0]);
            if (!isNaN(numPartBeforeDot)) {
                if (numPartBeforeDot > 20) {
                    value = "20."; 
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
  
  // State for manual date inputs
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  
  // State for contract note preview
  const [contractNotePreview, setContractNotePreview] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      principal: undefined,
      interestRate: undefined,
      startDate: undefined,
      endDate: undefined,
      interestFrequency: undefined,
      contractNote: undefined,
    },
  });

  // Handle file upload for contract note
  const handleContractNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      form.setValue("contractNote", base64String);
      setContractNotePreview(base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // Remove contract note
  const removeContractNote = () => {
    form.setValue("contractNote", undefined);
    setContractNotePreview(null);
  };

  async function onSubmit(values: FormValues) {
    try {
      const loanPayload = {
        customerId: values.customerId,
        principal: values.principal,
        interestRate: values.interestRate,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: format(values.endDate, "yyyy-MM-dd"),
        interestFrequency: values.interestFrequency,
        contractNote: values.contractNote,
        status: "active" as const,
      };
      
      const newLoan = await addLoan(loanPayload);
      
      toast.success("Loan added successfully");
      
      // Reset form after successful submission
      form.reset();
      setContractNotePreview(null);
      setStartDateInput("");
      setEndDateInput("");
      
      if (onSuccess) {
        onSuccess(newLoan);
      }
    } catch (error: Error | unknown) {
      console.error("Failed to add loan (form submission):", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add loan. An unexpected error occurred.";
      toast.error(errorMessage);
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
                  placeholder="Enter principal amount" 
                  min="1"
                  max="1000000000"
                  onInput={validatePrincipalInput}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.valueAsNumber);
                  }}
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
                interest rate in percentage (11%,12.25%,1.25% is valid)
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
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value instanceof Date ? field.value : parseISO(field.value as string), 'yyyy-MM-dd') : ''}
                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
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
                      value={field.value ? format(field.value instanceof Date ? field.value : parseISO(field.value as string), 'yyyy-MM-dd') : ''}
                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
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
          {isLoading ? "Adding Loan..." : "Add Loan"}
        </Button>
      </form>
    </Form>
  );
}
