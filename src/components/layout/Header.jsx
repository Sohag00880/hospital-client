"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/features/ui/uiSlice";
import { Breadcrumbs } from "./Breadcrumbs";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";

export function Header() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => dispatch(toggleSidebar())}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="hidden sm:block">
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </span>
        <Menu className="h-4 w-4 sm:hidden" />
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <ThemeToggle />
    </header>
  );
}