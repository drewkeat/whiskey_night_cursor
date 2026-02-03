import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RemoveFromLibraryButton } from "@/components/whiskey/RemoveFromLibraryButton";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const items = await prisma.userWhiskeyLibrary.findMany({
    where: { userId: session.user.id },
    include: {
      whiskey: true,
      whiskeyId: true,
    },
    orderBy: { addedAt: "desc" },
  });

  const reviewMap = new Map<string, { id: string }>();
  if (items.length > 0) {
    const reviews = await prisma.review.findMany({
      where: {
        userId: session.user.id,
        reviewableType: "personal",
        reviewableId: { in: items.map((i) => i.id) },
      },
      select: { id: true, reviewableId: true },
    });
    reviews.forEach((r) => reviewMap.set(r.reviewableId, { id: r.id }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">My whiskey library</h1>
      <p className="mt-1 text-stone-600">Whiskeys you’ve tasted and your personal reviews.</p>
      {items.length === 0 ? (
        <p className="mt-8 text-stone-500">
          Your library is empty.{" "}
          <Link href="/whiskeys" className="text-amber-700 hover:underline">
            Browse the whiskey library
          </Link>{" "}
          and add bottles you’ve tried.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => {
            const hasReview = reviewMap.has(item.id);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/whiskeys/${item.whiskey.id}`}
                    className="font-medium text-amber-950 hover:underline"
                  >
                    {item.whiskey.name}
                  </Link>
                  {item.whiskey.distillery && (
                    <p className="text-sm text-stone-600">{item.whiskey.distillery}</p>
                  )}
                  <p className="text-xs text-stone-500">Added {item.addedAt.toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasReview ? (
                    <Link
                      href={`/library/${item.id}/review`}
                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                    >
                      View review
                    </Link>
                  ) : (
                    <Link
                      href={`/library/${item.id}/review`}
                      className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
                    >
                      Write review
                    </Link>
                  )}
                  <RemoveFromLibraryButton whiskeyId={item.whiskeyId} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
