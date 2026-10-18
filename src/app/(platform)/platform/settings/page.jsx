"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import {
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
} from "@/features/platform/settingsApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";

const schema = z.object({
  platformName: z.string().min(2).max(200),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(30).optional().or(z.literal("")),
  defaultTimezone: z.string().max(50),
  defaultCurrency: z.string().length(3),
  defaultLocale: z.string().max(10),
  maintenanceMode: z.boolean().optional(),
});

export default function PlatformSettingsPage() {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, refetch } = useGetPlatformSettingsQuery();
  const [update, { isLoading: saving }] = useUpdatePlatformSettingsMutation();
  const [serverError, setServerError] = useState(null);

  const settings = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      platformName: "",
      supportEmail: "",
      supportPhone: "",
      defaultTimezone: "Asia/Dhaka",
      defaultCurrency: "BDT",
      defaultLocale: "en",
      maintenanceMode: false,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        platformName: settings.platformName ?? "",
        supportEmail: settings.supportEmail ?? "",
        supportPhone: settings.supportPhone ?? "",
        defaultTimezone: settings.defaultTimezone ?? "Asia/Dhaka",
        defaultCurrency: settings.defaultCurrency ?? "BDT",
        defaultLocale: settings.defaultLocale ?? "en",
        maintenanceMode: settings.maintenanceMode ?? false,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await update(values).unwrap();
      dispatch(
        pushToast({
          title: "Settings saved",
          description: "Platform settings updated successfully.",
          variant: "success",
        }),
      );
    } catch (err) {
      setServerError(
        err?.data?.error?.message ?? "Failed to save settings.",
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
        title="Platform Settings"
        description="Global configuration for the SaaS platform."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-3xl space-y-6"
      >
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Branding</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="settings-platformName" className="block text-sm font-medium">
                Platform Name
              </label>
              <Input id="settings-platformName"
                {...register("platformName")}
                placeholder="Hospital SaaS Platform"
                invalid={!!errors.platformName}
              />
              {errors.platformName && (
                <p className="text-xs text-destructive">
                  {errors.platformName.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Support Contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="settings-supportEmail" className="block text-sm font-medium">
                Support Email
              </label>
              <Input id="settings-supportEmail"
                type="email"
                {...register("supportEmail")}
                placeholder="support@platform.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-supportPhone" className="block text-sm font-medium">
                Support Phone
              </label>
              <Input id="settings-supportPhone"
                {...register("supportPhone")}
                placeholder="+8801712345678"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Defaults</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-defaultTimezone" className="block text-sm font-medium">Timezone</label>
              <Select id="settings-defaultTimezone" {...register("defaultTimezone")}>
                {settings?.defaultTimezone && !["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "UTC"].includes(settings.defaultTimezone) && <option value={settings.defaultTimezone}>{settings.defaultTimezone}</option>}
                <option value="Asia/Dhaka">Asia/Dhaka (BD)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IN)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="UTC">UTC</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-defaultCurrency" className="block text-sm font-medium">Currency</label>
              <Select id="settings-defaultCurrency" {...register("defaultCurrency")}>
                <option value="BDT">BDT (৳)</option>
                {settings?.defaultCurrency && !["BDT", "USD", "INR"].includes(settings.defaultCurrency) && <option value={settings.defaultCurrency}>{settings.defaultCurrency}</option>}
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-defaultLocale" className="block text-sm font-medium">Language</label>
              <Select id="settings-defaultLocale" {...register("defaultLocale")}>
                <option value="en">English</option>
                <option value="bn">বাংলা (Bangla)</option>
              </Select>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || !isDirty}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}