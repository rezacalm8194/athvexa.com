import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./auth";

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
