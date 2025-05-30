import { saveAs } from "file-saver";
import { utils, write } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { CustomerInfo, Loan, InterestPayment } from "@/types/loan";

type LoanWithCustomer = {
  loan: Loan;
  customer: CustomerInfo;
};

export const exportLoansToExcel = (loans: LoanWithCustomer[]) => {
  const worksheetData = loans.map(({ loan, customer }) => {
    const pendingPayments = loan.interestPayments.filter((p) => p.status === "pending").length;
    const paidPayments = loan.interestPayments.filter((p) => p.status === "paid").length;
    
    return {
      "Customer Name": customer.name,
      "Mobile": customer.mobile,
      "Email": customer.email,
      "Principal (₹)": loan.principal,
      "Interest Rate": `${loan.interestRate}%`,
      "Start Date": format(parseISO(loan.startDate), "dd/MM/yyyy"),
      "End Date": format(parseISO(loan.endDate), "dd/MM/yyyy"),
      "Payment Frequency": loan.interestFrequency,
      "Status": loan.status,
      "Principal Paid": loan.principalPaid ? "Yes" : "No",
      "Pending Payments": pendingPayments,
      "Completed Payments": paidPayments
    };
  });

  // Calculate total interest and paid interest
  let totalInterest = 0;
  let paidInterest = 0;

  loans.forEach(({ loan }) => {
    loan.interestPayments.forEach(payment => {
      totalInterest += payment.amount;
      if (payment.status === "paid") {
        paidInterest += payment.amount;
      }
    });
  });

  const worksheet = utils.json_to_sheet(worksheetData);

  // Add summary rows
  // Adding an empty row for spacing
  utils.sheet_add_aoa(worksheet, [[]], { origin: -1 }); 
  utils.sheet_add_aoa(worksheet, [["Total Interest (₹):", totalInterest]], { origin: -1 });
  utils.sheet_add_aoa(worksheet, [["Paid Interest (₹):", paidInterest]], { origin: -1 });
  utils.sheet_add_aoa(worksheet, [["Pending Interest (₹):", totalInterest - paidInterest]], { origin: -1 });

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
    .reduce((sum, p) => sum + p.amount, 0);
    
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
