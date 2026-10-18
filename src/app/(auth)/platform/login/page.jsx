import { Suspense } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Spinner } from "@/components/ui/Spinner";

export const metadata = { title: "Platform sign in" };

export default function PlatformLoginPage() {
  return (
    <AuthLayout
      title="Platform sign in"
      subtitle="Super admin access only"
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <LoginForm platform />
      </Suspense>
    </AuthLayout>
  );
}