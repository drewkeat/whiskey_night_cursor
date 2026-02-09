import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvitationList } from "@/components/clubs/InvitationList";

export default async function ClubInvitationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userEmail = session.user.email?.trim().toLowerCase();
  const invites = await prisma.clubInvite.findMany({
    where: {
      status: "pending",
      OR: [
        { inviteeId: session.user.id },
        ...(userEmail ? [{ inviteeEmail: userEmail, inviteeId: null }] : []),
      ],
    },
    include: {
      club: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Club invitations</h1>
      <p className="mt-1 text-stone-600">
        Accept or decline invitations to join clubs.
      </p>
      <InvitationList invites={invites} className="mt-6" />
    </div>
  );
}
