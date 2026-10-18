"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useListUsersQuery,
  useDeactivateUserMutation,
  useActivateUserMutation,
} from "@/features/users/usersApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";
import { InviteUserModal } from "@/features/users/components/InviteUserModal";
import { EditUserDrawer } from "@/features/users/components/EditUserDrawer";

function statusVariant(status) {
  return {
    active: "success",
    invited: "warning",
    inactive: "default",
    suspended: "destructive",
    locked: "destructive",
  }[status] ?? "default";
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canCreate = permissions.includes("user.create");
  const canUpdate = permissions.includes("user.update");
  const canDeactivate = permissions.includes("user.update");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const { data, isLoading, isFetching } = useListUsersQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const [deactivateUser, { isLoading: deactivating }] = useDeactivateUserMutation();
  const [activateUser] = useActivateUserMutation();

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateUser(deactivateTarget.id).unwrap();
      dispatch(
        pushToast({
          title: "User deactivated",
          description: `${deactivateTarget.email} can no longer sign in.`,
          variant: "warning",
        }),
      );
      setDeactivateTarget(null);
    } catch (err) {
      dispatch(
        pushToast({
          title: "Failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  const handleActivate = async (user) => {
    try {
      await activateUser(user.id).unwrap();
      dispatch(
        pushToast({
          title: "User activated",
          description: `${user.email} can now sign in.`,
          variant: "success",
        }),
      );
    } catch (err) {
      dispatch(
        pushToast({
          title: "Failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  const columns = [
    { key: "id", header: "Login ID", accessor: (u) => <span className="select-all font-mono text-xs">{u.loginId}</span> },
    {
      key: "name",
      header: "Name",
      accessor: (u) => (
        <div>
          <p className="font-medium">{u.fullName || `${u.firstName} ${u.lastName ?? ""}`}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      accessor: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? []).map((r) => (
            <Badge key={r.userRoleId} variant="primary">
              {r.roleSlug}
            </Badge>
          ))}
          {(u.roles ?? []).length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (u) => <Badge variant={statusVariant(u.status)}>{u.status}</Badge>,
    },
    {
      key: "phone",
      header: "Phone",
      accessor: (u) => (
        <span className="text-xs text-muted-foreground">{u.phone || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      accessor: (u) => (
        <div className="flex justify-end gap-1">
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={() => setEditUserId(u.id)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
          {canDeactivate && u.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              title="Deactivate"
              onClick={() => setDeactivateTarget(u)}
            >
              <UserX className="h-4 w-4 text-destructive" />
            </Button>
          )}
          {canUpdate && u.status !== "active" && (
            <Button
              variant="ghost"
              size="icon"
              title="Activate"
              onClick={() => handleActivate(u)}
            >
              <UserCheck className="h-4 w-4 text-success" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Users"
        description={`${total} user${total === 1 ? "" : "s"} in your hospital`}
        breadcrumbs={[{ label: "Users" }]}
        actions={
          canCreate ? (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" />
              Invite User
            </Button>
          ) : null
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(u) => u.id}
        loading={isLoading || isFetching}
        emptyTitle="No users yet"
        emptyDescription="Invite team members to get started."
      />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <EditUserDrawer
        userId={editUserId}
        open={!!editUserId}
        onClose={() => setEditUserId(null)}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title={`Deactivate "${deactivateTarget?.fullName || deactivateTarget?.email}"?`}
        description="This user will no longer be able to sign in."
        confirmLabel="Deactivate"
        loading={deactivating}
      />
    </>
  );
}