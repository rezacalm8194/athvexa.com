import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { verifyPassword, signSession, SESSION_COOKIE, parseRole, sessionCookieOptions } from "@/lib/auth";
import { parseContact } from "@/lib/contact";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email or phone number and password" }, { status: 400 });
    }
    const { identifier, password, remember } = parsed.data;
    const contact = parseContact(identifier);
    if (!contact) {
      return NextResponse.json({ error: "Enter a valid email or phone number" }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: contact.type === "email" ? { email: contact.value } : { phone: contact.value },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email, phone number, or password" }, { status: 401 });
    }
    const role = parseRole(user.role);
    if (!role) {
      return NextResponse.json({ error: "Account role is invalid" }, { status: 500 });
    }

    const token = await signSession({ sub: user.id, role, name: user.name }, remember);

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24));
    return res;
  } catch (error) {
    console.error("Login failed", error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    if (detail.includes("JWT_SECRET")) {
      return NextResponse.json({ error: "Server auth secret is not configured. Set JWT_SECRET in Pachim (32+ characters)." }, { status: 500 });
    }
    return NextResponse.json(
      {
        error: `Could not sign in. ${detail}`,
      },
      { status: 500 }
    );
  }
}
