import { AlertIcon, RefreshIcon } from "@/components/icons";

export default function ErrorState({
  message = "Something went wrong while loading this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red/20 bg-red/5 px-6 py-12 text-center">
      <AlertIcon className="h-6 w-6 text-red-glow" />
      <p className="max-w-sm text-sm text-smoke-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost !px-3.5 !py-2 text-xs">
          <RefreshIcon className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
