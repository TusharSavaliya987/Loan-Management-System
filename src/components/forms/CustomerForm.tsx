"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CustomerInfo } from "@/types/loan";
import { useLoanStore } from "@/store/loanStore";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  mobile: z.string()
    .min(10, { message: "Mobile number must be at least 10 digits." })
    .max(15, { message: "Mobile number must not exceed 15 digits." })
    .regex(/^[0-9+\s-]+$/, { message: "Invalid mobile number format." }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  onSuccess?: (customer: CustomerInfo) => void;
  defaultValues?: Partial<FormValues>;
}

export function CustomerForm({ onSuccess, defaultValues }: CustomerFormProps) {
  const addCustomer = useLoanStore(state => state.addCustomer);
  const isLoading = useLoanStore(state => state.isLoadingCustomers);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      mobile: "",
      email: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const customerData = {
        name: values.name,
        mobile: values.mobile,
        email: values.email
      };
      
      const newCustomer = await addCustomer(customerData);
      
      if (newCustomer) {
        toast.success("Customer added successfully");
        form.reset();
        if (onSuccess) {
          onSuccess(newCustomer);
        }
      } else {
        toast.error("Failed to add customer. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to add customer (form submission):", error);
      toast.error(error.message || "Failed to add customer. An unexpected error occurred.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter customer name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter mobile number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter email address" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Adding Customer..." : "Add Customer"}
        </Button>
      </form>
    </Form>
  );
}
