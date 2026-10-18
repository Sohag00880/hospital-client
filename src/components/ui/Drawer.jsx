"use client";

import { useId } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  widthClass = "w-96",
}) {
  const titleId = useId();
  const focusRef = useDialogFocus(open, onClose);

  if (!open) return null;

  return (
    <div ref={focusRef} tabIndex={-1} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "Details"}>
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute top-0 flex h-full flex-col border-border bg-card shadow-xl",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          widthClass,
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border p-4">
          <div>
            {title && <h2 id={titleId} className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
