"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Whiskey } from "@prisma/client";

export function SetWhiskeySection({
  nightId,
  whiskeys,
}: {
  nightId: string;
  whiskeys: Whiskey[];
}) {
  const router = useRouter();
  const [whiskeyId, setWhiskeyId] = useState(whiskeys[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!whiskeyId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/nights/${nightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whiskeyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to set whiskey");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (whiskeys.length === 0) {
    return (
      <p className="mt-1 text-sm text-stone-500">
        No whiskeys in the catalog yet. Add one from the <a href="/whiskeys" className="text-amber-700 underline">Whiskeys</a> page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <select
        value={whiskeyId}
        onChange={(e) => setWhiskeyId(e.target.value)}
        className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {whiskeys.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} {w.distillery ? `(${w.distillery})` : ""}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Set whiskey"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
