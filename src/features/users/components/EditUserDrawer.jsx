"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserAssignments } from "./UserAssignments";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  useGetUserQuery,
  useUpdateUserMutation,
  useRevokeRoleMutation,
} from "@/features/users/usersApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export function EditUserDrawer({ userId, open, onClose }) {
  const dispatch = useAppDispatch();
  const { currentData: data, isLoading } = useGetUserQuery(userId, { skip: !userId });
  const [update, { isLoading: saving }] = useUpdateUserMutation();
  const [revokeRole] = useRevokeRoleMutation();

  const user = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (values) => {
    try {
      await update({ userId, ...values }).unwrap();
      dispatch(
        pushToast({
          title: "Saved",
          description: "User updated.",
          variant: "success",
        }),
      );
    } catch (err) {
      dispatch(
        pushToast({
          title: "Save failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  const handleRevokeRole = async (userRoleId) => {
    try {
      await revokeRole({ userId, userRoleId }).unwrap();
      dispatch(pushToast({ title: "Role revoked", variant: "success" }));
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Edit User"
      description={user?.email}
      widthClass="w-[480px]"
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {user && (
        <div className="space-y-6">
          <div><p className="text-sm font-medium">Login ID</p><p className="select-all break-all font-mono text-xs">{user.loginId}</p></div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">First name</label>
              <Input {...register("firstName")} invalid={!!errors.firstName} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Last name</label>
              <Input {...register("lastName")} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Phone</label>
              <Input {...register("phone")} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Roles</h3>
            <div className="space-y-1">
              {(user.roles ?? []).map((r) => (
                <div
                  key={r.userRoleId}
                  className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <Badge variant="primary">{r.roleSlug}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevokeRole(r.userRoleId)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
              {(user.roles ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No roles assigned.</p>
              )}
            </div>
          </div>

          <UserAssignments key={user.id} user={user} />
        </div>
      )}
    </Drawer>
  );
}