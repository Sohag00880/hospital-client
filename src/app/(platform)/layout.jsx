import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { PlatformShell } from "@/components/layout/PlatformShell";

export default function PlatformGroupLayout({ children }) {
  return (
    <ProtectedRoute requirePlatformAdmin>
      <PlatformShell>{children}</PlatformShell>
    </ProtectedRoute>
  );
}