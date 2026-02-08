import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchFreeBusy } from "@/lib/google-calendar";
import type { CalendarConnectionWithTokens } from "@/lib/google-calendar";

const DEFAULT_DURATION_MINUTES = 120;
const SLOT_STEP_MINUTES = 60;

function parseTime(str: string): number {
  return new Date(str).getTime();
}

function slotOverlapsBusy(
  slotStart: number,
  slotEnd: number,
  busy: { start: string; end: string }[]
): boolean {
  return busy.some((b) => {
    const bStart = parseTime(b.start);
    const bEnd = parseTime(b.end);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: clubId } = await params;
  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  const durationMinutes = Math.min(
    240,
    Math.max(30, parseInt(searchParams.get("durationMinutes") ?? String(DEFAULT_DURATION_MINUTES), 10))
  );
  const startTimeOfDay = searchParams.get("startTimeOfDay"); // HH:mm optional (local)
  const endTimeOfDay = searchParams.get("endTimeOfDay"); // HH:mm optional (local)
  const offsetMinutes = searchParams.get("offsetMinutes"); // minutes to add to local to get UTC (same as JS getTimezoneOffset(), e.g. 480 for PST)

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax (ISO) required" },
      { status: 400 }
    );
  }
  const tMin = new Date(timeMin);
  const tMax = new Date(timeMax);
  if (isNaN(tMin.getTime()) || isNaN(tMax.getTime()) || tMax <= tMin) {
    return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
  }

  const membership = await prisma.clubMember.findFirst({
    where: { clubId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this club" }, { status: 403 });
  }

  const members = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const connections = await prisma.calendarConnection.findMany({
    where: {
      userId: { in: members.map((m) => m.userId) },
      provider: "google",
    },
  });

  const memberConnections = members
    .map((m) => {
      const conn = connections.find((c) => c.userId === m.userId);
      if (!conn) return null;
      return {
        userId: m.userId,
        userName: m.user.name ?? m.user.email ?? m.user.id,
        connection: conn as CalendarConnectionWithTokens,
      };
    })
    .filter(Boolean) as {
    userId: string;
    userName: string | null;
    connection: CalendarConnectionWithTokens;
  }[];

  if (memberConnections.length === 0) {
    return NextResponse.json({
      slots: [],
      totalConnected: 0,
      message: "No club members have connected Google Calendar. Connect in Profile to see suggestions.",
    });
  }

  const timeMinStr = tMin.toISOString();
  const timeMaxStr = tMax.toISOString();
  const busyByUser = await Promise.all(
    memberConnections.map(async (mc) => {
      const { busy } = await fetchFreeBusy(mc.connection, timeMinStr, timeMaxStr);
      return { userId: mc.userId, busy };
    })
  );

  const slotDurationMs = durationMinutes * 60 * 1000;
  const stepMs = SLOT_STEP_MINUTES * 60 * 1000;
  const slots: { start: string; end: string; freeCount: number; totalConnected: number }[] = [];

  let windowStartMinutes: number | null = null;
  let windowEndMinutes: number | null = null;
  if (startTimeOfDay && endTimeOfDay) {
    const parseHHmm = (s: string) => {
      const [h, m] = s.trim().split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return (h ?? 0) * 60 + (m ?? 0);
    };
    const offset = offsetMinutes != null ? parseInt(offsetMinutes, 10) : 0;
    const startM = parseHHmm(startTimeOfDay);
    const endM = parseHHmm(endTimeOfDay);
    if (startM != null && endM != null && endM > startM) {
      let startUtc = startM + (Number.isNaN(offset) ? 0 : offset);
      let endUtc = endM + (Number.isNaN(offset) ? 0 : offset);
      while (startUtc >= 24 * 60) startUtc -= 24 * 60;
      while (startUtc < 0) startUtc += 24 * 60;
      while (endUtc > 24 * 60) endUtc -= 24 * 60;
      while (endUtc <= 0) endUtc += 24 * 60;
      if (endUtc > startUtc) {
        windowStartMinutes = startUtc;
        windowEndMinutes = endUtc;
      }
    }
  }

  for (let startMs = tMin.getTime(); startMs + slotDurationMs <= tMax.getTime(); startMs += stepMs) {
    if (windowStartMinutes != null && windowEndMinutes != null) {
      const d = new Date(startMs);
      const dayStartMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
      const minutesIntoDay = (startMs - dayStartMs) / (60 * 1000);
      const endMs = startMs + slotDurationMs;
      const endMinutesIntoDay = (endMs - dayStartMs) / (60 * 1000);
      if (minutesIntoDay < windowStartMinutes || endMinutesIntoDay > windowEndMinutes) continue;
    }
    const endMs = startMs + slotDurationMs;
    let freeCount = 0;
    for (let i = 0; i < memberConnections.length; i++) {
      const { busy } = busyByUser[i]!;
      if (!slotOverlapsBusy(startMs, endMs, busy)) freeCount++;
    }
    slots.push({
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      freeCount,
      totalConnected: memberConnections.length,
    });
  }

  slots.sort((a, b) => b.freeCount - a.freeCount);

  return NextResponse.json({
    slots: slots.slice(0, 20),
    totalConnected: memberConnections.length,
  });
}
