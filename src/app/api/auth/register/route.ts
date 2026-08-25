import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { normalizeEmail, normalizePhone } from "@/lib/contact";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  contactType: z.enum(["email", "phone"]),
  contact: z.string().min(1, "Enter your email or phone number"),
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
    const { name, contactType, password, inviteToken } = parsed.data;
    const email = contactType === "email" ? normalizeEmail(parsed.data.contact) : null;
    const phone = contactType === "phone" ? normalizePhone(parsed.data.contact) : null;
    if (email && !z.string().email().safeParse(email).success) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    if (phone && !/^\+[1-9]\d{9,14}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number including country code" }, { status: 400 });
    }
    let role = parsed.data.role;

    const existing = await db.user.findFirst({ where: email ? { email } : { phone } });
    if (existing) {
      return NextResponse.json({ error: `An account with this ${contactType === "email" ? "email" : "phone number"} already exists` }, { status: 409 });
    }

    let coachId: string | undefined;
    let inviteIdToLink: string | undefined;
    let inviteTeamId: string | null = null;

    if (inviteToken) {
      const invite = await db.invite.findUnique({ where: { token: inviteToken } });
      const isValid = Boolean(invite && !invite.revoked && invite.useCount < invite.maxUses && invite.expiresAt > new Date());
      if (!invite || !isValid) {
        return NextResponse.json(
          { error: "This invite link has expired or already been used" },
          { status: 400 }
        );
      }
      // Trust the invite's role from the database, not whatever the client sent —
      // otherwise anyone could self-promote to ASSISTANT by editing the request.
      role = invite.role === "COACH" ? "COACH" : invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
      coachId = invite.coachId;
      inviteIdToLink = invite.id;
      inviteTeamId = invite.teamId;
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
        phone,
        passwordHash: await hashPassword(password),
        role,
        coachId,
      },
    });

    if (inviteIdToLink) {
      const inviteToUse = await db.invite.findUniqueOrThrow({ where: { id: inviteIdToLink } });
      const nextUseCount = inviteToUse.useCount + 1;
      await db.invite.update({
        where: { id: inviteIdToLink },
        data: {
          useCount: { increment: 1 },
          usedAt: nextUseCount >= inviteToUse.maxUses ? new Date() : null,
          acceptedUserId: user.id,
        },
      });
      if (inviteTeamId) {
        await db.teamMember.upsert({
          where: { teamId_userId: { teamId: inviteTeamId, userId: user.id } },
          update: { role: role === "COACH" ? "HEAD_COACH" : role === "ASSISTANT" ? "ASSISTANT_COACH" : "PLAYER" },
          create: {
            teamId: inviteTeamId,
            userId: user.id,
            role: role === "COACH" ? "HEAD_COACH" : role === "ASSISTANT" ? "ASSISTANT_COACH" : "PLAYER",
          },
        });
      }
    }

    const token = await signSession({ sub: user.id, role, name: user.name }, true);

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
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
