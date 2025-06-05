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
  
  // Pagination state
  currentLoanPage: number;
  currentCustomerPage: number;
  currentDeletedLoanPage: number;
  currentReminderPage: number;
  currentUpcomingPaymentPage: number;
  itemsPerPage: number;
  
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
  permanentlyDeleteLoan: (loanId: string) => Promise<void>;
  deleteCustomerPermanently: (customerId: string) => Promise<void>;

  // Pagination actions
  setLoanPage: (page: number) => void;
  setCustomerPage: (page: number) => void;
  setDeletedLoanPage: (page: number) => void;
  setReminderPage: (page: number) => void;
  setUpcomingPaymentPage: (page: number) => void;

  // Pagination selectors (implicitly, will be used in component logic or could be explicit getters)
  // getPaginatedLoans: () => Loan[];
  // getPaginatedCustomers: () => CustomerInfo[];
  // getLoanPageCount: () => number;
  // getCustomerPageCount: () => number;

  clearLocalData: () => void; // To clear data on logout
  initializeData: () => Promise<void>; // To fetch initial data on login
}

export const useLoanStore = create<LoanState>((set, get) => ({
  customers: [],
  loans: [],
  isLoadingCustomers: true,
  isLoadingLoans: true,
  error: null,
  
  // Pagination initial state
  currentLoanPage: 1,
  currentCustomerPage: 1,
  currentDeletedLoanPage: 1,
  currentReminderPage: 1,
  currentUpcomingPaymentPage: 1,
  itemsPerPage: 6,

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
    set({ isLoadingCustomers: true, error: null, currentCustomerPage: 1 }); // Reset page on fetch
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
    set({ 
      isLoadingLoans: true, 
      error: null, 
      currentLoanPage: 1, 
      currentDeletedLoanPage: 1,
      currentReminderPage: 1,
      currentUpcomingPaymentPage: 1
    }); 
    try {
      // Assuming an endpoint '/api/loans' that filters by status != 'permanently_deleted' on backend
      const loansData = await apiClient<Loan[]>('loans', 'GET');
      set({ loans: loansData || [], isLoadingLoans: false });``
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
      
      // API endpoint PUT /api/loans/update/{loanId}
      const updatedLoan = await apiClient<Loan>(`loans/update/${loanId}`, 'PUT', finalLoanData);
      
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

  deleteLoanSoft: async (loanId) => {
    set({ isLoadingLoans: true, error: null });
    try {
      const response = await fetch(`/api/loans/delete/${loanId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error("Failed to delete loan.");
      }
      
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

  restoreLoan: async (loanId) => {
    set({ isLoadingLoans: true, error: null });
    try {
      const response = await fetch(`/api/loans/restore/${loanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to restore loan.");
      }
      
      // Re-fetch loans to update the list after permanent deletion
      await get().fetchLoans();

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

  permanentlyDeleteLoan: async (loanId: string) => {
    set({ isLoadingLoans: true, error: null });
    try {
      await apiClient(`loans/${loanId}/permanently-delete`, 'DELETE');
      // Successfully deleted, now update local state by removing the loan or re-fetching
      // Re-fetching is often simpler and ensures consistency
      await get().fetchLoans(); 
      // Or, to update locally without re-fetching:
      // set(state => ({
      //   loans: state.loans.filter(loan => loan.id !== loanId),
      //   isLoadingLoans: false,
      // }));
    } catch (err: any) {
      console.error("Error permanently deleting loan via API:", err);
      set({ error: "Failed to permanently delete loan. " + (err.message || 'Unknown error'), isLoadingLoans: false });
      throw err; // Re-throw the error so the component can catch it for toast notifications
    }
    // isLoadingLoans will be set to false by fetchLoans if that's called.
    // If updating locally, ensure it's set to false here.
  },

  deleteCustomerPermanently: async (customerId: string) => {
    set({ isLoadingCustomers: true, error: null });
    try {
      await apiClient(`customers/${customerId}`, 'DELETE');
      // Remove the customer from the local state
      set(state => ({
        customers: state.customers.filter(customer => customer.id !== customerId),
        isLoadingCustomers: false,
      }));
      // No need to re-fetch all customers if we update locally correctly.
    } catch (error: any) {
      console.error("Error permanently deleting customer via API:", error);
      set({
        error: "Failed to delete customer. " + (error.message || 'Unknown error'),
        isLoadingCustomers: false,
      });
      throw error; // Re-throw to allow UI to handle it (e.g., show toast)
    }
  },

  // Pagination Actions with defensive set
  setLoanPage: (page) => {
    const currentVal = get().currentLoanPage;
    const activeLoans = get().loans.filter(l => l.status === 'active');
    const totalItems = activeLoans.length;
    const itemsPerPageVal = get().itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageVal));
    let targetPage = page;
    if (!(targetPage >= 1 && targetPage <= totalPages)) {
      if (totalItems === 0) { targetPage = 1; }
      else if (targetPage < 1) { targetPage = 1; }
      else { targetPage = totalPages; }
    }
    if (currentVal !== targetPage) {
      set({ currentLoanPage: targetPage });
    }
  },
  setCustomerPage: (page) => {
    const currentVal = get().currentCustomerPage;
    const totalItems = get().customers.length;
    const itemsPerPageVal = get().itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageVal));
    let targetPage = page;
    if (!(targetPage >= 1 && targetPage <= totalPages)) {
      if (totalItems === 0) { targetPage = 1; }
      else if (targetPage < 1) { targetPage = 1; }
      else { targetPage = totalPages; }
    }
    if (currentVal !== targetPage) {
      set({ currentCustomerPage: targetPage });
    }
  },
  setDeletedLoanPage: (page) => {
    const currentVal = get().currentDeletedLoanPage;
    const deletedLoans = get().loans.filter(l => l.status === 'deleted');
    const totalItems = deletedLoans.length;
    const itemsPerPageVal = get().itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageVal));
    let targetPage = page;
    if (!(targetPage >= 1 && targetPage <= totalPages)) {
      if (totalItems === 0) { targetPage = 1; }
      else if (targetPage < 1) { targetPage = 1; }
      else { targetPage = totalPages; }
    }
    if (currentVal !== targetPage) {
      set({ currentDeletedLoanPage: targetPage });
    }
  },
  setReminderPage: (page) => {
    const currentVal = get().currentReminderPage;
    // The actual filtered list for reminders is in Reminders.tsx (upcomingPayments)
    // For totalPages calculation here, we need to approximate or accept that this might lead to
    // the component's own pagination logic overriding if totalPages differs significantly.
    // Let's use a simplified logic based on active loans with pending payments for store-side check.
    const reminderEligibleLoans = get().loans.filter(loan => 
      loan.status === "active" && loan.interestPayments.some(p => p.status === 'pending')
    );
    const totalItems = reminderEligibleLoans.length; // This is an approximation
    const itemsPerPageVal = get().itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageVal));
    let targetPage = page;
    if (!(targetPage >= 1 && targetPage <= totalPages)) {
      if (totalItems === 0) { targetPage = 1; }
      else if (targetPage < 1) { targetPage = 1; }
      else { targetPage = totalPages; }
    }
    if (currentVal !== targetPage) {
      set({ currentReminderPage: targetPage });
    }
  },
  setUpcomingPaymentPage: (page) => {
    const currentVal = get().currentUpcomingPaymentPage;
    const upcomingForStore = get().getUpcomingPayments(30); // Use existing selector for count
    const totalItems = upcomingForStore.length;
    const itemsPerPageVal = get().itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageVal));
    let targetPage = page;
    if (!(targetPage >= 1 && targetPage <= totalPages)) {
      if (totalItems === 0) { targetPage = 1; }
      else if (targetPage < 1) { targetPage = 1; }
      else { targetPage = totalPages; }
    }
    if (currentVal !== targetPage) {
      set({ currentUpcomingPaymentPage: targetPage });
    }
  },
}));
