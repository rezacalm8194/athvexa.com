import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE, dashboardUrlForRole, sessionCookieDomain } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["COACH", "PLAYER"]),
  inviteToken: z.string().optional(), // present when a player joins via a coach's link
});

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { name, email, password, role, inviteToken } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    let coachId: string | undefined;
    if (role === "PLAYER" && inviteToken) {
      const invite = await db.invite.findUnique({ where: { token: inviteToken } });
      if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
        coachId = invite.coachId;
        await db.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
      }
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        coachId,
      },
    });

    const token = await signSession({ sub: user.id, role, name: user.name }, true);

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        redirectTo: dashboardUrlForRole(role),
      },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(sessionCookieDomain() ? { domain: sessionCookieDomain() } : {}),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "Account could not be created. Make sure the database is configured and migrated." },
      { status: 500 }
    );
  }
}
