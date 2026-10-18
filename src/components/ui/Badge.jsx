import { cn } from "@/lib/cn";

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-foreground",
};

export function Badge({ variant = "default", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant] ?? variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}