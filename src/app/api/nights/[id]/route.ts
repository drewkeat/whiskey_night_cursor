import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import type { CalendarConnectionWithTokens } from "@/lib/google-calendar";

const patchSchema = z.object({
  whiskeyId: z.string().nullable().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
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
  const p = parsed.data;
  if (p.whiskeyId !== undefined && p.whiskeyId !== null) {
    const whiskey = await prisma.whiskey.findUnique({
      where: { id: p.whiskeyId },
    });
    if (!whiskey) {
      return NextResponse.json({ error: "Whiskey not found" }, { status: 404 });
    }
  }
  if (p.startTime !== undefined && p.endTime !== undefined) {
    const start = new Date(p.startTime);
    const end = new Date(p.endTime);
    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
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
  if (p.whiskeyId !== undefined) updateData.whiskeyId = p.whiskeyId;
  if (p.title !== undefined) updateData.title = p.title || null;
  if (p.notes !== undefined) updateData.notes = p.notes || null;
  if (p.location !== undefined) updateData.location = p.location?.trim() || null;
  if (p.startTime !== undefined) updateData.startTime = new Date(p.startTime);
  if (p.endTime !== undefined) updateData.endTime = new Date(p.endTime);
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
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
  const calendarFieldsChanged =
    night.googleEventId &&
    (p.title !== undefined || p.notes !== undefined || p.location !== undefined || p.startTime !== undefined || p.endTime !== undefined);
  if (calendarFieldsChanged && updated.googleEventId) {
    const hostConnection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId: updated.hostId, provider: "google" } },
    });
    if (hostConnection) {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const eventName =
        updated.title ??
        (updated.whiskey ? `${updated.whiskey.name} at ${updated.club.name}` : `Whiskey night at ${updated.club.name}`);
      const nightUrl = `${baseUrl}/nights/${updated.id}`;
      const attendeeEmails = updated.attendees
        .filter((a) => a.userId !== updated.hostId && a.user.email)
        .map((a) => a.user.email as string);
      try {
        await updateCalendarEvent(hostConnection as CalendarConnectionWithTokens, updated.googleEventId, {
          summary: eventName,
          description: [updated.notes, `View event: ${nightUrl}`].filter(Boolean).join("\n\n"),
          location: updated.location ?? undefined,
          start: updated.startTime.toISOString(),
          end: updated.endTime.toISOString(),
          attendeeEmails,
        });
      } catch (err) {
        console.error("Google Calendar event update failed:", err);
      }
    }
  }
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
  if (night.googleEventId) {
    const hostConnection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId: night.hostId, provider: "google" } },
    });
    if (hostConnection) {
      try {
        await deleteCalendarEvent(hostConnection as CalendarConnectionWithTokens, night.googleEventId);
      } catch (err) {
        console.error("Google Calendar event delete failed:", err);
      }
    }
  }
  await prisma.whiskeyNight.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
