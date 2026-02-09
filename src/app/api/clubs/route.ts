import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await prisma.clubMember.findMany({
    where: { userId: session.user.id },
    include: { club: { include: { _count: { select: { members: true, nights: true } } } } },
  });
  return NextResponse.json(memberships.map((m) => ({ ...m.club, memberRole: m.role, membersCount: m.club._count.members, nightsCount: m.club._count.nights })));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, description } = parsed.data;
  const userId = session.user.id;
  // Two-step create: club first, then member (avoids nested-create FK issues with Prisma pg adapter)
  const club = await prisma.club.create({
    data: {
      name,
      description: description ?? null,
      createdById: userId,
    },
    include: { _count: { select: { members: true, nights: true } } },
  });
  await prisma.clubMember.create({
    data: { clubId: club.id, userId, role: "admin" },
  });
  return NextResponse.json(club);
}
