import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateNightForm } from "@/components/forms/CreateNightForm";

export default async function NewNightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id: clubId } = await params;
  const [club, whiskeys] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.whiskey.findMany({ orderBy: { name: "asc" } }),
  ]);

  const membership = club?.members.find((m) => m.userId === session.user.id);
  if (!club || !membership) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Schedule Whiskey Night</h1>
      <p className="mt-1 text-stone-600">Create an event for {club.name}.</p>
      <CreateNightForm
        clubId={clubId}
        members={club.members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email ?? m.user.id, email: m.user.email }))}
        whiskeys={whiskeys}
        className="mt-8 max-w-lg"
      />
    </div>
  );
}
