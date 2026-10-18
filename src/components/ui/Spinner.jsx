import { cn } from "@/lib/cn";

export function Spinner({ className, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <svg
        className={cn("h-5 w-5 animate-spin text-primary", className)}
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-label={label ?? "Loading"}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="4"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </div>
  );
}