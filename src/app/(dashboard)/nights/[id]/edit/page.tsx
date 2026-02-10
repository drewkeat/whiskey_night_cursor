import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditNightForm } from "@/components/forms/EditNightForm";

export default async function EditNightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const [night, whiskeys] = await Promise.all([
    prisma.whiskeyNight.findUnique({
      where: { id },
      include: { club: true },
    }),
    prisma.whiskey.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!night) notFound();
  if (night.hostId !== session.user.id) {
    return (
      <div>
        <p className="text-stone-600">Only the host can edit this event.</p>
        <Link href={`/nights/${id}`} className="mt-4 inline-block text-amber-700 hover:underline">
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Edit event</h1>
      <p className="mt-1 text-stone-600">
        Update details for this whiskey night at {night.club.name}.
      </p>
      <EditNightForm
        nightId={night.id}
        initialTitle={night.title}
        initialNotes={night.notes}
        initialLocation={night.location}
        initialStartTime={night.startTime}
        initialEndTime={night.endTime}
        initialWhiskeyId={night.whiskeyId}
        whiskeys={whiskeys}
        clubId={night.clubId}
        className="mt-8 max-w-lg"
      />
    </div>
  );
}
