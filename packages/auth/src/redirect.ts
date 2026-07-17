export function getSafeReturnPath(value: string | null | undefined, fallback = "/onboarding") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
