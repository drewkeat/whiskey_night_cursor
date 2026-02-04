"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type Invite = {
  id: string;
  club: { id: string; name: string };
  inviter: { id: string; name: string | null; email: string | null };
  status: string;
};

export function InvitationList({
  invites,
  className = "",
}: {
  invites: Invite[];
  className?: string;
}) {
  const router = useRouter();
  const [responding, setResponding] = useState<string | null>(null);

  async function handleRespond(inviteId: string, action: "accept" | "decline") {
    setResponding(inviteId);
    try {
      const res = await fetch(`/api/clubs/invitations/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (action === "accept" && data.clubId) {
          router.push(`/clubs/${data.clubId}`);
        } else {
          router.refresh();
        }
        return;
      }
      setResponding(null);
    } catch {
      setResponding(null);
    }
  }

  if (invites.length === 0) {
    return (
      <div className={`rounded-xl border border-amber-200/60 bg-amber-50/30 p-6 ${className}`}>
        <p className="text-stone-600">You have no pending club invitations.</p>
        <Link href="/clubs" className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline">
          View my clubs
        </Link>
      </div>
    );
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {invites.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-medium text-amber-950">{inv.club.name}</p>
            <p className="text-sm text-stone-600">
              Invited by {inv.inviter.name ?? inv.inviter.email ?? "Someone"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRespond(inv.id, "accept")}
              disabled={responding !== null}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {responding === inv.id ? "..." : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => handleRespond(inv.id, "decline")}
              disabled={responding !== null}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
