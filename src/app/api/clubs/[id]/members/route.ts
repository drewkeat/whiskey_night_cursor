import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { notifyClubInvite } from "@/lib/notifications";

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional(),
});

function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

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
    include: { club: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const inviteeEmail = parsed.data.email.trim().toLowerCase();
  const sessionEmail = session.user.email?.trim().toLowerCase();
  if (sessionEmail && inviteeEmail === sessionEmail) {
    return NextResponse.json({ error: { email: ["You can't invite yourself."] } }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: inviteeEmail } });
  if (user) {
    const existingMember = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.id, clubId } },
    });
    if (existingMember) {
      return NextResponse.json({ error: { email: ["This user is already a member."] } }, { status: 400 });
    }
  }
  const existingInvite = await prisma.clubInvite.findUnique({
    where: { clubId_inviteeEmail: { clubId, inviteeEmail } },
    include: { inviter: { select: { name: true } } },
  });
  if (existingInvite?.status === "pending") {
    return NextResponse.json({ error: { email: ["An invitation is already pending for this user."] } }, { status: 400 });
  }
  const role = parsed.data.role ?? "member";
  const inviteToken = generateInviteToken();
  const invite = await prisma.clubInvite.upsert({
    where: { clubId_inviteeEmail: { clubId, inviteeEmail } },
    create: {
      clubId,
      inviterId: session.user.id,
      inviteeId: user?.id ?? null,
      inviteeEmail,
      inviteToken,
      status: "pending",
      role,
    },
    update: { status: "pending", inviterId: session.user.id, role, inviteToken },
    include: { inviter: { select: { name: true } }, club: { select: { name: true } } },
  });
  notifyClubInvite({
    inviteeEmail,
    inviterName: invite.inviter.name,
    clubName: invite.club.name,
    inviteToken: invite.inviteToken!,
    inviterId: session.user.id,
  }).catch((err) => console.error("Club invite email failed:", err));
  return NextResponse.json({ ok: true });
}
