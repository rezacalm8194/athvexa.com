import type { NextRequest } from "next/server";
import { normalizeEmail, normalizePhone } from "@/lib/contact";

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
export function getAppUrl(req?: Pick<NextRequest, "nextUrl">): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  const origin = req?.nextUrl.origin?.replace(/\/+$/, "");
  if (origin && isTrustedInviteOrigin(origin, configured)) {
    return origin;
  }

  if (configured) return configured;

  return "https://app.athvexa.com";
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

export function buildInviteUrl(token: string, req?: Pick<NextRequest, "nextUrl">): string {
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
  usedAt: Date | null;
  revoked: boolean;
  expiresAt: Date;
  useCount?: number;
  maxUses?: number;
};

export type InviteStatus = "accepted" | "revoked" | "expired" | "pending";

export function inviteStatus(invite: InviteRow): InviteStatus {
  if (invite.usedAt) return "accepted";
  if (invite.revoked) return "revoked";
  // Defensive: a fully-consumed multi-use link must read as accepted even if
  // usedAt was never stamped (e.g. a race between concurrent redemptions).
  if (
    typeof invite.useCount === "number" &&
    typeof invite.maxUses === "number" &&
    invite.useCount >= invite.maxUses
  ) {
    return "accepted";
  }
  if (invite.expiresAt <= new Date()) return "expired";
  return "pending";
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
