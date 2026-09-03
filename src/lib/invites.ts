import type { NextRequest } from "next/server";
import { normalizeEmail, normalizePhone } from "@/lib/contact";

/**
 * Resolves the public base URL used to build shareable invite links.
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_APP_URL - the canonical public URL for the app.
 *  2. In production, https://app.athvexa.com - a safe default when the env var is missing.
 *  3. The incoming request origin - only outside production for non-local previews.
 *
 * This never falls back to a hardcoded development URL.
 */
export function getAppUrl(req?: Pick<NextRequest, "nextUrl">): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://app.athvexa.com";
  }

  const origin = req?.nextUrl.origin?.replace(/\/+$/, "");
  if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return "https://app.athvexa.com";
  }

  return origin;
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
