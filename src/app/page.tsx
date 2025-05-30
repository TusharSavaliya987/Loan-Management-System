import IndexPageContent from "@/pages/Index"; // Assuming this is the content for the home page
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function HomePage() {
  return (
    <RequireAuth>
      <Layout>
        <IndexPageContent />
      </Layout>
    </RequireAuth>
  );
} 