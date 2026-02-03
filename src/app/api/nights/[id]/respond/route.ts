import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({ status: z.enum(["accepted", "declined"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: nightId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const attendance = await prisma.whiskeyNightAttendee.findFirst({
    where: { whiskeyNightId: nightId, userId: session.user.id },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Not invited" }, { status: 404 });
  }

  await prisma.whiskeyNightAttendee.update({
    where: { id: attendance.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
