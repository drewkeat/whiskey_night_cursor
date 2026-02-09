import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClubActions } from "@/components/clubs/ClubActions";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const membership = await prisma.clubMember.findFirst({
    where: { clubId: id, userId: session.user.id },
    include: {
      club: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          invitations: {
            where: { status: "pending" },
            include: { invitee: { select: { id: true, name: true, email: true } } },
          },
          nights: {
            include: {
              whiskey: true,
              host: { select: { name: true, email: true } },
            },
            orderBy: { startTime: "desc" },
            take: 20,
          },
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!membership) notFound();

  const club = membership.club;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-amber-950">{club.name}</h1>
          {club.description && <p className="mt-1 text-stone-600">{club.description}</p>}
          <p className="mt-2 text-sm text-stone-500">{club._count.members} members</p>
        </div>
        <ClubActions clubId={club.id} isAdmin={membership.role === "admin"} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-amber-950">Members</h2>
          {membership.role === "admin" && (
            <Link
              href={`/clubs/${club.id}/invite`}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              Invite member
            </Link>
          )}
        </div>
        <ul className="mt-3 space-y-2">
          {club.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-white px-4 py-2">
              <span className="font-medium text-stone-800">{m.user.name ?? m.user.email}</span>
              <span className="text-sm text-amber-700">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {membership.role === "admin" && club.invitations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-amber-950">Pending invitations</h2>
          <p className="mt-1 text-sm text-stone-500">Waiting for these people to accept.</p>
          <ul className="mt-3 space-y-2">
            {club.invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center rounded-lg border border-amber-200/60 bg-amber-50/30 px-4 py-2"
              >
                <span className="text-stone-700">{inv.invitee?.name ?? inv.invitee?.email ?? inv.inviteeEmail}</span>
                <span className="ml-2 text-sm text-stone-500">pending</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-amber-950">Whiskey Nights</h2>
          <Link
            href={`/clubs/${club.id}/nights/new`}
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            Schedule Whiskey Night
          </Link>
        </div>
        {club.nights.length === 0 ? (
          <p className="mt-3 text-stone-500">No whiskey nights yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {club.nights.map((night) => (
              <li key={night.id}>
                <Link
                  href={`/nights/${night.id}`}
                  className="block rounded-lg border border-amber-200/60 bg-white px-4 py-3 hover:border-amber-300"
                >
                  <span className="font-medium text-amber-950">
                    {night.title ?? (night.whiskey?.name ?? "Whiskey night")}
                  </span>
                  <span className="ml-2 text-sm text-stone-500">
                    {night.startTime.toLocaleString()} · Host: {night.host.name ?? night.host.email}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
