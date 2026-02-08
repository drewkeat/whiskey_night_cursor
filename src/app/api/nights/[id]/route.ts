import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  whiskeyId: z.string().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const night = await prisma.whiskeyNight.findUnique({
    where: { id },
    include: {
      club: true,
      host: { select: { id: true, name: true, email: true } },
      whiskey: true,
      attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!night) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const myAttendance = night.attendees.find((a) => a.userId === session.user.id);
  if (!myAttendance) {
    return NextResponse.json({ error: "You are not invited to this event" }, { status: 403 });
  }
  return NextResponse.json({ ...night, myStatus: myAttendance.status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const night = await prisma.whiskeyNight.findUnique({
    where: { id },
    include: { hostId: true },
  });
  if (!night) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (night.hostId !== session.user.id) {
    return NextResponse.json({ error: "Only the host can update this event" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (parsed.data.whiskeyId !== null) {
    const whiskey = await prisma.whiskey.findUnique({
      where: { id: parsed.data.whiskeyId },
    });
    if (!whiskey) {
      return NextResponse.json({ error: "Whiskey not found" }, { status: 404 });
    }
  }
  const updated = await prisma.whiskeyNight.update({
    where: { id },
    data: { whiskeyId: parsed.data.whiskeyId },
    include: {
      club: true,
      host: { select: { id: true, name: true, email: true } },
      whiskey: true,
      attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  return NextResponse.json(updated);
}
