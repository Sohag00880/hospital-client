import { Suspense } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { Spinner } from "@/components/ui/Spinner";

export const metadata = { title: "Change Password" };

export default function ChangePasswordPage() {
  return (
    <AuthLayout
      title="Change your password"
      subtitle="You must set a new password before continuing"
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <ChangePasswordForm forced />
      </Suspense>
    </AuthLayout>
  );
}