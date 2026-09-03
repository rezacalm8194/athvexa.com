import { AlertIcon, RefreshIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

export default function ErrorState({
  message,
  locale,
  onRetry,
}: {
  message?: string;
  locale?: Locale;
  onRetry?: () => void;
}) {
  const resolvedLocale = locale ?? "en";
  const displayMessage = message ?? t(resolvedLocale, "common.defaultError");

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red/20 bg-red/5 px-6 py-12 text-center">
      <AlertIcon className="h-6 w-6 text-red-glow" />
      <p className="max-w-sm text-sm text-smoke-3">{displayMessage}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost !px-3.5 !py-2 text-xs">
          <RefreshIcon className="mr-1.5 h-3.5 w-3.5" />
          {t(resolvedLocale, "common.tryAgain")}
        </button>
      )}
    </div>
  );
}
