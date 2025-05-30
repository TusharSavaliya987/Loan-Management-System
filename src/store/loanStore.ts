import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CustomerInfo, Loan, InterestPayment, InterestFrequency } from '../types/loan';
import { addMonths, format, parseISO, addDays } from 'date-fns';
import apiClient from '@/lib/apiClient'; 
import { useAuthStore } from './authStore'; // AppUser import removed as it's not directly used here

// Helper function to generate interest payment schedules based on loan details
function generateInterestPayments(
  principal: number,
  interestRate: number,
  startDate: string,
  endDate: string,
  frequency: InterestFrequency
): InterestPayment[] {
  const payments: InterestPayment[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  const annualInterestAmount = (principal * interestRate) / 100;
  
  let interestAmount = 0;
  let monthIncrement = 0;
  
  switch (frequency) {
    case "monthly":
      interestAmount = annualInterestAmount / 12;
      monthIncrement = 1;
      break;
    case "quarterly":
      interestAmount = annualInterestAmount / 4;
      monthIncrement = 3;
      break;
    case "half-yearly":
      interestAmount = annualInterestAmount / 2;
      monthIncrement = 6;
      break;
    case "yearly":
      interestAmount = annualInterestAmount;
      monthIncrement = 12;
      break;
  }
  
  interestAmount = Math.round(interestAmount * 100) / 100;
  
  let currentDate = start;
  let periodStart = startDate;
  
  while (currentDate < end) {
    const nextDate = addMonths(currentDate, monthIncrement);
    const effectiveNextDate = nextDate > end ? end : nextDate;
    const periodEnd = format(effectiveNextDate, "yyyy-MM-dd");
    const dueDate = periodEnd;
    
    payments.push({
      id: uuidv4(),
      dueDate,
      amount: interestAmount,
      status: "pending",
      periodStart,
      periodEnd
    });
    
    if (effectiveNextDate >= end) break;

    currentDate = nextDate;
    periodStart = periodEnd;
  }
  
  return payments;
}

interface LoanState {
  customers: CustomerInfo[];
  loans: Loan[];
  isLoadingCustomers: boolean;
  isLoadingLoans: boolean;
  error: string | null;
  
  // Removed Firestore listener unsubscribe functions
  // unsubscribeCustomers: (() => void) | null;
  // unsubscribeLoans: (() => void) | null;

  // Actions will use apiClient
  fetchCustomers: () => Promise<void>;
  fetchLoans: () => Promise<void>;
  addCustomer: (customerData: Omit<CustomerInfo, "id">) => Promise<CustomerInfo | null>; // Returns new customer or null
  getCustomer: (id: string) => CustomerInfo | undefined;
  addLoan: (loanData: Omit<Loan, "id" | "interestPayments" | "principalPaid">) => Promise<Loan | null>; // Returns new loan or null
  updateLoan: (loanId: string, loanData: Partial<Omit<Loan, "id" | "interestPayments" | "customerId">>) => Promise<void>;
  getLoan: (id: string) => Loan | undefined;
  markInterestPaid: (loanId: string, paymentId: string, paidDate: string, remarks?: string, manualAmount?: number) => Promise<void>;
  markPrincipalPaid: (loanId: string) => Promise<void>;
  getUpcomingPayments: (days: number) => { loan: Loan; payment: InterestPayment; customer: CustomerInfo | undefined }[];
  deleteLoanSoft: (loanId: string) => Promise<void>;
  restoreLoan: (loanId: string) => Promise<void>;
  permanentlyDeleteOldSoftDeletedLoans: (daysToExpire: number) => Promise<void>;

  clearLocalData: () => void; // To clear data on logout
  initializeData: () => Promise<void>; // To fetch initial data on login
}

export const useLoanStore = create<LoanState>((set, get) => ({
  customers: [],
  loans: [],
  isLoadingCustomers: true,
  isLoadingLoans: true,
  error: null,
  // Removed listener state
  // unsubscribeCustomers: null,
  // unsubscribeLoans: null,

  clearLocalData: () => {
    set({
      customers: [],
      loans: [],
      isLoadingCustomers: false, // Set to false as there's no data to load
      isLoadingLoans: false,
      error: null,
    });
  },

  initializeData: async () => {
    const { fetchCustomers, fetchLoans } = get();
    // No need to check for userId here, apiClient handles auth token.
    // If user is not logged in, API calls might be blocked by backend or apiClient.
    set({ isLoadingCustomers: true, isLoadingLoans: true });
    try {
      await Promise.all([fetchCustomers(), fetchLoans()]);
    } catch (error: any) {
      console.error("Error initializing data:", error);
      set({ error: error.message || "Failed to initialize data." });
    } finally {
      // Loading states are set within fetchCustomers/fetchLoans
    }
  },
  
  fetchCustomers: async () => {
    // User UID is handled by apiClient via auth.currentUser
    set({ isLoadingCustomers: true, error: null });
    try {
      const customersData = await apiClient<CustomerInfo[]>('customers', 'GET');
      set({ customers: customersData || [], isLoadingCustomers: false });
    } catch (err: any) {
      console.error("Error fetching customers via API:", err);
      set({ error: "Failed to load customers. " + (err.message || ''), isLoadingCustomers: false });
    }
  },

  fetchLoans: async () => {
    // User UID is handled by apiClient
    set({ isLoadingLoans: true, error: null });
    try {
      // Assuming an endpoint 'loans' that filters by status != 'permanently_deleted' on backend
      const loansData = await apiClient<Loan[]>('loans', 'GET');
      set({ loans: loansData || [], isLoadingLoans: false });
    } catch (err: any) {
      console.error("Error fetching loans via API:", err);
      set({ error: "Failed to load loans. " + (err.message || ''), isLoadingLoans: false });
    }
  },
  
  addCustomer: async (customerData) => {
    // User auth is checked by apiClient
    set({ isLoadingCustomers: true });
    try {
      // API endpoint will be POST /api/customers
      const newCustomer = await apiClient<CustomerInfo>('customers', 'POST', customerData);
      if (newCustomer) {
        // Re-fetch all customers to update the list, or add directly if API returns the full new object with ID
         set(state => ({ customers: [...state.customers, newCustomer], isLoadingCustomers: false, error: null }));
        return newCustomer;
      }
      set({ isLoadingCustomers: false });
      return null;
    } catch (err: any) {
      console.error("Error adding customer via API:", err);
      set({ error: "Failed to add customer. " + (err.message || ''), isLoadingCustomers: false });
      return null;
    }
  },
  
  getCustomer: (id) => {
    return get().customers.find(customer => customer.id === id);
  },
  
  addLoan: async (loanData) => {
    // User auth will be handled by apiClient. 
    // Customer existence check can remain client-side for immediate feedback.
    if (!get().getCustomer(loanData.customerId)) {
      set({ error: "Customer not found for the loan." });
      // Potentially throw error or return a specific result indicating failure
      return null;
    }

    set({ isLoadingLoans: true, error: null });
    try {
      const interestPayments = generateInterestPayments(
        loanData.principal,
        loanData.interestRate,
        loanData.startDate,
        loanData.endDate,
        loanData.interestFrequency
      );
      
      // Prepare the complete loan object to be sent to the API
      // The backend will assign an ID and handle timestamping.
      const loanPayload: Omit<Loan, "id"> = {
        ...loanData,
        interestPayments,
        principalPaid: false,
        status: 'active', // Default status
        // contractNote might be a base64 string or undefined
      };

      // API endpoint POST /api/loans
      const newLoan = await apiClient<Loan>('loans', 'POST', loanPayload);
      
      if (newLoan) {
        // Add the new loan to the local state
        set(state => ({ 
          loans: [...state.loans, newLoan], 
          isLoadingLoans: false, 
          error: null 
        }));
        return newLoan;
      } else {
        // This case might indicate an API issue not throwing an error but not returning a loan
        set({ isLoadingLoans: false, error: "Failed to add loan: No loan data returned from API." });
        return null;
      }
    } catch (err: any) {
      console.error("Error adding loan via API:", err);
      set({ error: "Failed to add loan. " + (err.message || 'Unknown error'), isLoadingLoans: false });
      return null;
    }
  },
  
  updateLoan: async (loanId, loanData) => {
    // User auth handled by apiClient
    const currentLoan = get().loans.find(l => l.id === loanId);
    if (!currentLoan) {
        set({ error: "Loan not found for update." });
        // Potentially throw error
        return;
    }

    set({ isLoadingLoans: true, error: null });
    try {
      let finalLoanData: Partial<Omit<Loan, "id" | "customerId">> = { ...loanData }; // customerId typically not updatable this way

      const needsReschedule = (
        (loanData.principal !== undefined && loanData.principal !== currentLoan.principal) ||
        (loanData.interestRate !== undefined && loanData.interestRate !== currentLoan.interestRate) ||
        (loanData.startDate !== undefined && loanData.startDate !== currentLoan.startDate) ||
        (loanData.endDate !== undefined && loanData.endDate !== currentLoan.endDate) ||
        (loanData.interestFrequency !== undefined && loanData.interestFrequency !== currentLoan.interestFrequency)
      );

      if (needsReschedule) {
        const paidPayments = currentLoan.interestPayments.filter(p => p.status === "paid");
        const newPendingPayments = generateInterestPayments(
          loanData.principal ?? currentLoan.principal,
          loanData.interestRate ?? currentLoan.interestRate,
          loanData.startDate ?? currentLoan.startDate,
          loanData.endDate ?? currentLoan.endDate,
          loanData.interestFrequency ?? currentLoan.interestFrequency
        );
        finalLoanData.interestPayments = [...paidPayments, ...newPendingPayments];
      }
      
      // API endpoint PUT /api/loans/{loanId}
      const updatedLoan = await apiClient<Loan>(`loans/${loanId}`, 'PUT', finalLoanData);
      
      if (updatedLoan) {
        // Update the loan in the local state
        set(state => ({
          loans: state.loans.map(l => l.id === loanId ? updatedLoan : l),
          isLoadingLoans: false,
          error: null
        }));
      } else {
        // If API doesn't return the updated loan, refetch or handle error
        await get().fetchLoans(); // Re-fetch to ensure consistency
      }
    } catch (err: any) {
      console.error("Error updating loan via API:", err);
      set({ error: "Failed to update loan. " + (err.message || 'Unknown error'), isLoadingLoans: false });
    }
  },
  
  getLoan: (id) => {
    return get().loans.find(loan => loan.id === id);
  },
  
  markInterestPaid: async (loanId, paymentId, paidDate, remarks, manualAmount) => {
    const loan = get().loans.find(l => l.id === loanId);
    if (!loan) {
      set({ error: "Loan not found." });
      return;
    }

    set({ isLoadingLoans: true, error: null });
    try {
      const payload = {
        paymentId,
        paidOn: paidDate,
        remarks,
        amount: manualAmount,
      };
      // API endpoint PATCH /api/loans/{loanId}/mark-interest-paid
      const updatedLoan = await apiClient<Loan>(`loans/${loanId}/mark-interest-paid`, 'PATCH', payload);

      if (updatedLoan) {
        set(state => ({
          loans: state.loans.map(l => l.id === loanId ? updatedLoan : l),
          isLoadingLoans: false,
          error: null
        }));
      } else {
        // If API doesn't return the full updated loan, re-fetch all loans for consistency
        await get().fetchLoans(); 
      }
    } catch (err: any) {
      console.error("Error marking interest paid via API:", err);
      set({ error: "Failed to mark interest as paid. " + (err.message || 'Unknown error'), isLoadingLoans: false });
    }
  },
  
  markPrincipalPaid: async (loanId) => {
    set({ isLoadingLoans: true, error: null });
    try {
      // API endpoint PATCH /api/loans/{loanId}/mark-principal-paid
      // Backend sets principalPaid = true and status = "closed"
      const updatedLoan = await apiClient<Loan>(`loans/${loanId}/mark-principal-paid`, 'PATCH', { /* Payload can be empty if action is implicit */ });
      
      if (updatedLoan) {
        set(state => ({
          loans: state.loans.map(l => l.id === loanId ? updatedLoan : l),
          isLoadingLoans: false,
          error: null
        }));
      } else {
        await get().fetchLoans(); // Re-fetch for consistency
      }
    } catch (err: any) {
      console.error("Error marking principal paid via API:", err);
      set({ error: "Failed to mark principal as paid. " + (err.message || 'Unknown error'), isLoadingLoans: false });
    }
  },
  
  getUpcomingPayments: (days) => {
    const now = new Date();
    const futureDate = addDays(now, days);
    const nowStr = format(now, "yyyy-MM-dd");
    const futureDateStr = format(futureDate, "yyyy-MM-dd");
    
    const result: { loan: Loan; payment: InterestPayment; customer: CustomerInfo | undefined }[] = [];
    
    for (const loan of get().loans) {
      if (loan.status === "active") {
        for (const payment of loan.interestPayments) {
          if (
            payment.status === "pending" &&
            payment.dueDate >= nowStr &&
            payment.dueDate <= futureDateStr
          ) {
            const customer = get().getCustomer(loan.customerId);
            result.push({ loan, payment, customer });
          }
        }
      }
    }
    
    return result.sort((a, b) => 
      new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime()
    );
  },

  deleteLoanSoft: async (loanId: string) => {
    set({ isLoadingLoans: true, error: null });
    try {
      // API endpoint DELETE /api/loans/{loanId}
      // Backend will handle marking as 'deleted' and setting 'deletedAt'.
      await apiClient<void>(`loans/${loanId}`, 'DELETE');
      
      // Re-fetch loans to update the list to reflect the soft delete
      await get().fetchLoans(); 

    } catch (err: any) {
      console.error("Error soft deleting loan via API:", err);
      set({ error: "Failed to delete loan. " + (err.message || 'Unknown error'), isLoadingLoans: false });
    } finally {
      // Ensure loading state is reset even if fetchLoans errors
      set({isLoadingLoans: false});
    }
  },

  restoreLoan: async (loanId: string) => {
    set({ isLoadingLoans: true, error: null });
    try {
      // API endpoint PATCH /api/loans/{loanId}/restore
      // Backend will set status to 'active' and nullify/remove 'deletedAt'.
      const updatedLoan = await apiClient<Loan>(`loans/${loanId}/restore`, 'PATCH', { status: "active" } /* or empty if implicit */);
      
      if (updatedLoan) {
         set(state => ({
          loans: state.loans.map(l => l.id === loanId ? updatedLoan : l),
          isLoadingLoans: false,
          error: null
        }));
      } else {
        await get().fetchLoans(); // Re-fetch for consistency
      }
    } catch (err: any) {
      console.error("Error restoring loan via API:", err);
      set({ error: "Failed to restore loan. " + (err.message || 'Unknown error'), isLoadingLoans: false });
    }
  },
  
  permanentlyDeleteOldSoftDeletedLoans: async (daysToExpire: number = 30) => {
    set({ isLoadingLoans: true, error: null });
    try {
      // API endpoint POST /api/loans/permanently-delete-old
      const response = await apiClient<{ count: number }>(`loans/permanently-delete-old`, 'POST', { daysToExpire });
      
      if (response && typeof response.count === 'number') {
        console.log(`${response.count} old soft-deleted loans permanently deleted.`);
      } else {
        console.log("Cleanup process ran, but count was not returned as expected.");
      }
      // Re-fetch loans to update the list after permanent deletion
      await get().fetchLoans();

    } catch (err: any) {
      console.error("Error permanently deleting old loans via API:", err);
      set({ error: "Failed to permanently delete old loans. " + (err.message || 'Unknown error')});
    } finally {
      set({ isLoadingLoans: false });
    }
  },
}));

// Subscribe to auth changes to fetch data or clear it
useAuthStore.subscribe(
  (state, prevState) => {
    const currentUser = state.user;
    const prevUser = prevState.user;

    if (currentUser?.uid !== prevUser?.uid) {
      if (currentUser?.uid) {
        console.log(`Auth state changed: User ${currentUser.uid} logged in. Initializing data.`);
        useLoanStore.getState().initializeData();
      } else {
        console.log("Auth state changed: User logged out. Clearing local loan data.");
        useLoanStore.getState().clearLocalData();
      }
    }
  }
);

// Initial data load if a user is already logged in when the app loads.
function initializeLoanStoreForCurrentUser() {
  const authState = useAuthStore.getState();
  const initialUser = authState.user;
  
  if (initialUser?.uid && !authState.isLoading) { 
    console.log(`Initial check: User ${initialUser.uid} already logged in. Initializing data.`);
    useLoanStore.getState().initializeData();
  } else if (!authState.isLoading) { 
    // Only clear if auth is not loading and there's no user.
    // If auth is still loading, wait for the subscription to handle it.
    console.log("Initial check: No user logged in. Clearing local loan data if auth loading complete.");
    useLoanStore.getState().clearLocalData();
  }
  // If authState.isLoading is true, the subscription will handle the first data load.
}

initializeLoanStoreForCurrentUser();
