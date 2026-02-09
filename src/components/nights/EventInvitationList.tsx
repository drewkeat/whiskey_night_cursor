"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type EventInvite = {
  id: string;
  whiskeyNightId: string;
  whiskeyNight: {
    id: string;
    title: string | null;
    startTime: string | Date;
    club: { name: string };
    whiskey: { name: string } | null;
    host: { name: string | null; email: string | null };
  };
};

export function EventInvitationList({
  invites,
  className = "",
}: {
  invites: EventInvite[];
  className?: string;
}) {
  const router = useRouter();
  const [responding, setResponding] = useState<string | null>(null);

  async function handleRespond(nightId: string, status: "accepted" | "declined") {
    setResponding(nightId);
    try {
      const res = await fetch(`/api/nights/${nightId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setResponding(null);
      if (res.ok) {
        if (status === "accepted") {
          router.push(`/nights/${nightId}`);
        } else {
          router.refresh();
        }
      }
    } catch {
      setResponding(null);
    }
  }

  if (invites.length === 0) {
    return (
      <div className={`rounded-xl border border-amber-200/60 bg-amber-50/30 p-6 ${className}`}>
        <p className="text-stone-600">You have no pending event invitations.</p>
        <Link href="/nights" className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline">
          View your nights
        </Link>
      </div>
    );
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {invites.map((att) => {
        const night = att.whiskeyNight;
        const eventName =
          night.title ||
          (night.whiskey ? `${night.whiskey.name} at ${night.club.name}` : `Whiskey night at ${night.club.name}`);
        const hostLabel = night.host.name ?? night.host.email ?? "Someone";
        return (
          <li
            key={att.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm"
          >
            <Link href={`/nights/${night.id}`} className="min-w-0 flex-1 hover:opacity-90">
              <p className="font-medium text-amber-950">{eventName}</p>
              <p className="mt-1 text-sm text-stone-600">
                {new Date(night.startTime).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · Invited by {hostLabel}
              </p>
            </Link>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleRespond(night.id, "accepted")}
                disabled={responding !== null}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {responding === night.id ? "..." : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => handleRespond(night.id, "declined")}
                disabled={responding !== null}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
