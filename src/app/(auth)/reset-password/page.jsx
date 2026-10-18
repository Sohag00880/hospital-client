import { Suspense } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Spinner } from "@/components/ui/Spinner";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account"
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}