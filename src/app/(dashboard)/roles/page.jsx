"use client";

import { useState } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useListRolesQuery,
  useDeleteRoleMutation,
  useToggleRoleMutation,
} from "@/features/roles/rolesApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";
import { CreateRoleModal } from "@/features/roles/components/CreateRoleModal";
import { EditRoleModal } from "@/features/roles/components/EditRoleModal";
import { RolePermissionEditor } from "@/features/roles/components/RolePermissionEditor";

export default function RolesPage() {
  const dispatch = useAppDispatch();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canCreate = permissions.includes("role.create");
  const canDelete = permissions.includes("role.delete");
  const canEditPerms = permissions.includes("role.assign_permissions");

  const { data, isLoading } = useListRolesQuery({ pageSize: 100, includeDisabled: true });
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [permRole, setPermRole] = useState(null);
  const [editor, setEditor] = useState(null);
  const [toggle, toggleState] = useToggleRoleMutation();
  const handleToggle = async (role) => {
    try { await toggle({ roleId: role.id, disabled: !role.isDisabled }).unwrap(); }
    catch (err) { dispatch(pushToast({ title: "Update failed", description: err?.data?.error?.message || "Unable to update role", variant: "error" })); }
  };
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id).unwrap();
      dispatch(
        pushToast({
          title: "Role deleted",
          description: `"${deleteTarget.name}" removed.`,
          variant: "success",
        }),
      );
      setDeleteTarget(null);
    } catch (err) {
      dispatch(
        pushToast({
          title: "Delete failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  const columns = [
    {
      key: "name",
      header: "Role",
      accessor: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.slug}{r.isDisabled ? " (disabled)" : ""}</p>
        </div>
      ),
    },
    {
      key: "level",
      header: "Level",
      accessor: (r) => <Badge variant="primary">L{r.level}</Badge>,
    },
    {
      key: "scope",
      header: "Scope",
      accessor: (r) => <span className="capitalize">{r.permissionsScope}</span>,
    },
    {
      key: "permissions",
      header: "Permissions",
      accessor: (r) => (
        <span className="text-sm">{r.permissionCount}</span>
      ),
    },
    {
      key: "system",
      header: "Type",
      accessor: (r) => (
        <Badge variant={r.isSystem ? "default" : "outline"}>
          {r.isSystem ? "System" : "Custom"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      accessor: (r) => (
        <div className="flex justify-end gap-1">
          {canCreate && <Button size="sm" variant="ghost" onClick={() => setEditor({ role: r, clone: true })}>Clone</Button>}
          {permissions.includes("role.update") && (!r.isSystem || r.isEditable) && <>
            <Button size="sm" variant="ghost" onClick={() => setEditor({ role: r, clone: false })}>Edit</Button>
            <Button size="sm" variant="ghost" disabled={toggleState.isLoading} onClick={() => handleToggle(r)}>{r.isDisabled ? "Enable" : "Disable"}</Button>
          </>}
          {canEditPerms && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPermRole(r)}
              title="Edit permissions"
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}
          {canDelete && !r.isSystem && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(r)}
              title="Delete role"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const items = data?.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Roles"
        description="Define role-based access for your hospital."
        breadcrumbs={[{ label: "Roles" }]}
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Role
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyTitle="No roles"
        emptyDescription="Create a custom role to get started."
      />

      {editor && <EditRoleModal key={`${editor.role.id}-${editor.clone}`} {...editor} onClose={() => setEditor(null)} />}
      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <RolePermissionEditor
        role={permRole}
        open={!!permRole}
        onClose={() => setPermRole(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete role "${deleteTarget?.name}"?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}