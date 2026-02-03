import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: clubId } = await params;
  const membership = await prisma.clubMember.findFirst({
    where: { clubId, userId: session.user.id, role: "admin" },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ error: { email: ["No user with this email."] } }, { status: 400 });
  }
  await prisma.clubMember.create({
    data: {
      clubId,
      userId: user.id,
      role: parsed.data.role ?? "member",
    },
  });
  return NextResponse.json({ ok: true });
}
