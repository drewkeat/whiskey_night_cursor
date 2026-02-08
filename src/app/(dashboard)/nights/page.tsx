import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NightsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const attendances = await prisma.whiskeyNightAttendee.findMany({
    where: { userId: session.user.id },
    include: {
      whiskeyNight: {
        include: {
          club: true,
          whiskey: true,
          host: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { whiskeyNight: { startTime: "desc" } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Your Whiskey Nights</h1>
      <p className="mt-1 text-stone-600">Events you’re invited to or attending.</p>
      {attendances.length === 0 ? (
        <p className="mt-8 text-stone-500">No events yet. Join a club and get invited to a whiskey night.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {attendances.map((a) => (
            <li key={a.id}>
              <Link
                href={`/nights/${a.whiskeyNight.id}`}
                className="block rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm hover:border-amber-300"
              >
                <div className="font-medium text-amber-950">
                  {a.whiskeyNight.title || (a.whiskeyNight.whiskey ? `${a.whiskeyNight.whiskey.name} at ${a.whiskeyNight.club.name}` : `Whiskey night at ${a.whiskeyNight.club.name}`)}
                </div>
                <div className="mt-1 text-sm text-stone-500">
                  {a.whiskeyNight.startTime.toLocaleDateString()} · {a.whiskeyNight.club.name} · Your status: {a.status}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
