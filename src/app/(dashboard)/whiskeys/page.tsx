import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParams = { q?: string; type?: string; page?: string };

export default async function WhiskeysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const { q = "", type = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limit = 20;
  const skip = (pageNum - 1) * limit;

  const where: { name?: { contains: string; mode: "insensitive" }; type?: string } = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (type) where.type = type;

  const [whiskeys, total] = await Promise.all([
    prisma.whiskey.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: { _count: { select: { reviews: true } } },
    }),
    prisma.whiskey.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const recentReviews =
    whiskeys.length === 0
      ? []
      : await prisma.review.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { whiskey: { select: { id: true, name: true } }, user: { select: { name: true } } },
        });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-950">Whiskey library</h1>
        <Link
          href="/whiskeys/add"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Add whiskey
        </Link>
      </div>
      {recentReviews.length > 0 && !q && !type && (
        <section className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/30 p-4">
          <h2 className="text-sm font-medium text-amber-950">Recently reviewed</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {recentReviews.map((r) => (
              <li key={r.id}>
                <Link href={`/whiskeys/${r.whiskey.id}`} className="text-amber-700 hover:underline">
                  {r.whiskey.name}
                </Link>
                <span className="text-stone-500"> · {r.user.name ?? "Someone"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <WhiskeyFilters currentQ={q} currentType={type} />
      {whiskeys.length === 0 ? (
        <p className="mt-8 text-stone-500">No whiskeys found. Add one or try different filters.</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whiskeys.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/whiskeys/${w.id}`}
                  className="flex gap-4 rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm hover:border-amber-300"
                >
                  {w.imageUrl ? (
                    <div className="flex h-24 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50">
                      <img
                        src={w.imageUrl}
                        alt={`Bottle of ${w.name}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-24 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-100/60 text-2xl text-amber-300"
                      aria-hidden
                    >
                      🥃
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium text-amber-950">{w.name}</h2>
                    {w.distillery && <p className="text-sm text-stone-600">{w.distillery}</p>}
                    <div className="mt-2 flex gap-2 text-xs text-stone-500">
                      {w.type && <span>{w.type}</span>}
                      {w.abv != null && <span>{w.abv}% ABV</span>}
                      <span>{w._count.reviews} reviews</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/whiskeys?${new URLSearchParams({ ...(q && { q }), ...(type && { type }), page: String(pageNum - 1) }).toString()}`}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
                >
                  Previous
                </Link>
              )}
              <span className="px-3 py-1.5 text-sm text-stone-600">
                Page {pageNum} of {totalPages}
              </span>
              {pageNum < totalPages && (
                <Link
                  href={`/whiskeys?${new URLSearchParams({ ...(q && { q }), ...(type && { type }), page: String(pageNum + 1) }).toString()}`}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WhiskeyFilters({ currentQ, currentType }: { currentQ: string; currentType: string }) {
  return (
    <form method="get" className="mt-4 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name="q"
        defaultValue={currentQ}
        placeholder="Search by name"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <select
        name="type"
        defaultValue={currentType}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">All types</option>
        <option value="bourbon">Bourbon</option>
        <option value="scotch">Scotch</option>
        <option value="irish">Irish</option>
        <option value="rye">Rye</option>
        <option value="japanese">Japanese</option>
        <option value="other">Other</option>
      </select>
      <button
        type="submit"
        className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        Filter
      </button>
    </form>
  );
}
