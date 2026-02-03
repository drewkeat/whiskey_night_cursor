import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  clubId: z.string(),
  hostId: z.string(),
  whiskeyId: z.string(),
  title: z.string().optional(),
  notes: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendeeIds: z.array(z.string()).optional(), // if empty, invite all club members
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.clubMember.findFirst({
    where: { clubId: parsed.data.clubId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this club" }, { status: 403 });
  }

  const [club, whiskey, hostInClub] = await Promise.all([
    prisma.club.findUnique({ where: { id: parsed.data.clubId }, include: { members: true } }),
    prisma.whiskey.findUnique({ where: { id: parsed.data.whiskeyId } }),
    prisma.clubMember.findFirst({
      where: { clubId: parsed.data.clubId, userId: parsed.data.hostId },
    }),
  ]);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  if (!whiskey) return NextResponse.json({ error: "Whiskey not found" }, { status: 404 });
  if (!hostInClub) return NextResponse.json({ error: "Host must be a club member" }, { status: 400 });

  const inviteUserIds =
    parsed.data.attendeeIds && parsed.data.attendeeIds.length > 0
      ? parsed.data.attendeeIds.filter((uid) => club.members.some((m) => m.userId === uid))
      : club.members.map((m) => m.userId);

  const night = await prisma.whiskeyNight.create({
    data: {
      clubId: parsed.data.clubId,
      hostId: parsed.data.hostId,
      whiskeyId: parsed.data.whiskeyId,
      title: parsed.data.title ?? null,
      notes: parsed.data.notes ?? null,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      attendees: {
        create: inviteUserIds.map((userId) => ({ userId, status: "invited" })),
      },
    },
    include: {
      club: true,
      host: { select: { id: true, name: true, email: true } },
      whiskey: true,
      attendees: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const eventName = night.title ?? `${night.whiskey.name} at ${night.club.name}`;
  const hostName = night.host.name ?? night.host.email ?? "A host";
  for (const att of night.attendees) {
    if (att.userId === night.hostId) continue;
    const { notifyEventInvite } = await import("@/lib/notifications");
    notifyEventInvite({
      userId: att.user.id,
      email: att.user.email ?? "",
      phone: att.user.phone ?? null,
      eventName,
      hostName,
      startTime: night.startTime,
      nightId: night.id,
      baseUrl,
    }).catch((err) => console.error("Notify invite failed:", err));
  }

  return NextResponse.json(night);
}
