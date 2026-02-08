import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditWhiskeyForm } from "@/components/forms/EditWhiskeyForm";

export default async function EditWhiskeyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const whiskey = await prisma.whiskey.findUnique({
    where: { id },
  });

  if (!whiskey) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/whiskeys/${id}`}
          className="text-sm text-amber-700 hover:underline"
        >
          ← Back to {whiskey.name}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-amber-950">Edit whiskey</h1>
      <p className="mt-1 text-stone-600">
        Update details for {whiskey.name}.
      </p>
      <div className="mt-6 max-w-lg">
        <EditWhiskeyForm whiskey={whiskey} />
      </div>
    </div>
  );
}
