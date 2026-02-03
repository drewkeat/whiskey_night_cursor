import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddToLibraryButton } from "@/components/whiskey/AddToLibraryButton";

export default async function WhiskeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const whiskey = await prisma.whiskey.findUnique({
    where: { id },
    include: {
      reviews: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          flavorAxes: true,
          traits: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!whiskey) notFound();

  const inLibrary = session?.user?.id
    ? await prisma.userWhiskeyLibrary.findUnique({
        where: { userId_whiskeyId: { userId: session.user.id, whiskeyId: id } },
      })
    : null;

  const avgAxes = whiskey.reviews.length
    ? (() => {
        const keys = new Set<string>();
        whiskey.reviews.forEach((r) => r.flavorAxes.forEach((a) => keys.add(a.axisKey)));
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};
        keys.forEach((k) => {
          sums[k] = 0;
          counts[k] = 0;
        });
        whiskey.reviews.forEach((r) =>
          r.flavorAxes.forEach((a) => {
            sums[a.axisKey] += a.value;
            counts[a.axisKey]++;
          })
        );
        return Object.fromEntries(
          Object.keys(sums).map((k) => [k, (sums[k] / counts[k]).toFixed(1)])
        );
      })()
    : null;

  const topTraits = (() => {
    const m: Record<string, number> = {};
    whiskey.reviews.forEach((r) =>
      r.traits.forEach((t) => {
        m[t.traitKey] = (m[t.traitKey] ?? 0) + 1;
      })
    );
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
  })();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-amber-950">{whiskey.name}</h1>
          {whiskey.distillery && (
            <p className="mt-1 text-stone-600">{whiskey.distillery}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-500">
            {whiskey.type && <span className="rounded bg-amber-100 px-2 py-0.5">{whiskey.type}</span>}
            {whiskey.region && <span>{whiskey.region}</span>}
            {whiskey.abv != null && <span>{whiskey.abv}% ABV</span>}
          </div>
        </div>
        {session?.user?.id && (
          <AddToLibraryButton whiskeyId={whiskey.id} alreadyInLibrary={!!inLibrary} />
        )}
      </div>

      {whiskey.imageUrl && (
        <div className="mt-4">
          <img
            src={whiskey.imageUrl}
            alt={whiskey.name}
            className="h-48 w-32 rounded-lg object-cover"
          />
        </div>
      )}

      {(avgAxes && Object.keys(avgAxes).length > 0) || topTraits.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-amber-950">Summary</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {topTraits.map((t) => (
              <span key={t} className="rounded bg-amber-100 px-2 py-1 text-sm text-amber-900">
                {t.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          {avgAxes && Object.keys(avgAxes).length > 0 && (
            <div className="mt-3 text-sm text-stone-600">
              Average scores:{" "}
              {Object.entries(avgAxes)
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                .join(", ")}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium text-amber-950">Reviews ({whiskey.reviews.length})</h2>
        {whiskey.reviews.length === 0 ? (
          <p className="mt-2 text-stone-500">No reviews yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {whiskey.reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="font-medium">{r.user.name ?? "Anonymous"}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.openEndedNotes && (
                  <p className="mt-2 text-stone-700">{r.openEndedNotes}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.traits.map((t) => (
                    <span
                      key={t.id}
                      className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800"
                    >
                      {t.traitKey.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {r.flavorAxes.length > 0 && (
                  <div className="mt-2 text-xs text-stone-500">
                    {r.flavorAxes.map((a) => `${a.axisKey.replace(/_/g, " ")}: ${a.value}`).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
