import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClubsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const memberships = await prisma.clubMember.findMany({
    where: { userId: session.user.id },
    include: {
      club: {
        include: {
          _count: { select: { members: true, nights: true } },
        },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-950">My Clubs</h1>
        <Link
          href="/clubs/new"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Create club
        </Link>
      </div>
      {memberships.length === 0 ? (
        <p className="mt-8 text-stone-500">You’re not in any clubs yet. Create one to get started.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <li key={m.club.id}>
              <Link
                href={`/clubs/${m.club.id}`}
                className="block rounded-xl border border-amber-200/60 bg-white p-5 shadow-sm hover:border-amber-300"
              >
                <h2 className="font-medium text-amber-950">{m.club.name}</h2>
                {m.club.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{m.club.description}</p>
                )}
                <div className="mt-3 flex gap-4 text-sm text-stone-500">
                  <span>{m.club._count.members} members</span>
                  <span>{m.club._count.nights} nights</span>
                </div>
                <span className="mt-2 inline-block text-xs font-medium text-amber-700">{m.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
