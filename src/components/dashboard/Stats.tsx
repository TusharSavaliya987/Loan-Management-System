import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoanStore } from "@/store/loanStore";
import { IndianRupee } from "lucide-react";

export function Stats() {
  const loans = useLoanStore((state) => state.loans);
  const customers = useLoanStore((state) => state.customers);

  const stats = useMemo(() => {
    const activeLoans = loans.filter((loan) => loan.status === "active");

    const totalPrincipal = activeLoans.reduce(
      (sum, loan) => sum + loan.principal,
      0
    );

    // Calculate total pending interest
    let totalPendingInterest = 0;
    for (const loan of activeLoans) {
      for (const payment of loan.interestPayments) {
        if (payment.status === "pending") {
          totalPendingInterest += payment.amount;
        }
      }
    }

    return {
      activeLoansCount: activeLoans.length,
      totalCustomers: customers.length,
      totalPrincipal,
      totalPendingInterest,
    };
  }, [loans, customers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Total Active Loans */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Active Loans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
            {stats.activeLoansCount}
          </p>
        </CardContent>
      </Card>

      {/* Total Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
            {stats.totalCustomers}
          </p>
        </CardContent>
      </Card>

      {/* Total Principal Amount */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Principal Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
            <IndianRupee className="h-5 w-5 mr-1" />
            {stats.totalPrincipal.toLocaleString("en-IN")}
          </p>
        </CardContent>
      </Card>

      {/* Pending Interest */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Interest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl sm:text-xl md:text-xl font-bold flex items-center">
            <IndianRupee className="h-5 w-5 mr-1" />
            {stats.totalPendingInterest.toLocaleString("en-IN")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
