import { Suspense } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Spinner } from "@/components/ui/Spinner";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to your hospital workspace"
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}