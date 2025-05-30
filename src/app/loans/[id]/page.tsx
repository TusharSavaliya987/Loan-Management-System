import LoanDetailsPageContent from "@/pages/LoanDetails";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

// It's good practice to define the params type
interface LoanDetailsPageProps {
  params: { id: string };
}

export default function LoanDetailsPage({ params }: LoanDetailsPageProps) {
  // The LoanDetailsPageContent component might need to be adapted to get the id from params
  // or use a Next.js hook like useParams if it's a client component.
  // For now, we assume it can be rendered directly or will be refactored later.
  return (
    <RequireAuth>
      <Layout>
        {/* You might need to pass params.id to LoanDetailsPageContent if it expects it as a prop */}
        <LoanDetailsPageContent />
      </Layout>
    </RequireAuth>
  );
} 