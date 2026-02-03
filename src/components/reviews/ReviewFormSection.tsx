"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FLAVOR_AXES, REVIEW_TRAITS } from "@/lib/constants";

type Props = {
  whiskeyId: string;
  reviewableType: "event" | "personal";
  reviewableId: string;
  whiskeyName: string;
};

export function ReviewFormSection({ whiskeyId, reviewableType, reviewableId, whiskeyName }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [flavorAxes, setFlavorAxes] = useState<Record<string, number>>(
    Object.fromEntries(FLAVOR_AXES.map((a) => [a.key, 3]))
  );
  const [traits, setTraits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleTrait(t: string) {
    setTraits((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whiskeyId,
        reviewableType,
        reviewableId,
        openEndedNotes: notes || undefined,
        flavorAxes: Object.keys(flavorAxes).length ? flavorAxes : undefined,
        traits: traits.length ? traits : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit review");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-xl border border-amber-200/60 bg-white p-6">
      <h2 className="text-lg font-medium text-amber-950">Leave a review for {whiskeyName}</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-stone-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Your tasting notes..."
          />
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-stone-700">Flavor (1–5)</span>
          <div className="space-y-3">
            {FLAVOR_AXES.map((axis) => (
              <div key={axis.key} className="flex items-center gap-3">
                <label className="w-40 shrink-0 text-sm text-stone-600">{axis.label}</label>
                <input
                  type="range"
                  min={axis.min}
                  max={axis.max}
                  value={flavorAxes[axis.key] ?? 3}
                  onChange={(e) =>
                    setFlavorAxes((prev) => ({ ...prev, [axis.key]: Number(e.target.value) }))
                  }
                  className="flex-1 accent-amber-600"
                />
                <span className="w-6 text-sm text-stone-500">{flavorAxes[axis.key] ?? 3}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-stone-700">Traits</span>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TRAITS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrait(t)}
                className={`rounded-full px-3 py-1 text-sm ${
                  traits.includes(t)
                    ? "bg-amber-600 text-white"
                    : "border border-stone-300 bg-white text-stone-600 hover:bg-amber-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
