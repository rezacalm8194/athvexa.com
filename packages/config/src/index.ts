export type RuntimeMode = "development" | "test" | "production";

export type PublicUrlEnvironment = {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_MARKETING_URL?: string;
  NODE_ENV?: string;
};

export type ForwardedHeaders = {
  get(name: string): string | null;
};

const defaultProductionAppUrl = "https://athvexa.com";
const defaultDevelopmentAppUrl = "http://localhost:3000";
const invalidBrowserHosts = new Set(["0.0.0.0", "[::]", "::"]);
const localBrowserHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const productionBrowserHosts = new Set(["athvexa.com"]);

function isLocalBrowserHost(hostname: string) {
  return localBrowserHosts.has(hostname);
}

function isAllowedProductionBrowserHost(hostname: string) {
  return productionBrowserHosts.has(hostname.toLowerCase());
}

export function getRuntimeMode(env: PublicUrlEnvironment = process.env): RuntimeMode {
  if (env.NODE_ENV === "production") {
    return "production";
  }

  if (env.NODE_ENV === "test") {
    return "test";
  }

  return "development";
}

export function isProduction(env: PublicUrlEnvironment = process.env) {
  return getRuntimeMode(env) === "production";
}

export function normalizeTrailingSlash(value: string) {
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function normalizeBrowserHost(url: URL, mode: RuntimeMode) {
  if (invalidBrowserHosts.has(url.hostname)) {
    if (mode === "production") {
      return false;
    }

    url.hostname = "localhost";
  }

  return true;
}

export function normalizePublicUrl(value: string | undefined, fallback: string, mode: RuntimeMode) {
  const rawValue = value?.trim() || fallback;

  try {
    const url = new URL(rawValue);

    if (!normalizeBrowserHost(url, mode)) {
      return normalizePublicUrl(undefined, fallback, mode);
    }

    if (mode === "production") {
      url.protocol = "https:";
    }

    return normalizeTrailingSlash(url.toString());
  } catch {
    return normalizeTrailingSlash(fallback);
  }
}

export function getPublicAppUrl(env: PublicUrlEnvironment = process.env) {
  const mode = getRuntimeMode(env);
  const fallback = mode === "production" ? defaultProductionAppUrl : defaultDevelopmentAppUrl;

  return normalizePublicUrl(env.NEXT_PUBLIC_APP_URL, fallback, mode);
}

export function getPublicMarketingUrl(env: PublicUrlEnvironment = process.env) {
  const mode = getRuntimeMode(env);
  const fallback = getPublicAppUrl(env);

  return normalizePublicUrl(env.NEXT_PUBLIC_MARKETING_URL, fallback, mode);
}

export function buildAbsoluteUrl(baseUrl: string, path = "/") {
  return new URL(getSafeInternalPath(path), `${normalizeTrailingSlash(baseUrl)}/`).toString();
}

export function getSafeInternalPath(value: string | null | undefined, fallback = "/onboarding") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://internal.local");

    if (url.origin !== "https://internal.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function getForwardedBaseUrl(headers: ForwardedHeaders | undefined) {
  if (!headers) {
    return undefined;
  }

  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
  const firstForwardedHost = forwardedHost?.split(",")[0]?.trim();

  if (firstForwardedHost) {
    const hostWithoutPort = firstForwardedHost.split(":")[0]?.toLowerCase();

    if (hostWithoutPort && isAllowedProductionBrowserHost(hostWithoutPort)) {
      return `https://${hostWithoutPort}`;
    }
  }

  const referer = headers.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);

      if (refererUrl.protocol === "https:" && isAllowedProductionBrowserHost(refererUrl.hostname)) {
        return refererUrl.origin;
      }
    } catch {
      // Ignore malformed referers.
    }
  }

  return undefined;
}

export function getRequestBaseUrl(
  requestUrl: string,
  env: PublicUrlEnvironment = process.env,
  headers?: ForwardedHeaders
) {
  const mode = getRuntimeMode(env);
  const configuredAppUrl = env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredAppUrl) {
    try {
      const url = new URL(configuredAppUrl);

      if (!invalidBrowserHosts.has(url.hostname) && !isLocalBrowserHost(url.hostname)) {
        return getPublicAppUrl(env);
      }
    } catch {
      // Fall through to the request URL or default app URL.
    }
  }

  const forwardedBaseUrl = getForwardedBaseUrl(headers);

  if (forwardedBaseUrl) {
    return normalizeTrailingSlash(forwardedBaseUrl);
  }

  if (mode === "production") {
    return getPublicAppUrl(env);
  }

  try {
    const url = new URL(requestUrl);
    normalizeBrowserHost(url, mode);

    return normalizeTrailingSlash(url.origin);
  } catch {
    return getPublicAppUrl(env);
  }
}

export function buildSafeRedirectUrl(
  requestUrl: string,
  destination: string,
  env: PublicUrlEnvironment = process.env,
  headers?: ForwardedHeaders
) {
  const baseUrl = getRequestBaseUrl(requestUrl, env, headers);

  return new URL(getSafeInternalPath(destination), `${baseUrl}/`);
}

export function isAllowedBrowserOrigin(
  origin: string,
  env: PublicUrlEnvironment = process.env
) {
  try {
    const url = new URL(origin);
    const mode = getRuntimeMode(env);

    if (!normalizeBrowserHost(url, mode)) {
      return false;
    }

    const allowedOrigins = new Set([
      getPublicAppUrl(env),
      getPublicMarketingUrl(env)
    ]);

    if (mode !== "production") {
      allowedOrigins.add(defaultDevelopmentAppUrl);
      allowedOrigins.add("http://localhost:3001");
    }

    return allowedOrigins.has(normalizeTrailingSlash(url.origin));
  } catch {
    return false;
  }
}

export const publicUrlTestExports = {
  defaultProductionAppUrl,
  defaultDevelopmentAppUrl,
  localBrowserHosts,
  productionBrowserHosts
};
