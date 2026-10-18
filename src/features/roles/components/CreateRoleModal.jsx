"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateRoleMutation } from "@/features/roles/rolesApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore only"),
  description: z.string().max(500).optional().or(z.literal("")),
  level: z.coerce.number().int().min(1).max(99),
  permissionsScope: z.enum([
    "tenant",
    "organization",
    "self",
  ]),
});

export function CreateRoleModal({ open, onClose }) {
  const dispatch = useAppDispatch();
  const [create, { isLoading }] = useCreateRoleMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      level: 10,
      permissionsScope: "self",
    },
  });

  const onNameChange = (e) => {
    const v = e.target.value;
    setValue("name", v, { shouldValidate: true });
    if (!watch("slug")) {
      const slug = v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
      setValue("slug", slug, { shouldValidate: true });
    }
  };

  const onSubmit = async (values) => {
    try {
      await create({ ...values, permissionCodes: [] }).unwrap();
      dispatch(pushToast({ title: "Role created", variant: "success" }));
      reset();
      onClose();
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
    <Modal open={open} onClose={onClose} title="New Role" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Name</label>
          <Input
            {...register("name")}
            onChange={onNameChange}
            invalid={!!errors.name}
            placeholder="Senior Doctor"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Slug</label>
          <Input {...register("slug")} invalid={!!errors.slug} />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Description</label>
          <Textarea {...register("description")} rows={2} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Level (1-99)</label>
            <Input type="number" {...register("level")} invalid={!!errors.level} />
            <p className="text-xs text-muted-foreground">
              Higher = more authority
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Data scope</label>
            <Select {...register("permissionsScope")}>
              <option value="self">Self only</option>
              <option value="organization">Organization</option>
              <option value="tenant">Tenant (all)</option>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating…" : "Create role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}