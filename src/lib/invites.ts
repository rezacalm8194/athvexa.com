import type { NextRequest } from "next/server";
import { customAlphabet } from "nanoid";
import { normalizeEmail, normalizePhone } from "@/lib/contact";

// Underscore and hyphen break autolinks in WhatsApp/Telegram (markdown), so
// invite tokens are alphanumeric only. 16 chars ≈ 95 bits with this alphabet.
const inviteTokenAlphabet = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

export function createInviteToken() {
  return inviteTokenAlphabet();
}

/**
 * Chat apps often wrap invite URLs with bidi marks, punctuation, or a trailing
 * slash. Strip that noise so the token still matches the database row.
 */
export function normalizeInviteToken(raw: string): string {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // Already decoded, or the token contains a literal %.
  }
  value = value.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").trim();
  const embedded = value.match(/\/invite\/([^/?#]+)/i);
  if (embedded) value = embedded[1];
  value = value.split(/[/?#]/)[0] ?? value;
  const token = (value.match(/[A-Za-z0-9_-]+/) ?? [""])[0];
  return token;
}

/** Put the URL on its own LTR line so RTL captions do not swallow the path. */
export function shareInviteMessage(caption: string, url: string) {
  return `${caption.trim()}\n\n\u2066${url}\u2069`;
}

/**
 * Resolves the public base URL used to build shareable invite links.
 *
 * The invite record lives in THIS deployment's database, so the link must
 * open on the same host the coach is currently using — otherwise the token
 * lookup fails on the other host and the player sees "invite expired".
 *
 * Order of preference:
 *  1. The incoming request origin, when it is trusted (the configured host,
 *     the athvexa.com host family, or — outside production — any non-local
 *     preview host). The origin is never trusted blindly so a spoofed Host
 *     header cannot turn generated links into phishing URLs.
 *  2. NEXT_PUBLIC_APP_URL - the canonical public URL for the app.
 *  3. In production, https://app.athvexa.com - a safe default when the env var is missing.
 *
 * This never falls back to a hardcoded development URL.
 */
type InviteRequest = Pick<NextRequest, "nextUrl" | "headers">;

export function getAppUrl(req?: InviteRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  // `nextUrl.origin` can contain the application's configured/internal host
  // behind a reverse proxy. Prefer the original public host forwarded by the
  // proxy so an invite created on athvexa.com does not point at the separate
  // app.athvexa.com deployment (and therefore its separate SQLite database).
  for (const origin of requestOrigins(req)) {
    if (isTrustedInviteOrigin(origin, configured)) return origin;
  }

  if (configured) return configured;

  return "https://app.athvexa.com";
}

function requestOrigins(req?: InviteRequest): string[] {
  if (!req) return [];

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const directHost = req.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : req.nextUrl.protocol.replace(":", "") || "https";

  const origins = [forwardedHost, directHost]
    .filter((host): host is string => Boolean(host))
    .map((host) => `${protocol}://${host}`);
  origins.push(req.nextUrl.origin);

  return [...new Set(origins.map((origin) => origin.replace(/\/+$/, "")))];
}

function isTrustedInviteOrigin(origin: string, configured?: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();

  if (configured) {
    try {
      if (host === new URL(configured).hostname.toLowerCase()) return true;
    } catch {
      // Ignore a malformed configured URL and fall through to other checks.
    }
  }

  // Production host family — invites created here resolve here.
  if (host === "athvexa.com" || host.endsWith(".athvexa.com")) return true;

  // Outside production, any non-local host (preview deployments) is fine.
  // Local hosts are never trusted so generated links stay shareable.
  if (process.env.NODE_ENV !== "production" && host !== "localhost" && host !== "127.0.0.1") {
    return true;
  }

  return false;
}

export function buildInviteUrl(token: string, req?: InviteRequest): string {
  return `${getAppUrl(req)}/invite/${token}`;
}

/** Shortens a URL for display only - the full URL is still what gets copied/sent. */
export function shortenUrlForDisplay(url: string, maxLength = 42): string {
  if (url.length <= maxLength) return url;
  const withoutProtocol = url.replace(/^https?:\/\//, "");
  if (withoutProtocol.length <= maxLength) return withoutProtocol;
  const head = withoutProtocol.slice(0, 24);
  const tail = withoutProtocol.slice(-10);
  return `${head}...${tail}`;
}

export type InviteRow = {
  usedAt: Date | string | null;
  revoked: boolean;
  expiresAt: Date | string;
  useCount?: number | string | null;
  maxUses?: number | string | null;
};

export type InviteStatus = "accepted" | "revoked" | "expired" | "pending";

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function inviteStatus(invite: InviteRow): InviteStatus {
  if (invite.usedAt) return "accepted";
  if (invite.revoked) return "revoked";
  // Defensive: a fully-consumed multi-use link must read as accepted even if
  // usedAt was never stamped (e.g. a race between concurrent redemptions).
  const useCountRaw = Number(invite.useCount ?? 0);
  const maxUsesRaw = Number(invite.maxUses ?? 1);
  const useCount = Number.isFinite(useCountRaw) && useCountRaw > 0 ? useCountRaw : 0;
  const maxUses = Number.isFinite(maxUsesRaw) && maxUsesRaw > 0 ? maxUsesRaw : 1;
  if (useCount >= maxUses) {
    return "accepted";
  }
  const expiresAt = asDate(invite.expiresAt);
  // If the stored datetime cannot be parsed, do not treat the invite as dead —
  // that was showing every fresh link as "expired" on some SQLite rows.
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
}

export function isInviteRedeemable<T extends InviteRow>(invite: T | null | undefined): invite is T {
  return Boolean(invite && inviteStatus(invite) === "pending");
}

export function normalizeInviteEmail(value?: string | null) {
  if (!value) return null;
  const email = normalizeEmail(value);
  return email || null;
}

export function normalizeInvitePhone(value?: string | null) {
  if (!value) return null;
  const phone = normalizePhone(value);
  return /^\+[1-9]\d{9,14}$/.test(phone) ? phone : null;
}

export function inviteRoleToTeamRole(role: string) {
  if (role === "COACH") return "HEAD_COACH";
  if (role === "ASSISTANT") return "ASSISTANT_COACH";
  return "PLAYER";
}
