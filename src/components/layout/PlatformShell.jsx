"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, LogOut, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
import { pushToast } from "@/features/ui/uiSlice";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Audit has been temporarily removed.
// To re-enable in the future, add:
//   { label: "Audit Logs", href: "/platform/audit-logs", icon: FileText }
const navItems = [
  { label: "Tenants", href: "/platform/tenants", icon: Building2 },
  { label: "Settings", href: "/platform/settings", icon: Settings },
  { label: "Branding", href: "/platform/configuration", icon: Settings },
];

export function PlatformShell({ children }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // ignore
    }
    dispatch(clearCredentials());
    dispatch(pushToast({ title: "Signed out", variant: "info" }));
    router.replace("/platform/login");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
            <Shield className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-semibold">Platform Admin</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          {user && (
            <div className="mb-2 px-3 py-2">
              <p className="truncate text-xs font-medium">
                {user.fullName || user.email}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
