export type CustomerInfo = {
  id: string;
  name: string;
  mobile: string;
  email: string;
};

export type InterestFrequency = "monthly" | "quarterly" | "half-yearly" | "yearly";

export type PaymentStatus = "pending" | "paid" | "overdue";

export type InterestPayment = {
  id: string;
  dueDate: string; // ISO string
  amount: number;
  status: PaymentStatus;
  paidOn?: string; // ISO string, optional
  periodStart?: string; // ISO string, start date of the interest period
  periodEnd?: string; // ISO string, end date of the interest period
  remarks?: string; // Optional remarks for the payment
  isManualAmount?: boolean; // Flag to indicate if amount was manually entered
};

export type Loan = {
  id: string;
  customerId: string;
  principal: number;
  interestRate: number; // Annual interest rate in percentage
  startDate: string; // ISO string
  endDate: string; // ISO string
  interestFrequency: InterestFrequency;
  interestPayments: InterestPayment[];
  status: "active" | "closed" | "deleted";
  principalPaid: boolean;
  contractNote?: string; // Optional contract note image (Base64 string)
  deletedAt?: string; // Added optional deletedAt timestamp
  createdAt?: string; // Added optional createdAt timestamp
  updatedAt?: string; // Added optional updatedAt timestamp
  userId?: string; // Added optional userId
};
