import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
