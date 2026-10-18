"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useInviteUserMutation } from "@/features/users/usersApi";
import { useListRolesQuery } from "@/features/roles/rolesApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  firstName: z.string().min(1, "Required").max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
  email: z.preprocess((value) => typeof value === "string" ? value.trim() || undefined : value, z.string().email("Enter a valid email").max(255).toLowerCase().optional()),
  phone: z.string().max(30).optional().or(z.literal("")),
  roleSlug: z.string().min(1, "Pick a role"),
  password: z.string().min(6, "Min 6 characters").max(200).optional().or(z.literal("")),
});

export function InviteUserModal({ open, onClose }) {
  const dispatch = useAppDispatch();
  const [credentials, setCredentials] = useState(null);
  const { data: rolesData } = useListRolesQuery({ pageSize: 100 }, { skip: !open });
  const [invite, { isLoading }] = useInviteUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roleSlug: "doctor",
      password: "",
    },
  });

  useEffect(() => {
    if (!open) { reset(); setCredentials(null); }
  }, [open, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values };
      if (!payload.email) delete payload.email;
      if (!payload.password) delete payload.password;
      const res = await invite(payload).unwrap();
      setCredentials({ id: res.data.user.loginId, password: values.password || res.data.generatedPassword });
    } catch (err) {
      dispatch(
        pushToast({
          title: "Invite failed",
          description: err?.data?.error?.message ?? "Unknown error",
          variant: "error",
        }),
      );
    }
  };

  const roles = rolesData?.data?.items ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite User"
      description="Create a new user account for your hospital."
      size="lg"
    >
      {credentials ? <div className="space-y-4">
        <p className="text-sm">User created. Save these credentials before closing.</p>
        <p className="text-sm">Login ID: <span className="select-all break-all font-mono">{credentials.id}</span></p>
        <p className="text-sm">Initial password: <span className="select-all font-mono">{credentials.password}</span></p>
        <Button onClick={onClose}>Done</Button>
      </div> : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              First name <span className="text-destructive">*</span>
            </label>
            <Input {...register("firstName")} invalid={!!errors.firstName} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Last name</label>
            <Input {...register("lastName")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Email (optional)
            </label>
            <Input
              type="email"
              {...register("email")}
              invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Phone</label>
            <Input {...register("phone")} placeholder="+880…" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Role <span className="text-destructive">*</span>
            </label>
            <Select {...register("roleSlug")}>
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </Select>
            {errors.roleSlug && (
              <p className="text-xs text-destructive">
                {errors.roleSlug.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-sm font-medium">
              Initial password (optional)
            </label>
            <Input
              type="text"
              {...register("password")}
              placeholder="Leave blank to auto-generate"
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Inviting…" : "Create user"}
          </Button>
        </div>
      </form>}
    </Modal>
  );
}