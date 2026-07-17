export const sessionCookieName = "__Host-fpp_session";

export type SessionCookieOptions = {
  expires: Date;
  secure: boolean;
};

export function buildSessionCookie(token: string, options: SessionCookieOptions): string {
  const parts = [
    `${sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${options.expires.toUTCString()}`
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildExpiredSessionCookie(secure: boolean): string {
  return buildSessionCookie("", {
    expires: new Date(0),
    secure
  });
}
