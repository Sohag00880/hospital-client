"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useCreateTenantMutation } from "@/features/platform/platformApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  tenant: z.object({
    name: z.string().min(2, "Name is required").max(255),
    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, hyphens"),
    type: z.enum(["hospital", "clinic", "diagnostic", "pharmacy", "group"]),
    plan: z.enum(["trial", "basic", "pro", "enterprise"]),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().max(30).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
  }),
  primaryAdmin: z.object({
    firstName: z.string().min(1, "Required").max(100),
    lastName: z.string().max(100).optional().or(z.literal("")),
    email: z.string().email("Valid email required").toLowerCase(),
    password: z.string().min(6, "Minimum 6 characters").max(200).optional().or(z.literal("")),
  }),
});

export default function NewTenantPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = useState(null);
  const [created, setCreated] = useState(null);
  const [createTenant, { isLoading }] = useCreateTenantMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tenant: {
        name: "",
        slug: "",
        type: "hospital",
        plan: "trial",
        contactEmail: "",
        contactPhone: "",
        city: "",
      },
      primaryAdmin: {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      },
    },
  });

  const tenantName = watch("tenant.name");

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const value = e.target.value;
    setValue("tenant.name", value, { shouldValidate: true });
    if (!watch("tenant.slug")) {
      const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("tenant.slug", slug, { shouldValidate: true });
    }
  };

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const payload = { ...values, primaryAdmin: { ...values.primaryAdmin } };
      if (!payload.primaryAdmin.password) delete payload.primaryAdmin.password;
      const res = await createTenant(payload).unwrap();
      dispatch(
        pushToast({
          title: "Tenant created",
          description: `${values.tenant.name} is ready.`,
          variant: "success",
        }),
      );
      setCreated({ ...res.data, password: values.primaryAdmin.password || res.data.generatedPassword });
    } catch (err) {
      setServerError(err?.data?.error?.message ?? "Failed to create tenant");
    }
  };

  return (
    <>
      <Modal open={!!created} onClose={() => router.push(`/platform/tenants/${created.tenant.id}`)} title="Tenant administrator credentials">
        <div className="space-y-4">
          <p>Save these credentials before continuing.</p>
          <p>Login ID: <span className="select-all break-all font-mono text-sm">{created?.admin.loginId}</span></p>
          <p>Initial password: <span className="select-all font-mono text-sm">{created?.password}</span></p>
          <Button onClick={() => router.push(`/platform/tenants/${created.tenant.id}`)}>Continue</Button>
        </div>
      </Modal>
      <Link
        href="/platform/tenants"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to tenants
      </Link>

      <PageHeader
        title="Create Tenant"
        description="Set up a new hospital on the platform."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Tenant details */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Tenant Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Hospital name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("tenant.name")}
                onChange={handleNameChange}
                placeholder="Square Hospital"
                invalid={!!errors.tenant?.name}
              />
              {errors.tenant?.name && (
                <p className="text-xs text-destructive">
                  {errors.tenant.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Slug <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("tenant.slug")}
                placeholder="square-hospital"
                invalid={!!errors.tenant?.slug}
              />
              {errors.tenant?.slug && (
                <p className="text-xs text-destructive">
                  {errors.tenant.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Type</label>
              <Select {...register("tenant.type")}>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="group">Group</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Plan</label>
              <Select {...register("tenant.plan")}>
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Contact email</label>
              <Input
                type="email"
                {...register("tenant.contactEmail")}
                placeholder="info@square-hospital.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Contact phone</label>
              <Input
                {...register("tenant.contactPhone")}
                placeholder="+8801712345678"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-sm font-medium">City</label>
              <Input {...register("tenant.city")} placeholder="Dhaka" />
            </div>
          </div>
        </Card>

        {/* Primary admin */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Primary Administrator</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            This person will manage {tenantName || "the tenant"} and its users.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                First name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("primaryAdmin.firstName")}
                placeholder="Rahim"
                invalid={!!errors.primaryAdmin?.firstName}
              />
              {errors.primaryAdmin?.firstName && (
                <p className="text-xs text-destructive">
                  {errors.primaryAdmin.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Last name</label>
              <Input
                {...register("primaryAdmin.lastName")}
                placeholder="Ahmed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                {...register("primaryAdmin.email")}
                placeholder="rahim@square-hospital.com"
                invalid={!!errors.primaryAdmin?.email}
              />
              {errors.primaryAdmin?.email && (
                <p className="text-xs text-destructive">
                  {errors.primaryAdmin.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Initial password (optional)
              </label>
              <Input
                type="text"
                {...register("primaryAdmin.password")}
                placeholder="Leave blank to auto-generate"
                invalid={!!errors.primaryAdmin?.password}
              />
              {errors.primaryAdmin?.password && (
                <p className="text-xs text-destructive">
                  {errors.primaryAdmin.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The admin must change this on first login.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/platform/tenants">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating…" : "Create Tenant"}
          </Button>
        </div>
      </form>
    </>
  );
}