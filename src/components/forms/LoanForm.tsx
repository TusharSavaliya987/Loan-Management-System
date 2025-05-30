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
import { CalendarIcon, FileImage, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const formSchema = z.object({
  customerId: z.string({
    required_error: "Please select a customer",
  }),
  principal: z.coerce.number()
    .positive({ message: "Principal amount must be positive" })
    .min(1, { message: "Principal amount is required" }),
  interestRate: z.coerce.number()
    .min(0.01, { message: "Interest rate must be at least 0.01%" })
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
      
      if (newLoan) {
        toast.success("Loan added successfully");
        form.reset();
        setStartDateInput("");
        setEndDateInput("");
        setContractNotePreview(null);
        
        if (onSuccess) {
          onSuccess(newLoan);
        }
      } else {
        if (!useLoanStore.getState().error) {
            toast.error("Failed to add loan. Please check details and try again.");
        }
      }
    } catch (error: any) {
      console.error("Failed to add loan (form submission catch):", error);
      toast.error(error.message || "An unexpected error occurred while submitting the loan form.");
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
                <div className="relative rupee-input">
                  <Input 
                    type="number" 
                    placeholder="Enter principal amount" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber);
                    }}
                  />
                </div>
              </FormControl>
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
                  step="0.01" 
                  placeholder="Enter interest rate" 
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.valueAsNumber);
                  }}
                />
              </FormControl>
              <FormDescription>
                Annual interest rate in percentage
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
                  <Popover>
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
                  </Popover>
                  
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
                  <Popover>
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
                            setEndDateInput(format(date, "yyyy-MM-dd"));
                          }
                        }}
                        initialFocus
                        disabled={(date) => {
                          const startDate = form.watch("startDate");
                          return startDate && date < startDate;
                        }}
                        className={cn("p-3 pointer-events-auto")}
                        captionLayout="dropdown-buttons"
                        fromYear={2000}
                        toYear={2100}
                      />
                    </PopoverContent>
                  </Popover>
                  
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
          {isLoading ? "Adding Loan..." : "Add Loan"}
        </Button>
      </form>
    </Form>
  );
}
