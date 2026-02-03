"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function AddToLibraryButton({
  whiskeyId,
  alreadyInLibrary,
}: {
  whiskeyId: string;
  alreadyInLibrary: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (alreadyInLibrary) {
    return (
      <Link
        href="/library"
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        In my library
      </Link>
    );
  }

  async function handleAdd() {
    setLoading(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whiskeyId }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading}
      className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
    >
      {loading ? "Adding…" : "Add to my library"}
    </button>
  );
}
