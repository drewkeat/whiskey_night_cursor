"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { Whiskey } from "@prisma/client";

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeString(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

export function EditNightForm({
  nightId,
  initialTitle,
  initialNotes,
  initialLocation,
  initialStartTime,
  initialEndTime,
  initialWhiskeyId,
  whiskeys,
  clubId,
  className = "",
}: {
  nightId: string;
  initialTitle: string | null;
  initialNotes: string | null;
  initialLocation: string | null;
  initialStartTime: Date;
  initialEndTime: Date;
  initialWhiskeyId: string | null;
  whiskeys: Whiskey[];
  clubId: string;
  className?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [startDate, setStartDate] = useState(toLocalDateString(initialStartTime));
  const [startTime, setStartTime] = useState(toLocalTimeString(initialStartTime));
  const [endDate, setEndDate] = useState(toLocalDateString(initialEndTime));
  const [endTime, setEndTime] = useState(toLocalTimeString(initialEndTime));
  const [whiskeyId, setWhiskeyId] = useState<string>(initialWhiskeyId ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError("Invalid date or time");
      setSubmitting(false);
      return;
    }
    if (end <= start) {
      setError("End must be after start");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`/api/nights/${nightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          notes: notes.trim() || null,
          location: location.trim() || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          whiskeyId: whiskeyId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update event");
        return;
      }
      router.push(`/nights/${nightId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="edit-title" className="mb-1 block text-sm font-medium text-stone-700">
          Title (optional)
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Monthly tasting"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Whiskey</label>
        <select
          value={whiskeyId}
          onChange={(e) => setWhiskeyId(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">None / add later</option>
          {whiskeys.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.distillery ? `(${w.distillery})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="edit-location" className="mb-1 block text-sm font-medium text-stone-700">
          Location (optional)
        </label>
        <input
          id="edit-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. 123 Main St, City"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-stone-700">Start</label>
          <div className="flex min-w-0 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-28 shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-stone-700">End</label>
          <div className="flex min-w-0 gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-28 shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="edit-notes" className="mb-1 block text-sm font-medium text-stone-700">
          Notes (optional)
        </label>
        <textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/nights/${nightId}`}
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
        <Link
          href={`/clubs/${clubId}`}
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Back to club
        </Link>
      </div>
    </form>
  );
}
