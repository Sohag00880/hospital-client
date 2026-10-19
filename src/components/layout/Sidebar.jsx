"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  BedDouble,
  Wallet,
  TrendingUp,
  FlaskConical,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
import { pushToast } from "@/features/ui/uiSlice";
import { useGetAppearanceQuery } from "@/features/branding/brandingApi";

const tenantNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, permission:"doctor.view" },
  { label: "Patients", href: "/patients", icon: Users, permission: "patient.view" },
  { label: "Appointments", href: "/appointments", icon: CalendarDays, permission: "appointment.view", children: [{label:"All",href:"/appointments"},{label:"By Users",href:"/appointments/by-users"},{label:"By Reference",href:"/appointments/by-reference"}] },
  { label:"Laboratory",href:"/laboratory",icon:FlaskConical,permission:"lab.view",children:[{label:"Lab Orders",href:"/laboratory"},{label:"Lab Workflow",href:"/laboratory/workflow"},{label:"Test Catalog",href:"/laboratory/tests"}] },
  { label: "OPD", href: "/opd", icon: Stethoscope, permission: "appointment.view" },
  {label:"IPD",href:"/inpatient",icon:BedDouble,permission:"inpatient.view",children:[{label:"Admissions",href:"/inpatient"},{label:"Bed board",href:"/inpatient/beds"},{label:"Wards & rooms",href:"/inpatient/setup"},{label:"Charge catalog",href:"/inpatient/charges",permission:"billing.view"}]},
  {label:"Collection & Income",href:"/collection-income",icon:TrendingUp,permission:"billing.view",children:[{label:"Doctor Collection",href:"/collection-income/doctor-collection"},{label:"Laboratory",href:"/collection-income/laboratory"}]},
  {label:"Billing",href:"/billing",icon:Wallet,permission:"billing.view",children:[{label:"PC",href:"/billing/pc"},{label:"Doctors",href:"/billing/doctors"}]},
  {label:"Dues",href:"/dues",icon:Wallet,permission:"billing.view",children:[{label:"OPD",href:"/dues/opd"},{label:"IPD",href:"/dues/ipd",permission:"inpatient.view"}]},
  { label: "Users", href: "/users", icon: Users, permission: "user.view", children: [{label:"Employee",href:"/users"},{label:"Reference",href:"/users/references"}] },
  { label: "Roles", href: "/roles", icon: Shield, permission: "role.view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "tenant.view", children:[{label:"General",href:"/settings"},{label:"Configure",href:"/settings/configure",children:[{label:"PC Bill",href:"/settings/configure/pc-bill"}]}] },
  { label: "Branding", href: "/configuration", icon: Settings, permission: "branding.manage" },
  { label: "Change Password", href: "/change-password", icon: KeyRound },
];
export function Sidebar() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState({"/collection-income":true,"/dues":true,"/settings":true,"/settings/configure":true,"/inpatient":true,"/users":true,"/appointments":true,"/laboratory":true,"/billing":true});
  const [logout] = useLogoutMutation();
  const { currentData: appearance, isError, refetch } = useGetAppearanceQuery(
    undefined,
    { skip: !user?.tenantId, refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const visibleNav = tenantNav.filter(
    (item) => (!item.permission || permissions.includes(item.permission)),
  );

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // ignore; still clear local state
    }
    dispatch(clearCredentials());
    dispatch(
      pushToast({
        title: "Signed out",
        description: "You have been logged out.",
        variant: "info",
      }),
    );
    router.replace("/login");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Stethoscope className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold">{appearance?.data?.shortName || appearance?.data?.displayName || "Hospital SaaS"}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {isError && <button onClick={refetch} className="w-full rounded-md px-3 py-2 text-xs text-muted-foreground" aria-label="Retry loading branding">{collapsed ? "Retry" : "Branding unavailable. Retry"}</button>}
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          if (item.children) return <div key={item.href}><button type="button" aria-label={item.label} aria-expanded={openMenus[item.href]} onClick={() => setOpenMenus(value => ({...value,[item.href]:!value[item.href]}))} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",active ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="h-4 w-4 shrink-0" />{!collapsed && <><span className="flex-1 text-left">{item.label}</span><ChevronDown className={cn("h-4 w-4 transition-transform",!openMenus[item.href] && "-rotate-90")} /></>}</button>{openMenus[item.href] && <div className={cn("mt-1 space-y-1 rounded-md bg-muted p-1",!collapsed && "ml-5 border-l pl-2")}>{item.children.filter(child=>!child.permission||permissions.includes(child.permission)).map(child => child.children?<div key={child.href}><button type="button" aria-label={child.label} aria-expanded={Boolean(openMenus[child.href])} onClick={()=>setOpenMenus(value=>({...value,[child.href]:!value[child.href]}))} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-background/70"><span>{collapsed?<Icon className="h-4 w-4"/>:child.label}</span><ChevronDown className={cn("h-4 w-4",!openMenus[child.href]&&"-rotate-90")}/></button>{openMenus[child.href]&&<div className="ml-3 space-y-1 border-l pl-2">{child.children.filter(link=>!link.permission||permissions.includes(link.permission)).map(link=><Link key={link.href} href={link.href} title={link.label} aria-label={link.label} className={cn("block rounded-md px-3 py-2 text-sm",pathname===link.href?"bg-primary/10 font-semibold text-foreground":"text-foreground/80 hover:bg-background/70")}>{collapsed?<Icon className="h-4 w-4"/>:link.label}</Link>)}</div>}</div>:<Link key={child.href} title={child.label} aria-label={child.label} href={child.href} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm",(child.href === item.href ? pathname === child.href : pathname?.startsWith(child.href)) ? "bg-primary/10 font-semibold text-foreground" : "text-foreground/80 hover:bg-background/70 hover:text-foreground")}>{collapsed ? <Icon className="h-4 w-4 shrink-0" /> : child.label}</Link>)}</div>}</div>;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div className="border-t border-border p-2">
        {!collapsed && user && (
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
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
