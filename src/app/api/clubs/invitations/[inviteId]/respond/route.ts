import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { inviteId } = await params;
  const body = await _request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const invite = await prisma.clubInvite.findUnique({
    where: { id: inviteId },
    include: { club: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invite.inviteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invitation already responded to" }, { status: 400 });
  }
  if (parsed.data.action === "accept") {
    const existing = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: invite.inviteeId, clubId: invite.clubId } },
    });
    if (!existing) {
      await prisma.clubMember.create({
        data: {
          clubId: invite.clubId,
          userId: invite.inviteeId,
          role: invite.role,
        },
      });
    }
    await prisma.clubInvite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    });
    return NextResponse.json({ ok: true, clubId: invite.clubId });
  }
  await prisma.clubInvite.update({
    where: { id: inviteId },
    data: { status: "declined" },
  });
  return NextResponse.json({ ok: true });
}
