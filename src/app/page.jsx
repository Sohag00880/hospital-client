"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";

export default function HomePage() {
  const router = useRouter();
  const { status, isPlatformAdmin } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(isPlatformAdmin ? "/platform/tenants" : "/dashboard");
    }
  }, [status, isPlatformAdmin, router]);

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Redirecting…" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Phase 1
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Hospital SaaS — Multi-Tenant Platform
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Secure authentication and tenant-isolated hospital management.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          href="/platform/login"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Platform admin
        </Link>
      </div>
    </main>
  );
}