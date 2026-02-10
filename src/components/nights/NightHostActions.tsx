"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NightHostActions({ nightId, clubId }: { nightId: string; clubId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this whiskey night? Invites and responses will be removed. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/nights/${nightId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/clubs/${clubId}`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete event");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/nights/${nightId}/edit`}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
