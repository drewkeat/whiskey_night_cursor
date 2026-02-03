"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveFromLibraryButton({ whiskeyId }: { whiskeyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this whiskey from your library?")) return;
    setLoading(true);
    const res = await fetch(`/api/library?whiskeyId=${encodeURIComponent(whiskeyId)}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "…" : "Remove"}
    </button>
  );
}
