import CustomersPageContent from "@/pages/Customers";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function CustomersPage() {
  return (
    <RequireAuth>
      <Layout>
        <CustomersPageContent />
      </Layout>
    </RequireAuth>
  );
} 