import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: clubId } = await params;

  const membership = await prisma.clubMember.findFirst({
    where: { clubId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }

  const club = await prisma.club.findUnique({ where: { id: clubId }, include: { _count: { select: { members: true } } } });
  if (club?._count.members === 1) {
    return NextResponse.json({ error: "Cannot leave; you are the only member. Delete the club or add another admin first." }, { status: 400 });
  }

  await prisma.clubMember.delete({
    where: { id: membership.id },
  });
  return NextResponse.json({ ok: true });
}
