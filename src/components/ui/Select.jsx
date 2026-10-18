import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive focus-visible:ring-destructive",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});