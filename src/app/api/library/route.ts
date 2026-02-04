import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({ whiskeyId: z.string().min(1) });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.userWhiskeyLibrary.findMany({
    where: { userId: session.user.id },
include: {
        whiskey: true,
      },
    orderBy: { addedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid whiskeyId" }, { status: 400 });
  }
  const whiskey = await prisma.whiskey.findUnique({ where: { id: parsed.data.whiskeyId } });
  if (!whiskey) {
    return NextResponse.json({ error: "Whiskey not found" }, { status: 404 });
  }
  await prisma.userWhiskeyLibrary.upsert({
    where: {
      userId_whiskeyId: { userId: session.user.id, whiskeyId: parsed.data.whiskeyId },
    },
    create: { userId: session.user.id, whiskeyId: parsed.data.whiskeyId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const whiskeyId = searchParams.get("whiskeyId");
  if (!whiskeyId) {
    return NextResponse.json({ error: "whiskeyId required" }, { status: 400 });
  }
  await prisma.userWhiskeyLibrary.deleteMany({
    where: { userId: session.user.id, whiskeyId },
  });
  return NextResponse.json({ ok: true });
}
