"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName } from "@fpp/auth";
import { loginWithPassword, signupWithPassword } from "./auth-flow";

async function setSessionCookie(token: string, expires: Date) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function signupAction(formData: FormData) {
  const result = await signupWithPassword(formData, await headers());

  if (!result.ok) {
    redirect(`/signup?error=${result.error}`);
  }

  await setSessionCookie(result.token, result.expiresAt);
  redirect(result.returnTo);
}

export async function loginAction(formData: FormData) {
  const result = await loginWithPassword(formData, await headers());

  if (!result.ok) {
    redirect(`/login?error=${result.error}`);
  }

  await setSessionCookie(result.token, result.expiresAt);
  redirect(result.returnTo);
}
