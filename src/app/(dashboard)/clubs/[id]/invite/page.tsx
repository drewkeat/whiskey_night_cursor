import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteMemberForm } from "@/components/forms/InviteMemberForm";

export default async function InviteMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const membership = await prisma.clubMember.findFirst({
    where: { clubId: id, userId: session.user.id, role: "admin" },
    include: { club: true },
  });
  if (!membership) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Invite member</h1>
      <p className="mt-1 text-stone-600">Add someone to {membership.club.name} by email.</p>
      <InviteMemberForm clubId={id} className="mt-8 max-w-md" />
    </div>
  );
}
