import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/notifications";
import { buildIcsCalendar } from "@/lib/ics";

/** GET /api/nights/[id]/ics - Download .ics file to add the event to your calendar. */
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
    include: { club: true, whiskey: true, attendees: { select: { userId: true } } },
  });
  if (!night) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const canAccess = night.attendees.some((a) => a.userId === session.user.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = getBaseUrl();
  const eventName =
    night.title ??
    (night.whiskey ? `${night.whiskey.name} at ${night.club.name}` : `Whiskey night at ${night.club.name}`);
  const link = `${baseUrl}/nights/${id}`;
  const ics = buildIcsCalendar({
    eventName,
    description: `View event: ${link}`,
    startTime: night.startTime,
    endTime: night.endTime,
    nightId: id,
    baseUrl,
    location: night.location,
  });

  const filename = "whiskey-night.ics";
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
