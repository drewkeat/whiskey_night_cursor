import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteAcceptClient } from "./InviteAcceptClient";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, session] = await Promise.all([
    prisma.clubInvite.findUnique({
      where: { inviteToken: token, status: "pending" },
      include: {
        club: { select: { id: true, name: true } },
        inviter: { select: { name: true } },
      },
    }),
    getServerSession(authOptions),
  ]);
  if (!invite) notFound();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();
  const inviteeEmail = invite.inviteeEmail.trim().toLowerCase();
  const isInvitedUser = sessionEmail === inviteeEmail;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50/30 px-4">
      <InviteAcceptClient
        invite={{
          id: invite.id,
          clubName: invite.club.name,
          clubId: invite.club.id,
          inviterName: invite.inviter.name,
          inviteeEmail: invite.inviteeEmail,
        }}
        inviteToken={token}
        isLoggedIn={!!session?.user?.id}
        isInvitedUser={isInvitedUser}
      />
    </div>
  );
}
