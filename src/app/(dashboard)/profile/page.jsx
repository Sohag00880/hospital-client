"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/features/auth/authApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetProfileQuery();
  const [update, { isLoading: saving }] = useUpdateProfileMutation();

  const profile = data?.data;

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
    if (profile) {
      reset({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values) => {
    try {
      await update(values).unwrap();
      dispatch(pushToast({ title: "Profile updated", variant: "success" }));
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm">Login ID: <span className="select-all break-all font-mono text-xs">{profile?.loginId}</span></p>
      <PageHeader
        title="Profile"
        description="Manage your personal information."
        breadcrumbs={[{ label: "Profile" }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Personal information</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">First name</label>
                <Input {...register("firstName")} invalid={!!errors.firstName} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Last name</label>
                <Input {...register("lastName")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Email</label>
              <Input value={profile?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed from here.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Phone</label>
              <Input {...register("phone")} />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Roles</h3>
          <div className="flex flex-wrap gap-1">
            {(profile?.roles ?? []).map((r, i) => (
              <Badge key={i} variant="primary">
                {r.roleSlug}
              </Badge>
            ))}
          </div>

        </Card>
      </div>
    </>
  );
}