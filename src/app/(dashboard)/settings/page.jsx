"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import {
  useGetCurrentTenantQuery,
  useUpdateCurrentTenantMutation,
} from "@/features/tenant/tenantApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  name: z.string().min(2).max(255),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  timezone: z.string().max(50).optional().or(z.literal("")),
  currency: z.string().length(3).optional().or(z.literal("")),
  locale: z.string().max(10).optional().or(z.literal("")),
});

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const permissions = useAppSelector((s) => s.auth.permissions);
  const canUpdate = permissions.includes("tenant.update");

  const { data, isLoading, isError, refetch } = useGetCurrentTenantQuery();
  const [update, { isLoading: saving }] = useUpdateCurrentTenantMutation();
  const [serverError, setServerError] = useState(null);

  const tenant = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      country: "",
      timezone: "",
      currency: "",
      locale: "",
    },
  });

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? "",
        contactEmail: tenant.contactEmail ?? "",
        contactPhone: tenant.contactPhone ?? "",
        address: tenant.address ?? "",
        city: tenant.city ?? "",
        country: tenant.country ?? "",
        timezone: tenant.timezone ?? "",
        currency: tenant.currency ?? "",
        locale: tenant.locale ?? "",
      });
    }
  }, [tenant, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await update(values).unwrap();
      dispatch(
        pushToast({
          title: "Settings saved",
          variant: "success",
        }),
      );
    } catch (err) {
      setServerError(
        err?.data?.error?.message ?? "Failed to save. Please try again.",
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

  if (isError) return <Card><p role="alert">Settings could not be loaded.</p><Button onClick={refetch}>Retry settings</Button></Card>;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your hospital's workspace."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="settings-name" className="block text-sm font-medium">
                Hospital name
              </label>
              <Input id="settings-name"
                {...register("name")}
                invalid={!!errors.name}
                disabled={!canUpdate}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-contactEmail" className="block text-sm font-medium">Contact email</label>
              <Input id="settings-contactEmail"
                type="email"
                {...register("contactEmail")}
                disabled={!canUpdate}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-contactPhone" className="block text-sm font-medium">Contact phone</label>
              <Input id="settings-contactPhone" {...register("contactPhone")} disabled={!canUpdate} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Location</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="settings-address" className="block text-sm font-medium">Address</label>
              <Input id="settings-address" {...register("address")} disabled={!canUpdate} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-city" className="block text-sm font-medium">City</label>
              <Input id="settings-city" {...register("city")} disabled={!canUpdate} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-country" className="block text-sm font-medium">Country</label>
              <Input id="settings-country" {...register("country")} disabled={!canUpdate} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Preferences</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-timezone" className="block text-sm font-medium">Timezone</label>
              <Select id="settings-timezone" {...register("timezone")} disabled={!canUpdate}>
                {tenant?.timezone && !["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "UTC"].includes(tenant.timezone) && <option value={tenant.timezone}>{tenant.timezone}</option>}
                <option value="Asia/Dhaka">Asia/Dhaka (BD)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IN)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="UTC">UTC</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-currency" className="block text-sm font-medium">Currency</label>
              <Select id="settings-currency" {...register("currency")} disabled={!canUpdate}>
                <option value="BDT">BDT (৳)</option>
                {tenant?.currency && !["BDT", "USD", "INR"].includes(tenant.currency) && <option value={tenant.currency}>{tenant.currency}</option>}
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-locale" className="block text-sm font-medium">Language</label>
              <Select id="settings-locale" {...register("locale")} disabled={!canUpdate}>
                <option value="en">English</option>
                <option value="bn">বাংলা (Bangla)</option>
              </Select>
            </div>
          </div>
        </Card>

        {canUpdate && (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}

        {!canUpdate && (
          <p className="text-xs text-muted-foreground">
            You don&apos;t have permission to edit tenant settings.
          </p>
        )}
      </form>
    </>
  );
}