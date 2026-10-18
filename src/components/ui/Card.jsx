import { cn } from "@/lib/cn";

export function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}