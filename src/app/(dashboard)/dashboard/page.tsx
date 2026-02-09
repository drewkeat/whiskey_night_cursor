import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [clubsCount, nightsCount, libraryCount, pendingClubInvites, pendingEventInvites] = await Promise.all([
    prisma.clubMember.count({ where: { userId: session.user.id } }),
    prisma.whiskeyNightAttendee.count({
      where: { userId: session.user.id, status: "accepted" },
    }),
    prisma.userWhiskeyLibrary.count({ where: { userId: session.user.id } }),
    prisma.clubInvite.count({
      where: {
        status: "pending",
        OR: [
          { inviteeId: session.user.id },
          ...(session.user.email
            ? [{ inviteeEmail: session.user.email.trim().toLowerCase(), inviteeId: null }]
            : []),
        ],
      },
    }),
    prisma.whiskeyNightAttendee.count({
      where: { userId: session.user.id, status: "invited" },
    }),
  ]);
  const pendingInvitesCount = pendingClubInvites + pendingEventInvites;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Dashboard</h1>
      <p className="mt-1 text-stone-600">Welcome back, {session.user.name ?? session.user.email}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/clubs"
          className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm hover:border-amber-300"
        >
          <h2 className="font-medium text-amber-950">Clubs</h2>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{clubsCount}</p>
          <p className="mt-1 text-sm text-stone-500">Your clubs</p>
        </Link>
        {pendingInvitesCount > 0 && (
          <Link
            href="/clubs/invitations"
            className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-6 shadow-sm hover:border-amber-500"
          >
            <h2 className="font-medium text-amber-950">Invitations</h2>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{pendingInvitesCount}</p>
            <p className="mt-1 text-sm text-stone-500">Pending invites</p>
          </Link>
        )}
        <Link
          href="/nights"
          className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm hover:border-amber-300"
        >
          <h2 className="font-medium text-amber-950">Whiskey Nights</h2>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{nightsCount}</p>
          <p className="mt-1 text-sm text-stone-500">Events you’re attending</p>
        </Link>
        <Link
          href="/library"
          className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm hover:border-amber-300"
        >
          <h2 className="font-medium text-amber-950">My Library</h2>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{libraryCount}</p>
          <p className="mt-1 text-sm text-stone-500">Whiskeys you’ve tasted</p>
        </Link>
      </div>
      <div className="mt-8">
        <Link
          href="/whiskeys"
          className="inline-block rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Browse whiskey library
        </Link>
      </div>
    </div>
  );
}
