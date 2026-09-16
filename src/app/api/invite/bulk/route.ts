import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl, normalizeInviteEmail, normalizeInvitePhone } from "@/lib/invites";
import { findUserByInviteContact } from "@/lib/inviteActions";
import { getCurrentTeamMembership, getTeamOwnerId } from "@/lib/teamContext";
import { deliverInviteToExistingUser } from "@/lib/playerInbox";
import { rosterUsage } from "@/lib/teamWorkspace";

const schema = z.object({
  contacts: z.array(z.string().trim().min(1)).min(1).max(100),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  expiresAt: z.string().datetime().optional(),
});

function parseContact(value: string) {
  const normalized = value.trim();
  const email = normalizeInviteEmail(normalized);
  if (email) return { email, phone: null };
  const phone = normalizeInvitePhone(normalized);
  if (phone) return { email: null, phone };
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }
  await ensureDatabase();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid player list" }, { status: 400 });
  }

  const teamOwnerId = await getTeamOwnerId(session.sub);
  const membership = await getCurrentTeamMembership(session.sub);
  if (!membership || membership.team.coachId !== teamOwnerId) {
    return NextResponse.json({ error: "Set up your team before inviting players" }, { status: 400 });
  }

  const roster = await rosterUsage(teamOwnerId);
  let remaining = roster.remaining;

  const seen = new Set<string>();
  const results: Array<{ contact: string; status: "created" | "duplicate" | "invalid" | "joined"; url?: string }> = [];
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : new Date(Date.now() + (parsed.data.expiresInDays ?? 14) * 86_400_000);
  if (expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: "Expiration must be at least 5 minutes in the future" }, { status: 400 });
  }

  for (const raw of parsed.data.contacts) {
    const contact = parseContact(raw);
    if (!contact) {
      results.push({ contact: raw, status: "invalid" });
      continue;
    }
    const key = contact.email ? `email:${contact.email}` : `phone:${contact.phone}`;
    if (seen.has(key)) {
      results.push({ contact: raw, status: "duplicate" });
      continue;
    }
    seen.add(key);
    // A contact that already belongs to this team needs no new invite —
    // handing out another link for them only creates confusion.
    const existingUser = await findUserByInviteContact(contact.email, contact.phone);
    if (existingUser?.role === "PLAYER") {
      const alreadyMember = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: membership.teamId, userId: existingUser.id } },
        select: { id: true },
      });
      if (alreadyMember) {
        results.push({ contact: raw, status: "duplicate" });
        continue;
      }
    }
    const existing = await db.invite.findFirst({
      where: {
        coachId: teamOwnerId,
        teamId: membership.teamId,
        role: "PLAYER",
        revoked: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
        ...(contact.email ? { email: contact.email } : { phone: contact.phone }),
      },
    });
    if (existing) {
      results.push({ contact: raw, status: "duplicate", url: buildInviteUrl(existing.token, req) });
      continue;
    }
    if (remaining < 1) {
      results.push({ contact: raw, status: "invalid" });
      continue;
    }
    const invite = await db.invite.create({
      data: {
        token: nanoid(12),
        coachId: teamOwnerId,
        teamId: membership.teamId,
        role: "PLAYER",
        email: contact.email,
        phone: contact.phone,
        expiresAt,
      },
    });
    remaining -= 1;
    const delivery = await deliverInviteToExistingUser({
      invite,
      actorId: session.sub,
      actorName: session.name,
      teamName: membership.team.name,
    });
    if (delivery.joined) {
      // The player was added to the team straight away, which consumes this
      // single-use invite — its URL is already spent, so report it as joined
      // instead of handing out a dead link.
      results.push({ contact: raw, status: "joined" });
      continue;
    }
    results.push({ contact: raw, status: "created", url: buildInviteUrl(invite.token, req) });
  }

  return NextResponse.json({
    results,
    summary: {
      created: results.filter((item) => item.status === "created").length,
      duplicate: results.filter((item) => item.status === "duplicate").length,
      invalid: results.filter((item) => item.status === "invalid").length,
      joined: results.filter((item) => item.status === "joined").length,
    },
  });
}
