import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email?.trim().toLowerCase();
  const invites = await prisma.clubInvite.findMany({
    where: {
      status: "pending",
      OR: [
        { inviteeId: session.user.id },
        ...(userEmail ? [{ inviteeEmail: userEmail, inviteeId: null }] : []),
      ],
    },
    include: {
      club: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}
