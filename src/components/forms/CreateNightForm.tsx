"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { Whiskey } from "@prisma/client";

type Member = { id: string; name: string | null; email: string | null };

export function CreateNightForm({
  clubId,
  members,
  whiskeys,
  className = "",
}: {
  clubId: string;
  members: Member[];
  whiskeys: Whiskey[];
  className?: string;
}) {
  const router = useRouter();
  const [hostId, setHostId] = useState(members[0]?.id ?? "");
  const [whiskeyId, setWhiskeyId] = useState(whiskeys[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("22:00");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(members.map((m) => m.id));
  const [error, setError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<
    { start: string; end: string; freeCount: number; totalConnected: number }[]
  >([]);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [preferredWindowStart, setPreferredWindowStart] = useState("17:00");
  const [preferredWindowEnd, setPreferredWindowEnd] = useState("22:00");
  const [usePreferredWindow, setUsePreferredWindow] = useState(true);

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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
    const res = await fetch("/api/nights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubId,
        hostId,
        whiskeyId,
        title: title || undefined,
        notes: notes || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to create event");
      return;
    }
    router.push(`/nights/${data.id}`);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  async function fetchSuggestedTimes() {
    const rangeStart = startDate || today;
    const rangeEnd = endDate || (() => {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + 13);
      return d.toISOString().slice(0, 10);
    })();
    const tMin = new Date(`${rangeStart}T00:00:00`);
    const tMax = new Date(`${rangeEnd}T23:59:59`);
    if (tMax <= tMin) {
      setAvailabilityMessage("Start date must be before end date.");
      return;
    }
    setAvailabilityLoading(true);
    setAvailabilitySlots([]);
    setAvailabilityMessage(null);
    try {
      const url = new URL(`/api/clubs/${clubId}/availability`, window.location.origin);
      url.searchParams.set("timeMin", tMin.toISOString());
      url.searchParams.set("timeMax", tMax.toISOString());
      url.searchParams.set("durationMinutes", "120");
      if (usePreferredWindow && preferredWindowStart && preferredWindowEnd) {
        url.searchParams.set("startTimeOfDay", preferredWindowStart);
        url.searchParams.set("endTimeOfDay", preferredWindowEnd);
        url.searchParams.set("offsetMinutes", String(new Date().getTimezoneOffset()));
      }
      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        slots?: { start: string; end: string; freeCount: number; totalConnected: number }[];
        message?: string;
        totalConnected?: number;
      };
      if (!res.ok) {
        setAvailabilityMessage(data.message ?? "Could not load suggestions.");
        return;
      }
      setAvailabilitySlots(data.slots ?? []);
      if (data.slots?.length === 0 && data.message) setAvailabilityMessage(data.message);
    } catch {
      setAvailabilityMessage("Could not load suggestions.");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function applySlot(slot: { start: string; end: string }) {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    setStartDate(s.toISOString().slice(0, 10));
    setStartTime(s.toTimeString().slice(0, 5));
    setEndDate(e.toISOString().slice(0, 10));
    setEndTime(e.toTimeString().slice(0, 5));
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Host</label>
        <select
          value={hostId}
          onChange={(e) => setHostId(e.target.value)}
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.email ?? m.id}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Whiskey</label>
        <select
          value={whiskeyId}
          onChange={(e) => setWhiskeyId(e.target.value)}
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {whiskeys.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.distillery ? `(${w.distillery})` : ""}
            </option>
          ))}
        </select>
        {whiskeys.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            <Link href="/whiskeys/add" className="underline">Add a whiskey</Link> first.
          </p>
        )}
      </div>
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
      <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
        <p className="mb-2 text-sm font-medium text-stone-700">Find a time</p>
        <p className="mb-3 text-xs text-stone-500">
          Set start/end dates below (or leave end blank to use start), then click Suggest times to see when club members are free.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={usePreferredWindow}
              onChange={(e) => setUsePreferredWindow(e.target.checked)}
              className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            Only show times between
          </label>
          <input
            type="time"
            value={preferredWindowStart}
            onChange={(e) => setPreferredWindowStart(e.target.value)}
            className="rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <span className="text-sm text-stone-500">and</span>
          <input
            type="time"
            value={preferredWindowEnd}
            onChange={(e) => setPreferredWindowEnd(e.target.value)}
            className="rounded border border-stone-300 px-2 py-1 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <span className="text-xs text-stone-500">(your local time)</span>
        </div>
        <button
          type="button"
          onClick={fetchSuggestedTimes}
          disabled={availabilityLoading}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          {availabilityLoading ? "Loading…" : "Suggest times"}
        </button>
        {availabilityMessage && (
          <p className="mt-2 text-sm text-stone-600">{availabilityMessage}</p>
        )}
        {availabilitySlots.length > 0 && (
          <ul className="mt-3 space-y-1">
            {availabilitySlots.map((slot) => (
              <li key={slot.start}>
                <button
                  type="button"
                  onClick={() => applySlot(slot)}
                  className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-left text-sm hover:bg-stone-50"
                >
                  {new Date(slot.start).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(slot.end).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  ({slot.freeCount}/{slot.totalConnected} free)
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Start</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              required
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">End</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              required
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Invite (select members)</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-sm">
              <input
                type="checkbox"
                checked={attendeeIds.includes(m.id)}
                onChange={() => toggleAttendee(m.id)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              {m.name ?? m.email ?? m.id}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-stone-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Create event
        </button>
        <Link
          href={`/clubs/${clubId}`}
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
