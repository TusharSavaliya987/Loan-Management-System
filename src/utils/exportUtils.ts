import { saveAs } from "file-saver";
import { utils, write, WorkBook, CellObject } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInMonths } from "date-fns";
import { CustomerInfo, Loan, InterestPayment } from "@/types/loan";

type LoanWithCustomer = {
  loan: Loan;
  customer: CustomerInfo;
};

export const exportLoansToExcel = (loans: LoanWithCustomer[], loanStatus: string = "all") => {
  const headers = [
    "Customer Name", "Mobile", "Email", "Principal (Rs.)", "Interest Rate", 
    "Total Interest (Rs.)", "Total Amount (Rs.)", "Start Date", "End Date", 
    "Payment Frequency", "Status", "Principal Paid", "Pending Payments", 
    "Completed Payments", "Paid Interest (Rs.)", "Pending Interest (Rs.)", 
    "Loan Duration (Months)"
  ];
  
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
      "Principal (Rs.)": loan.principal,
      "Interest Rate": loan.interestRate / 100, // Store as a number for formatting
      "Total Interest (Rs.)": loanTotalInterest,
      "Total Amount (Rs.)": totalAmount,
      "Start Date": format(startDate, "dd/MM/yyyy"),
      "End Date": format(endDate, "dd/MM/yyyy"),
      "Payment Frequency": loan.interestFrequency,
      "Status": loan.status,
      "Principal Paid": loan.principalPaid ? "Yes" : "No",
      "Pending Payments": pendingPaymentsCount,
      "Completed Payments": paidPaymentsCount,
      "Paid Interest (Rs.)": loanPaidInterest,
      "Pending Interest (Rs.)": loanPendingInterest,
      "Loan Duration (Months)": loanDurationInMonths,
    };
  });

  const worksheet = utils.json_to_sheet(worksheetData, { header: headers });

  // --- Styling ---
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "4A90E2" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const currencyFormat = `_("Rs."* #,##0.00_);_("Rs."* (#,##0.00);_("Rs."* "-"??_);_(@_)`;
  const percentageFormat = "0.00%";

  // Apply styles to headers
  const range = utils.decode_range(worksheet['!ref']!);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = utils.encode_cell({ r: 0, c: C });
    if (worksheet[address]) {
      worksheet[address].s = headerStyle;
    }
  }

  // Apply styles and formats to data rows
  worksheetData.forEach((row, rowIndex) => {
    headers.forEach((header, colIndex) => {
      const cellAddress = utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      if (!worksheet[cellAddress]) return;
      
      if (header.includes("(Rs.)")) {
        worksheet[cellAddress].z = currencyFormat;
      } else if (header === "Interest Rate") {
        worksheet[cellAddress].z = percentageFormat;
      }
    });
  });

  // --- Auto-fit columns ---
  const colWidths = headers.map(header => ({
    wch: Math.max(
      header.length,
      ...worksheetData.map(row => {
        const value = row[header as keyof typeof row];
        return value ? String(value).length : 0;
      })
    ) + 2 // Add a little extra padding
  }));
  worksheet['!cols'] = colWidths;
  
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Loans");

  const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  
  const fileName = `loans_report_${loanStatus}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  saveAs(data, fileName);
};
export const exportInterestPaymentsToPDF = (
  loan: Loan, 
  customer: CustomerInfo, 
  payments?: InterestPayment[]
) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

  // Theme Colors
  const primaryColor = "#4A90E2"; // A professional blue
  const secondaryColor = "#F5F5F5"; // A light gray for alternate rows

  // -- Header --
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setFontSize(20);
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.text("Interest Payments Report", pageWidth / 2, 15, { align: "center" });

  // -- Loan & Customer Details --
  doc.setFontSize(12);
  doc.setTextColor("#000000");
  doc.setFont("helvetica", "bold");
  doc.text("Loan Details", 14, 35);
  doc.text("Customer Details", pageWidth / 2 + 10, 35);
  
  const detailsTableWidth = pageWidth / 2 - 24; // Calculate width for each details table

  autoTable(doc, {
    startY: 40,
    body: [
      [`Principal:`, `Rs. ${loan.principal.toLocaleString('en-IN')}`],
      [`Interest Rate:`, `${loan.interestRate}%`],
      [`Term:`, `${format(parseISO(loan.startDate), "dd/MM/yy")} to ${format(parseISO(loan.endDate), "dd/MM/yy")}`],
      [`Frequency:`, loan.interestFrequency],
      [`Status:`, loan.status],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: 14 },
    tableWidth: detailsTableWidth
  });
  
  autoTable(doc, {
    startY: 40,
    body: [
      [`Name:`, customer.name],
      [`Mobile:`, customer.mobile],
      [`Email:`, customer.email],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: pageWidth / 2 + 10 },
    tableWidth: detailsTableWidth
  });

  const lastDetailsTableY = (doc as any).lastAutoTable.finalY;

  // -- Payments Table --
  const paymentsData = (payments || loan.interestPayments).map((payment, index) => [
    (index + 1).toString(),
    format(parseISO(payment.dueDate), "dd/MM/yyyy"),
    `Rs. ${payment.amount.toLocaleString('en-IN')}`,
    payment.status,
    payment.paidOn ? format(parseISO(payment.paidOn), "dd/MM/yyyy") : "-",
    payment.remarks || "-"
  ]);
  
  autoTable(doc, {
    startY: lastDetailsTableY + 15,
    head: [["#", "Due Date", "Amount", "Status", "Paid On", "Remarks"]],
    body: paymentsData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: "#FFFFFF",
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: secondaryColor,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { halign: 'right' },
      5: { cellWidth: 40 }, 
    }
  });
  
  // -- Summary --
  const totalInterest = loan.interestPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidInterest = loan.interestPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amountPaid ?? p.amount), 0);
  const pendingInterest = totalInterest - paidInterest;
    
  const finalY = (doc as any).lastAutoTable.finalY;
  
  autoTable(doc, {
    startY: finalY + 10,
    body: [
        ['Total Interest:', `Rs. ${totalInterest.toLocaleString('en-IN')}`],
        ['Paid Interest:', `Rs. ${paidInterest.toLocaleString('en-IN')}`],
        ['Pending Interest:', `Rs. ${pendingInterest.toLocaleString('en-IN')}`],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'left' }
    },
    margin: { left: 14 },
    tableWidth: 'wrap'
  });
  
  // -- Footer --
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor("#808080");
    doc.text(
      `Generated on: ${format(new Date(), "dd/MM/yyyy")}`,
      14,
      pageHeight - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: "right" }
    );
  }
  
  // -- Save the PDF --
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

