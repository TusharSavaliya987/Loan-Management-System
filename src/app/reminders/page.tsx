import RemindersPageContent from "@/pages/Reminders";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function RemindersPage() {
  return (
    <RequireAuth>
      <Layout>
        <RemindersPageContent />
      </Layout>
    </RequireAuth>
  );
} 