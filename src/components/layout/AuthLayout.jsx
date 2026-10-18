import Link from "next/link";
import { Stethoscope } from "lucide-react";

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Hospital SaaS</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Enterprise Hospital Management Platform
        </p>
      </div>
    </div>
  );
}