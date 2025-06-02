import { saveAs } from "file-saver";
import { utils, write } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInMonths } from "date-fns";
import { CustomerInfo, Loan, InterestPayment } from "@/types/loan";

type LoanWithCustomer = {
  loan: Loan;
  customer: CustomerInfo;
};

export const exportLoansToExcel = (loans: LoanWithCustomer[]) => {
  const worksheetData = loans.map(({ loan, customer }) => {
    const pendingPaymentsCount = loan.interestPayments.filter((p) => p.status === "pending").length;
    const paidPaymentsCount = loan.interestPayments.filter((p) => p.status === "paid").length;

    // Calculate interest amounts for the individual loan
    const loanTotalInterest = loan.interestPayments.reduce((sum, p) => sum + p.amount, 0);
    const loanPaidInterest = loan.interestPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amountPaid ?? p.amount), 0);
    const loanPendingInterest = loanTotalInterest - loanPaidInterest;
    
    const totalAmount = loan.principal + loanTotalInterest;

    const startDate = parseISO(loan.startDate);
    const endDate = parseISO(loan.endDate);
    const loanDurationInMonths = differenceInMonths(endDate, startDate);
    
    return {
      "Customer Name": customer.name,
      "Mobile": customer.mobile,
      "Email": customer.email,
      "Principal (₹)": loan.principal,
      "Interest Rate": `${loan.interestRate}%`,
      "Total Interest (₹)": loanTotalInterest,
      "Total Amount (₹)": totalAmount,
      "Start Date": format(startDate, "dd/MM/yyyy"),
      "End Date": format(endDate, "dd/MM/yyyy"),
      "Payment Frequency": loan.interestFrequency,
      "Status": loan.status,
      "Principal Paid": loan.principalPaid ? "Yes" : "No",
      "Pending Payments": pendingPaymentsCount,
      "Completed Payments": paidPaymentsCount,
      "Paid Interest (₹)": loanPaidInterest,
      "Pending Interest (₹)": loanPendingInterest,
      "Loan Duration (Months)": loanDurationInMonths,
    };
  });

  const worksheet = utils.json_to_sheet(worksheetData);

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Loans");

  const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  
  const fileName = `loans_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  saveAs(data, fileName);
};

export const exportInterestPaymentsToPDF = (
  loan: Loan, 
  customer: CustomerInfo, 
  payments?: InterestPayment[]
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("Interest Payments Report", 14, 22);
  
  // Add loan details
  doc.setFontSize(11);
  doc.text(`Customer: ${customer.name}`, 14, 32);
  doc.text(`Mobile: ${customer.mobile}`, 14, 38);
  doc.text(`Email: ${customer.email}`, 14, 44);
  doc.text(`Principal: ₹${loan.principal.toLocaleString('en-IN')}`, 14, 50);
  doc.text(`Interest Rate: ${loan.interestRate}%`, 14, 56);
  doc.text(`Term: ${format(parseISO(loan.startDate), "dd/MM/yyyy")} to ${format(parseISO(loan.endDate), "dd/MM/yyyy")}`, 14, 62);
  doc.text(`Payment Frequency: ${loan.interestFrequency}`, 14, 68);
  doc.text(`Status: ${loan.status}`, 14, 74);
  
  // Prepare data for payments table
  const paymentsData = (payments || loan.interestPayments).map((payment, index) => [
    (index + 1).toString(),
    format(parseISO(payment.dueDate), "dd/MM/yyyy"),
    `₹${payment.amount.toLocaleString('en-IN')}`,
    payment.status,
    payment.paidOn ? format(parseISO(payment.paidOn), "dd/MM/yyyy") : "-"
  ]);
  
  // Add payments table
  autoTable(doc, {
    startY: 80,
    head: [["#", "Due Date", "Amount", "Status", "Paid On"]],
    body: paymentsData
  });
  
  // Add summary
  const totalInterest = loan.interestPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidInterest = loan.interestPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amountPaid ?? p.amount), 0);
    
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.text(`Total Interest: ₹${totalInterest.toLocaleString('en-IN')}`, 14, finalY);
  doc.text(`Paid Interest: ₹${paidInterest.toLocaleString('en-IN')}`, 14, finalY + 6);
  doc.text(`Pending Interest: ₹${(totalInterest - paidInterest).toLocaleString('en-IN')}`, 14, finalY + 12);
  
  // Add footer with date
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Generated on ${format(new Date(), "dd/MM/yyyy")}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
  
  // Save the PDF
  doc.save(`loan_payments_${customer.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

export const exportCustomersToPDF = (customers: CustomerInfo[]) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("Customers Report", 14, 22);
  
  // Prepare data for customers table
  const customersData = customers.map((customer, index) => [
    (index + 1).toString(),
    customer.name,
    customer.mobile,
    customer.email
  ]);
  
  // Add customers table
  autoTable(doc, {
    startY: 30,
    head: [["#", "Name", "Mobile", "Email"]],
    body: customersData
  });
  
  // Add footer with date
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Generated on ${format(new Date(), "dd/MM/yyyy")}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
  
  // Save the PDF
  doc.save(`customers_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
};
