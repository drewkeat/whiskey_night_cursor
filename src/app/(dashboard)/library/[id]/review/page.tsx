import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewFormSection } from "@/components/reviews/ReviewFormSection";

export default async function LibraryReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id: libraryId } = await params;
  const entry = await prisma.userWhiskeyLibrary.findFirst({
    where: { id: libraryId, userId: session.user.id },
    include: { whiskey: true },
  });

  if (!entry) notFound();

  const existingReview = await prisma.review.findFirst({
    where: {
      userId: session.user.id,
      whiskeyId: entry.whiskeyId,
      reviewableType: "personal",
      reviewableId: entry.id,
    },
    include: { flavorAxes: true, traits: true },
  });

  return (
    <div>
      <Link href="/library" className="text-sm text-amber-700 hover:underline">
        ← My library
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">
        {existingReview ? "Your review" : "Write a review"}
      </h1>
      <p className="mt-1 text-stone-600">
        {entry.whiskey.name}
        {entry.whiskey.distillery && ` · ${entry.whiskey.distillery}`}
      </p>
      {existingReview ? (
        <div className="mt-6 rounded-xl border border-amber-200/60 bg-white p-6">
          {existingReview.openEndedNotes && (
            <p className="text-stone-700">{existingReview.openEndedNotes}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {existingReview.traits.map((t) => (
              <span
                key={t.id}
                className="rounded bg-amber-100 px-2 py-1 text-sm text-amber-900"
              >
                {t.traitKey.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          {existingReview.flavorAxes.length > 0 && (
            <div className="mt-2 text-sm text-stone-500">
              {existingReview.flavorAxes
                .map((a) => `${a.axisKey.replace(/_/g, " ")}: ${a.value}`)
                .join(", ")}
            </div>
          )}
        </div>
      ) : (
        <ReviewFormSection
          whiskeyId={entry.whiskeyId}
          reviewableType="personal"
          reviewableId={entry.id}
          whiskeyName={entry.whiskey.name}
          key={entry.id}
        />
      )}
    </div>
  );
}
