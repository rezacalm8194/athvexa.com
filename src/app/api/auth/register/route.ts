import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["COACH", "PLAYER", "ASSISTANT"]),
  inviteToken: z.string().optional(), // present when joining via a coach's invite link
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
    const { name, email, password, inviteToken } = parsed.data;
    let role = parsed.data.role;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    let coachId: string | undefined;
    let inviteIdToLink: string | undefined;

    if (inviteToken) {
      const invite = await db.invite.findUnique({ where: { token: inviteToken } });
      const isValid = Boolean(invite && !invite.usedAt && invite.expiresAt > new Date());
      if (!invite || !isValid) {
        return NextResponse.json(
          { error: "This invite link has expired or already been used" },
          { status: 400 }
        );
      }
      // Trust the invite's role from the database, not whatever the client sent —
      // otherwise anyone could self-promote to ASSISTANT by editing the request.
      role = invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
      coachId = invite.coachId;
      inviteIdToLink = invite.id;
    } else if (role === "ASSISTANT") {
      // Assistant accounts can only be created through a coach's invite link.
      return NextResponse.json(
        { error: "Assistant coach accounts require an invite link from a coach" },
        { status: 400 }
      );
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

    if (inviteIdToLink) {
      await db.invite.update({
        where: { id: inviteIdToLink },
        data: { usedAt: new Date(), acceptedUserId: user.id },
      });
    }

    const token = await signSession({ sub: user.id, role, name: user.name }, true);

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
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
