"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useListRolesQuery } from "@/features/roles/rolesApi";
import { useAssignRoleMutation } from "@/features/users/usersApi";

export function UserAssignments({ user }) {
  const permissions = useAppSelector((s) => s.auth.permissions);
  const dispatch = useAppDispatch();
  const [roleSlug, setRoleSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: roles } = useListRolesQuery({ pageSize: 100 }, { skip: !permissions.includes("role.view") });
  const [assignRole] = useAssignRoleMutation();
  const run = async (operation) => {
    setBusy(true);
    try { await operation().unwrap(); dispatch(pushToast({ title: "Assignment updated", variant: "success" })); }
    catch (err) { dispatch(pushToast({ title: "Update failed", description: err?.data?.error?.message || "Unable to update assignment", variant: "error" })); }
    finally { setBusy(false); }
  };
  if (!permissions.includes("user.update")) return null;
  return <div className="space-y-5">
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => assignRole({ userId: user.id, roleSlug })); }}>
      <h3 className="text-sm font-semibold">Assign role</h3>
      <Select required aria-label="Role" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}><option value="">Select role</option>{(roles?.data?.items || []).filter((r) => !r.isDisabled).map((r) => <option key={r.id} value={r.slug}>{r.name}</option>)}</Select>
      <Button size="sm" disabled={busy || !roleSlug}>Assign role</Button>
    </form>
  </div>;
}
