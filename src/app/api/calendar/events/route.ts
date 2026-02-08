import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCalendarEvents } from "@/lib/google-calendar";
import type { CalendarConnectionWithTokens } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
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

  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "google" } },
  });
  if (!connection) {
    return NextResponse.json({
      events: [],
      connected: false,
      message: "Connect Google Calendar in Profile to see your events here.",
    });
  }

  const events = await listCalendarEvents(
    connection as CalendarConnectionWithTokens,
    timeMin,
    timeMax
  );
  return NextResponse.json({ events, connected: true });
}
