"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useChangePasswordMutation } from "../authApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMustChangePassword, clearCredentials } from "../authSlice";
import { pushToast } from "@/features/ui/uiSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

export function ChangePasswordForm({ forced = false }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [changePwd, { isLoading }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    setError(null);
    try {
      await changePwd(values).unwrap();
      dispatch(setMustChangePassword(false));
      setDone(true);

      dispatch(
        pushToast({
          title: "Password updated",
          description: "Please sign in with your new password.",
          variant: "success",
        }),
      );

      // Always sign out and require fresh login
      setTimeout(() => {
        dispatch(clearCredentials());
        router.replace(isPlatformAdmin ? "/platform/login" : "/login");
      }, 1500);
    } catch (err) {
      setError(
        err?.data?.error?.message ?? "Failed to change password. Try again.",
      );
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h2 className="mt-4 text-lg font-semibold">Password updated</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {forced && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          You must change your password before continuing.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Current password</label>
        <Input
          type="password"
          autoComplete="current-password"
          autoFocus
          invalid={!!errors.currentPassword}
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">New password</label>
        <Input
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          invalid={!!errors.newPassword}
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Confirm new password
        </label>
        <Input
          type="password"
          autoComplete="new-password"
          invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}