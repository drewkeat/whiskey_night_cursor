"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventRespondButton({
  nightId,
  currentStatus,
}: {
  nightId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (currentStatus !== "invited") {
    return (
      <span className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
        You {currentStatus} this invitation
      </span>
    );
  }

  async function respond(status: "accepted" | "declined") {
    setLoading(true);
    const res = await fetch(`/api/nights/${nightId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => respond("accepted")}
        disabled={loading}
        className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => respond("declined")}
        disabled={loading}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
