"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Spinner } from "@/components/ui/Spinner";

export function ProtectedRoute({
  children,
  requirePlatformAdmin = false,
  forbidPlatformAdmin = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, mustChangePassword, isPlatformAdmin } = useAppSelector(
    (s) => s.auth,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (status !== "authenticated") return;

    // Force password change if flagged
    if (mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }

    if (requirePlatformAdmin && !isPlatformAdmin) {
      router.replace("/dashboard");
      return;
    }
    if (forbidPlatformAdmin && isPlatformAdmin) {
      router.replace("/platform/tenants");
    }
  }, [
    status,
    mustChangePassword,
    isPlatformAdmin,
    requirePlatformAdmin,
    forbidPlatformAdmin,
    pathname,
    router,
  ]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    );
  }

  return <>{children}</>;
}