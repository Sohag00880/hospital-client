"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useForgotPasswordMutation } from "../authApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Enter a valid email").toLowerCase().trim(),
});

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [forgot, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values) => {
    setError(null);
    try {
      await forgot(values).unwrap();
      setSent(true);
    } catch (err) {
      setError(
        err?.data?.error?.message ?? "Something went wrong. Please try again.",
      );
    }
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <h2 className="mt-4 text-lg font-semibold">Check your email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists with that email, we&apos;ve sent a password reset
            link. The link expires in 15 minutes.
          </p>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
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

      <p className="text-sm text-muted-foreground">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@hospital.com"
          autoComplete="email"
          autoFocus
          invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </form>
  );
}