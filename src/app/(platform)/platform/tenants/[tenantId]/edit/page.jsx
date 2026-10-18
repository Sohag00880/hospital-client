"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import {
  useGetTenantQuery,
  useUpdateTenantMutation,
} from "@/features/platform/platformApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  name: z.string().min(2).max(255),
  type: z.enum(["hospital", "clinic", "diagnostic", "pharmacy", "group"]),
  plan: z.enum(["trial", "basic", "pro", "enterprise"]),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  timezone: z.string().max(50),
  currency: z.string().length(3),
  locale: z.string().max(10),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId;
  const dispatch = useAppDispatch();

  const { data, isLoading } = useGetTenantQuery(tenantId);
  const [update, { isLoading: saving }] = useUpdateTenantMutation();
  const [serverError, setServerError] = useState(null);

  const tenant = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "hospital",
      plan: "trial",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      locale: "en",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? "",
        type: tenant.type ?? "hospital",
        plan: tenant.plan ?? "trial",
        contactEmail: tenant.contactEmail ?? "",
        contactPhone: tenant.contactPhone ?? "",
        address: tenant.address ?? "",
        city: tenant.city ?? "",
        country: tenant.country ?? "Bangladesh",
        timezone: tenant.timezone ?? "Asia/Dhaka",
        currency: tenant.currency ?? "BDT",
        locale: tenant.locale ?? "en",
        logoUrl: tenant.logoUrl ?? "",
      });
    }
  }, [tenant, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await update({ tenantId, ...values }).unwrap();
      dispatch(
        pushToast({
          title: "Tenant updated",
          description: "Changes saved successfully.",
          variant: "success",
        }),
      );
      router.push(`/platform/tenants/${tenantId}`);
    } catch (err) {
      setServerError(
        err?.data?.error?.message ?? "Failed to update tenant. Please try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading tenant…" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-sm text-destructive">Tenant not found.</div>
    );
  }

  return (
    <>
      <Link
        href={`/platform/tenants/${tenantId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to tenant
      </Link>

      <PageHeader
        title={`Edit ${tenant.name}`}
        description={`Slug: ${tenant.slug}`}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Basic info */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Basic Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Hospital name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name")}
                invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Slug</label>
              <Input value={tenant.slug} disabled />
              <p className="text-xs text-muted-foreground">
                Slug cannot be changed after creation
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Type</label>
              <Select {...register("type")}>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="group">Group</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Plan</label>
              <Select {...register("plan")}>
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Contact Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Contact email</label>
              <Input
                type="email"
                {...register("contactEmail")}
                placeholder="info@hospital.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Contact phone</label>
              <Input
                {...register("contactPhone")}
                placeholder="+8801712345678"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-sm font-medium">Address</label>
              <Input {...register("address")} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">City</label>
              <Input {...register("city")} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Country</label>
              <Input {...register("country")} />
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Preferences</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Timezone</label>
              <Select {...register("timezone")}>
                <option value="Asia/Dhaka">Asia/Dhaka (BD)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IN)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="UTC">UTC</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Currency</label>
              <Select {...register("currency")}>
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Language</label>
              <Select {...register("locale")}>
                <option value="en">English</option>
                <option value="bn">বাংলা (Bangla)</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Branding */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Branding</h3>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Logo URL</label>
            <Input
              {...register("logoUrl")}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Full URL to the tenant logo. File upload will be added in a future phase.
            </p>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href={`/platform/tenants/${tenantId}`}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !isDirty}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}