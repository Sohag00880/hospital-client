import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute forbidPlatformAdmin>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}