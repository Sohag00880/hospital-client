"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "../authSlice";
import { useLoginMutation } from "../authApi";
import { pushToast } from "@/features/ui/uiSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your user ID or email").max(255),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm({ platform = false }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [error, setError] = useState(null);
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values) => {
    setError(null);
    try {
      const res = await login(values).unwrap();
      const data = res.data;

      // Platform login vs tenant login validation
      if (platform && !data.isPlatformAdmin) {
        setError("This account is not a platform administrator.");
        return;
      }
      if (!platform && data.isPlatformAdmin) {
        setError("Platform admins must use the platform sign-in.");
        return;
      }

      dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          roles: data.roles,
          permissions: data.permissions,
          isPlatformAdmin: data.isPlatformAdmin,
          mustChangePassword: data.mustChangePassword,
        }),
      );

      dispatch(
        pushToast({
          title: "Welcome back",
          description: `Signed in as ${data.user.fullName || data.user.email}`,
          variant: "success",
        }),
      );

      // Redirect based on user state
      if (data.mustChangePassword) {
        router.replace("/change-password");
      } else if (data.isPlatformAdmin) {
        router.replace("/platform/tenants");
      } else {
        router.replace(redirectTo);
      }
    } catch (err) {
      const message =
        err?.data?.error?.message ?? "Login failed. Please try again.";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="identifier" className="block text-sm font-medium">
          User ID or email
        </label>
        <Input
          id="identifier"
          type="text"
          placeholder="User ID or you@hospital.com"
          autoComplete="username"
          autoFocus
          invalid={!!errors.identifier}
          {...register("identifier")}
        />
        {errors.identifier && (
          <p className="text-xs text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>

      {!platform && (
        <p className="text-center text-xs text-muted-foreground">
          Accounts are created by your hospital administrator.
        </p>
      )}
    </form>
  );
}