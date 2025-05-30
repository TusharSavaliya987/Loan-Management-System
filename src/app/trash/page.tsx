import DeletedLoansPageContent from "@/pages/DeletedLoans";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function TrashPage() {
  return (
    <RequireAuth>
      <Layout>
        <DeletedLoansPageContent />
      </Layout>
    </RequireAuth>
  );
} 


