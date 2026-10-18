"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useResetPasswordMutation } from "../authApi";
import { useAppDispatch } from "@/store/hooks";
import { pushToast } from "@/features/ui/uiSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z
  .object({
    newPassword: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [reset, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
    setError(null);
    try {
      await reset({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      }).unwrap();
      setDone(true);
      dispatch(
        pushToast({
          title: "Password reset",
          description: "You can now sign in with your new password.",
          variant: "success",
        }),
      );
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err?.data?.error?.message ?? "Reset failed. Please try again.");
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This reset link is invalid or missing. Please request a new one.
          </span>
        </div>
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-primary hover:underline"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h2 className="mt-4 text-lg font-semibold">Password reset</h2>
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

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="block text-sm font-medium">
          New password
        </label>
        <Input
          id="newPassword"
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          autoFocus
          invalid={!!errors.newPassword}
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat password"
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
        {isLoading ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}