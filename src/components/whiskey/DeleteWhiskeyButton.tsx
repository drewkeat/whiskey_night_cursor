"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteWhiskeyButton({
  whiskeyId,
  whiskeyName,
  className = "",
}: {
  whiskeyId: string;
  whiskeyName: string;
  className?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${whiskeyName}"? This will remove it from the catalog. Nights that used this whiskey will keep the event but the whiskey link will be cleared.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/whiskeys/${whiskeyId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete whiskey");
      return;
    }
    router.push("/whiskeys");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className={`rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 ${className}`}
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
