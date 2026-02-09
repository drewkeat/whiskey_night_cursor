import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAccountWelcome } from "@/lib/notifications";

const bodySchema = z.object({
  inviteToken: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { inviteToken, name, password } = parsed.data;
    const invite = await prisma.clubInvite.findUnique({
      where: { inviteToken },
      include: { club: true },
    });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ error: "Invitation not found or expired." }, { status: 404 });
    }
    const inviteeEmail = invite.inviteeEmail.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: inviteeEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: inviteeEmail,
          name: name.trim(),
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
      notifyAccountWelcome({
        userId: user.id,
        email: user.email!,
        name: user.name,
      }).catch((err) => console.error("Welcome email failed:", err));
    }
    const existingMember = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.id, clubId: invite.clubId } },
    });
    if (!existingMember) {
      await prisma.clubMember.create({
        data: {
          clubId: invite.clubId,
          userId: user.id,
          role: invite.role,
        },
      });
    }
    await prisma.clubInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", inviteeId: user.id },
    });
    return NextResponse.json({ ok: true, clubId: invite.clubId });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to accept invitation." },
      { status: 500 }
    );
  }
}
