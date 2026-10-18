import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Return home
      </Link>
    </div>
  );
}