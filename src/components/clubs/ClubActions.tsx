"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClubActions({ clubId, isAdmin }: { clubId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!confirm("Leave this club? You can rejoin if invited again.")) return;
    setLeaving(true);
    const res = await fetch(`/api/clubs/${clubId}/leave`, { method: "POST" });
    setLeaving(false);
    if (res.ok) {
      router.push("/clubs");
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      {isAdmin && (
        <Link
          href={`/clubs/${clubId}/edit`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Edit
        </Link>
      )}
      <button
        type="button"
        onClick={handleLeave}
        disabled={leaving}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {leaving ? "Leaving…" : "Leave club"}
      </button>
    </div>
  );
}
