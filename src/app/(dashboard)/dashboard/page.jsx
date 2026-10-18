"use client";

import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);
  const permissions = useAppSelector((s) => s.auth.permissions);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "there"}`}
        description="Overview of your tenant workspace."
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Your Account
          </p>
          <p className="mt-1 text-sm font-medium">{user?.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {user?.fullName}
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Roles
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {roles.map((r) => (
              <Badge key={r} variant="primary">
                {r}
              </Badge>
            ))}
            {roles.length === 0 && (
              <span className="text-xs text-muted-foreground">No roles</span>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Permissions
          </p>
          <p className="mt-1 text-2xl font-semibold">{permissions.length}</p>
          <p className="text-xs text-muted-foreground">Granted to your roles</p>
        </Card>
      </div>
    </>
  );
}