import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
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
  const membership = await prisma.clubMember.findFirst({
    where: { clubId: id, userId: session.user.id },
    include: {
      club: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          nights: { include: { whiskey: true, host: { select: { name: true, email: true } } }, orderBy: { startTime: "desc" }, take: 10 },
          _count: { select: { members: true, nights: true } },
        },
      },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }
  return NextResponse.json(membership.club);
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
  const membership = await prisma.clubMember.findFirst({
    where: { clubId: id, userId: session.user.id },
  });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const club = await prisma.club.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(club);
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
  const membership = await prisma.clubMember.findFirst({
    where: { clubId: id, userId: session.user.id },
  });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.club.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
