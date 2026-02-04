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
    return NextResponse.json({ error: { email: ["No user with this email. They need to sign up first."] } }, { status: 400 });
  }
  if (user.id === session.user.id) {
    return NextResponse.json({ error: { email: ["You can't invite yourself."] } }, { status: 400 });
  }
  const existingMember = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId: user.id, clubId } },
  });
  if (existingMember) {
    return NextResponse.json({ error: { email: ["This user is already a member."] } }, { status: 400 });
  }
  const existingInvite = await prisma.clubInvite.findUnique({
    where: { clubId_inviteeId: { clubId, inviteeId: user.id } },
  });
  if (existingInvite?.status === "pending") {
    return NextResponse.json({ error: { email: ["An invitation is already pending for this user."] } }, { status: 400 });
  }
  const role = parsed.data.role ?? "member";
  await prisma.clubInvite.upsert({
    where: { clubId_inviteeId: { clubId, inviteeId: user.id } },
    create: {
      clubId,
      inviterId: session.user.id,
      inviteeId: user.id,
      status: "pending",
      role,
    },
    update: { status: "pending", inviterId: session.user.id, role },
  });
  return NextResponse.json({ ok: true });
}
