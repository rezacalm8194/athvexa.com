import type { NextRequest } from "next/server";

/**
 * Resolves the public base URL used to build shareable invite links.
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_APP_URL - the canonical public URL for the app.
 *  2. In production, https://athvexa.com - a safe default when the env var is missing.
 *  3. The incoming request origin - only outside production for development and previews.
 *
 * This never falls back to a hardcoded development URL.
 */
export function getAppUrl(req?: Pick<NextRequest, "nextUrl">): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://athvexa.com";
  }

  return (req?.nextUrl.origin ?? "https://athvexa.com").replace(/\/+$/, "");
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
};

export type InviteStatus = "accepted" | "revoked" | "expired" | "pending";

export function inviteStatus(invite: InviteRow): InviteStatus {
  if (invite.usedAt) return "accepted";
  if (invite.revoked) return "revoked";
  if (invite.expiresAt <= new Date()) return "expired";
  return "pending";
}
