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
  const night = await prisma.whiskeyNight.findUnique({
    where: { id },
    include: { club: true },
  });

  if (!night) notFound();
  if (night.hostId !== session.user.id) notFound();

  return (
    <div>
      <Link
        href={`/nights/${id}`}
        className="text-sm text-amber-700 hover:underline"
      >
        ← Back to event
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Edit whiskey night</h1>
      <p className="mt-1 text-stone-600">
        {night.club.name} — update details below. To change or set the whiskey, use the event page.
      </p>
      <div className="mt-6">
        <EditNightForm
          night={{
            id: night.id,
            title: night.title,
            notes: night.notes,
            location: night.location,
            startTime: night.startTime,
            endTime: night.endTime,
          }}
        />
      </div>
    </div>
  );
}
