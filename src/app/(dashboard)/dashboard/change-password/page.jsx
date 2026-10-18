"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export default function DashboardChangePasswordPage() {
  return (
    <>
      <PageHeader
        title="Change Password"
        description="Update the password for your account."
        breadcrumbs={[{ label: "Change Password" }]}
      />
      <Card className="max-w-lg">
        <ChangePasswordForm />
      </Card>
    </>
  );
}