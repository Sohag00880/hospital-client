import { Spinner } from "@/components/ui/Spinner";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Loading..." />
    </div>
  );
}