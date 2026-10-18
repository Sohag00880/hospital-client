"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissToast } from "@/features/ui/uiSlice";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

const variantStyles = {
  info: "border-border bg-card text-card-foreground",
  success: "border-success/40 bg-success/10",
  warning: "border-warning/40 bg-warning/10",
  error: "border-destructive/40 bg-destructive/10",
};

function ToastItem({ id, title, description, variant, durationMs = 5000 }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(id)), durationMs);
    return () => clearTimeout(timer);
  }, [id, durationMs, dispatch]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto w-80 rounded-md border p-3 shadow-md",
        "bg-card text-card-foreground",
        variantStyles[variant] ?? variantStyles.info,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <button
          onClick={() => dispatch(dismissToast(id))}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}