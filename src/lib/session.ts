import { cookies } from "next/headers";
import { parseRole, SESSION_COOKIE, verifySession } from "./auth";
import { db } from "./db";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  try {
    const user = await db.user.findUnique({
      where: { id: session.sub },
      select: { role: true, name: true },
    });
    if (!user) return null;
    const role = parseRole(user.role);
    if (!role) return session;
    return { sub: session.sub, role, name: user.name || session.name };
  } catch {
    return session;
  }
}
