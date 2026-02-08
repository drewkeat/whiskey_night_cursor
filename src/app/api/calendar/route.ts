import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "google" } },
    select: { id: true, provider: true },
  });
  return NextResponse.json({
    connected: !!connection,
    provider: connection?.provider ?? null,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.calendarConnection.deleteMany({
    where: { userId: session.user.id, provider: "google" },
  });
  return NextResponse.json({ ok: true });
}
