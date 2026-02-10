"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeString(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

type Night = {
  id: string;
  title: string | null;
  notes: string | null;
  location: string | null;
  startTime: Date | string;
  endTime: Date | string;
};

function parseDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

export function EditNightForm({ night }: { night: Night }) {
  const router = useRouter();
  const start = parseDate(night.startTime);
  const end = parseDate(night.endTime);
  const [title, setTitle] = useState(night.title ?? "");
  const [notes, setNotes] = useState(night.notes ?? "");
  const [location, setLocation] = useState(night.location ?? "");
  const [startDate, setStartDate] = useState(toLocalDateString(start));
  const [startTime, setStartTime] = useState(toLocalTimeString(start));
  const [endDate, setEndDate] = useState(toLocalDateString(end));
  const [endTime, setEndTime] = useState(toLocalTimeString(end));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError("Invalid date or time");
      return;
    }
    if (end <= start) {
      setError("End must be after start");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/nights/${night.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          notes: notes || null,
          location: location.trim() || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update event");
        return;
      }
      router.push(`/nights/${night.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-stone-700">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Monthly tasting"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium text-stone-700">
          Location (optional)
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. 123 Main St"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-stone-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any details for attendees"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-stone-700">
            Start
          </label>
          <div className="flex gap-2">
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-stone-700">
            End
          </label>
          <div className="flex gap-2">
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/nights/${night.id}`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
