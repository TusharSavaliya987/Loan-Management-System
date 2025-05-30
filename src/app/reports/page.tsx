import ReportsPageContent from "@/pages/Reports";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <Layout>
        <ReportsPageContent />
      </Layout>
    </RequireAuth>
  );
} 