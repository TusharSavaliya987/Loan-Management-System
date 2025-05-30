import LoansPageContent from "@/pages/Loans";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function LoansPage() {
  return (
    <RequireAuth>
      <Layout>
        <LoansPageContent />
      </Layout>
    </RequireAuth>
  );
} 