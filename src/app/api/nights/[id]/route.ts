import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  whiskeyId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
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
  const data = parsed.data;
  if (data.whiskeyId !== undefined && data.whiskeyId !== null) {
    const whiskey = await prisma.whiskey.findUnique({
      where: { id: data.whiskeyId },
    });
    if (!whiskey) {
      return NextResponse.json({ error: "Whiskey not found" }, { status: 404 });
    }
  }
  const updateData: {
    whiskeyId?: string | null;
    title?: string | null;
    notes?: string | null;
    location?: string | null;
    startTime?: Date;
    endTime?: Date;
  } = {};
  if (data.whiskeyId !== undefined) updateData.whiskeyId = data.whiskeyId;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.location !== undefined) updateData.location = data.location?.trim() || null;
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
  if (data.startTime !== undefined && data.endTime !== undefined) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }
  }
  const updated = await prisma.whiskeyNight.update({
    where: { id },
    data: updateData,
    include: {
      club: true,
      host: { select: { id: true, name: true, email: true } },
      whiskey: true,
      attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
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
  });
  if (!night) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (night.hostId !== session.user.id) {
    return NextResponse.json({ error: "Only the host can delete this event" }, { status: 403 });
  }
  await prisma.whiskeyNight.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
