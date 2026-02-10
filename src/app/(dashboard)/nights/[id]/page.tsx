import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventRespondButton } from "@/components/nights/EventRespondButton";
import { SetWhiskeySection } from "@/components/nights/SetWhiskeySection";
import { ReviewFormSection } from "@/components/reviews/ReviewFormSection";
import { NightHostActions } from "@/components/nights/NightHostActions";

export default async function NightDetailPage({
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
      include: {
        club: true,
        host: { select: { id: true, name: true, email: true } },
        whiskey: true,
        attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    }),
    prisma.whiskey.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!night) notFound();

  const myAttendance = night.attendees.find((a) => a.userId === session.user.id);
  if (!myAttendance) {
    return (
      <div>
        <p className="text-stone-600">You are not invited to this event.</p>
        <Link href="/nights" className="mt-4 inline-block text-amber-700 hover:underline">
          Back to your events
        </Link>
      </div>
    );
  }

  const isHost = night.hostId === session.user.id;
  const canReview =
    night.whiskey &&
    myAttendance.status === "accepted" &&
    (() => {
      const start = night.startTime;
      const end = night.endTime;
      const now = new Date();
      return now >= start && now <= end;
    })();

  const existingReview = night.whiskeyId
    ? await prisma.review.findFirst({
        where: {
          userId: session.user.id,
          whiskeyId: night.whiskeyId,
          reviewableType: "event",
          reviewableId: night.id,
        },
      })
    : null;

  const title =
    night.title ??
    (night.whiskey ? `${night.whiskey.name} at ${night.club.name}` : `Whiskey night at ${night.club.name}`);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-amber-950">
              {title}
            </h1>
            {isHost && <NightHostActions nightId={night.id} clubId={night.club.id} />}
          </div>
          <p className="mt-1 text-stone-600">
            <Link href={`/clubs/${night.club.id}`} className="text-amber-700 hover:underline">
              {night.club.name}
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-stone-500">
            <span>{night.startTime.toLocaleString()} – {night.endTime.toLocaleTimeString()}</span>
            <span>Host: {night.host.name ?? night.host.email}</span>
            {night.location && <span>Where: {night.location}</span>}
          </div>
          <div className="mt-2">
            <a
              href={`/api/nights/${night.id}/ics`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Add to calendar
            </a>
          </div>
        </div>
        <EventRespondButton
          nightId={night.id}
          currentStatus={myAttendance.status}
        />
      </div>

      <section className="mt-6 rounded-xl border border-amber-200/60 bg-white p-4">
        <h2 className="font-medium text-amber-950">Whiskey</h2>
        {night.whiskey ? (
          <>
            <Link
              href={`/whiskeys/${night.whiskey.id}`}
              className="mt-1 block text-amber-700 hover:underline"
            >
              {night.whiskey.name}
              {night.whiskey.distillery && ` · ${night.whiskey.distillery}`}
            </Link>
            {isHost && (
              <SetWhiskeySection
                nightId={night.id}
                whiskeys={whiskeys}
                currentWhiskeyId={night.whiskeyId}
              />
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-stone-500">TBD — whiskey can be set anytime before or during the event.</p>
            {isHost && (
              <SetWhiskeySection
                nightId={night.id}
                whiskeys={whiskeys}
                currentWhiskeyId={null}
              />
            )}
          </>
        )}
      </section>

      {night.notes && (
        <section className="mt-4">
          <h2 className="font-medium text-amber-950">Notes</h2>
          <p className="mt-1 text-stone-600">{night.notes}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-medium text-amber-950">Attendees</h2>
        <ul className="mt-2 space-y-1">
          {night.attendees.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.user.name ?? a.user.email}</span>
              <span
                className={
                  a.status === "accepted"
                    ? "text-green-600"
                    : a.status === "declined"
                    ? "text-red-600"
                    : "text-stone-500"
                }
              >
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {night.whiskey && canReview && !existingReview && (
        <ReviewFormSection
          whiskeyId={night.whiskey.id}
          reviewableType="event"
          reviewableId={night.id}
          whiskeyName={night.whiskey.name}
        />
      )}
      {existingReview && (
        <section className="mt-6">
          <p className="text-sm text-stone-600">You’ve already submitted a review for this event.</p>
        </section>
      )}
    </div>
  );
}
