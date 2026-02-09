import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvitationList } from "@/components/clubs/InvitationList";
import { EventInvitationList } from "@/components/nights/EventInvitationList";

export default async function InvitationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userEmail = session.user.email?.trim().toLowerCase();
  const [clubInvites, eventInvites] = await Promise.all([
    prisma.clubInvite.findMany({
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
    }),
    prisma.whiskeyNightAttendee.findMany({
      where: { userId: session.user.id, status: "invited" },
      include: {
        whiskeyNight: {
          include: {
            club: { select: { name: true } },
            whiskey: { select: { name: true } },
            host: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { whiskeyNight: { startTime: "asc" } },
    }),
  ]);

  const hasAny = clubInvites.length > 0 || eventInvites.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Invitations</h1>
      <p className="mt-1 text-stone-600">
        Accept or decline club and event invitations in one place.
      </p>
      {!hasAny && (
        <div className="mt-6 rounded-xl border border-amber-200/60 bg-amber-50/30 p-6">
          <p className="text-stone-600">You have no pending invitations.</p>
          <p className="mt-2 text-sm text-stone-500">
            Club invites and whiskey night invites will appear here when someone invites you.
          </p>
        </div>
      )}
      {clubInvites.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-medium text-amber-950">Club invitations</h2>
          <p className="mt-0.5 text-sm text-stone-600">Join a club</p>
          <InvitationList invites={clubInvites} className="mt-3" />
        </section>
      )}
      {eventInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-amber-950">Event invitations</h2>
          <p className="mt-0.5 text-sm text-stone-600">Whiskey nights you’re invited to</p>
          <EventInvitationList invites={eventInvites} className="mt-3" />
        </section>
      )}
    </div>
  );
}
