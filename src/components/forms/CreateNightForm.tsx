"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Whiskey } from "@prisma/client";

type Member = { id: string; name: string | null; email: string | null };

function cellOverlaps(startMs: number, endMs: number, cellStart: number, cellEnd: number): boolean {
  return startMs < cellEnd && endMs > cellStart;
}

function CalendarAlignmentGrid({
  timeMin,
  timeMax,
  slots,
  userEvents,
  calendarConnected,
}: {
  timeMin: string;
  timeMax: string;
  slots: { start: string; end: string }[];
  userEvents: { summary: string; start: string; end: string }[];
  calendarConnected: boolean;
}) {
  const { days, hourLabels } = useMemo(() => {
    const tMin = new Date(timeMin);
    const tMax = new Date(timeMax);
    const days: { label: string; date: Date }[] = [];
    const d = new Date(tMin.getFullYear(), tMin.getMonth(), tMin.getDate());
    const endDate = new Date(tMax.getFullYear(), tMax.getMonth(), tMax.getDate());
    while (d <= endDate && days.length < 8) {
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" }),
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      });
      d.setDate(d.getDate() + 1);
    }
    const hourLabels: number[] = [];
    for (let h = 8; h <= 22; h++) hourLabels.push(h);
    return { days, hourLabels };
  }, [timeMin, timeMax]);

  const grid = useMemo(() => {
    const result: { userBusy: boolean; suggested: boolean }[][] = [];
    for (const hour of hourLabels) {
      const row: { userBusy: boolean; suggested: boolean }[] = [];
      for (const day of days) {
        const cellStart = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour, 0, 0).getTime();
        const cellEnd = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour + 1, 0, 0).getTime();
        const userBusy = userEvents.some(
          (ev) => cellOverlaps(new Date(ev.start).getTime(), new Date(ev.end).getTime(), cellStart, cellEnd)
        );
        const suggested = slots.some(
          (s) => cellOverlaps(new Date(s.start).getTime(), new Date(s.end).getTime(), cellStart, cellEnd)
        );
        row.push({ userBusy, suggested });
      }
      result.push(row);
    }
    return result;
  }, [days, hourLabels, slots, userEvents]);

  if (days.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      {!calendarConnected && (
        <p className="border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Connect Google Calendar in Profile to see your events on this grid.
        </p>
      )}
      <div className="flex min-w-0">
        <div className="sticky left-0 z-10 flex shrink-0 flex-col border-r border-stone-200 bg-stone-50/80">
          <div className="h-8 shrink-0" />
          {hourLabels.map((h) => (
            <div
              key={h}
              className="flex h-6 items-center px-2 text-xs text-stone-500"
              style={{ minHeight: 24 }}
            >
              {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex border-b border-stone-200">
            {days.map((day) => (
              <div
                key={day.label}
                className="min-w-[52px] shrink-0 px-1 py-1.5 text-center text-xs font-medium text-stone-600"
              >
                {day.label}
              </div>
            ))}
          </div>
          {hourLabels.map((h, rowIdx) => (
            <div key={h} className="flex">
              {days.map((_, colIdx) => {
                const cell = grid[rowIdx]?.[colIdx];
                if (!cell) return null;
                const { userBusy, suggested } = cell;
                let bg = "bg-white";
                let title = "Free";
                if (userBusy && suggested) {
                  bg = "bg-amber-200/80";
                  title = "Suggested time · you have an event";
                } else if (userBusy) {
                  bg = "bg-stone-200";
                  title = "Your event";
                } else if (suggested) {
                  bg = "bg-amber-100";
                  title = "Suggested time";
                }
                return (
                  <div
                    key={colIdx}
                    className={`min-w-[52px] shrink-0 border-b border-r border-stone-100 last:border-r-0 ${bg}`}
                    style={{ minHeight: 24 }}
                    title={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-amber-100" /> Suggested time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-stone-200" /> Your calendar event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-amber-200/80" /> Overlap (suggested but you’re busy)
        </span>
      </div>
    </div>
  );
}

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
  const [whiskeyId, setWhiskeyId] = useState<string | "">(whiskeys[0]?.id ?? ""); // "" = add later
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
  const [userCalendarEvents, setUserCalendarEvents] = useState<
    { events: { summary: string; start: string; end: string }[]; connected: boolean } | null
  >(null);
  const [availabilityRange, setAvailabilityRange] = useState<{ timeMin: string; timeMax: string } | null>(null);
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
        whiskeyId: whiskeyId || null,
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

  /** Fetch suggested times and your calendar for an explicit range. Used by Suggest times and by week nav. */
  async function fetchForRange(timeMinStr: string, timeMaxStr: string) {
    setAvailabilityLoading(true);
    setAvailabilitySlots([]);
    setAvailabilityMessage(null);
    setUserCalendarEvents(null);
    setAvailabilityRange(null);
    try {
      const availUrl = new URL(`/api/clubs/${clubId}/availability`, window.location.origin);
      availUrl.searchParams.set("timeMin", timeMinStr);
      availUrl.searchParams.set("timeMax", timeMaxStr);
      availUrl.searchParams.set("durationMinutes", "120");
      if (usePreferredWindow && preferredWindowStart && preferredWindowEnd) {
        availUrl.searchParams.set("startTimeOfDay", preferredWindowStart);
        availUrl.searchParams.set("endTimeOfDay", preferredWindowEnd);
        availUrl.searchParams.set("offsetMinutes", String(new Date().getTimezoneOffset()));
      }
      const [availRes, calendarRes] = await Promise.all([
        fetch(availUrl.toString()),
        fetch(
          `/api/calendar/events?timeMin=${encodeURIComponent(timeMinStr)}&timeMax=${encodeURIComponent(timeMaxStr)}`
        ),
      ]);
      const data = (await availRes.json()) as {
        slots?: { start: string; end: string; freeCount: number; totalConnected: number }[];
        message?: string;
        totalConnected?: number;
      };
      if (!availRes.ok) {
        setAvailabilityMessage(data.message ?? "Could not load suggestions.");
        return;
      }
      setAvailabilitySlots(data.slots ?? []);
      if (data.slots?.length === 0 && data.message) setAvailabilityMessage(data.message);
      setAvailabilityRange({ timeMin: timeMinStr, timeMax: timeMaxStr });

      const calData = (await calendarRes.json()) as {
        events?: { summary: string; start: string; end: string }[];
        connected?: boolean;
        message?: string;
      };
      setUserCalendarEvents({
        events: calData.events ?? [],
        connected: calData.connected ?? false,
      });
    } catch {
      setAvailabilityMessage("Could not load suggestions.");
    } finally {
      setAvailabilityLoading(false);
    }
  }

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
    await fetchForRange(tMin.toISOString(), tMax.toISOString());
  }

  function shiftRangeByWeeks(weeks: number) {
    if (!availabilityRange) return;
    const tMin = new Date(availabilityRange.timeMin);
    const tMax = new Date(availabilityRange.timeMax);
    tMin.setDate(tMin.getDate() + 7 * weeks);
    tMax.setDate(tMax.getDate() + 7 * weeks);
    fetchForRange(tMin.toISOString(), tMax.toISOString());
  }

  function formatRangeLabel(timeMin: string, timeMax: string) {
    const start = new Date(timeMin);
    const end = new Date(timeMax);
    const sameYear = start.getFullYear() === end.getFullYear();
    return sameYear
      ? `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function applySlot(slot: { start: string; end: string }) {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    setStartDate(s.toISOString().slice(0, 10));
    setStartTime(s.toTimeString().slice(0, 5));
    setEndDate(e.toISOString().slice(0, 10));
    setEndTime(e.toTimeString().slice(0, 5));
  }

  // Build calendar grid: days from range, hours 8–22 (local). Each cell: user event overlap vs suggested slot overlap.
  const calendarGrid =
    availabilityRange && (availabilitySlots.length > 0 || (userCalendarEvents?.events?.length ?? 0) > 0) ? (
      <CalendarAlignmentGrid
        timeMin={availabilityRange.timeMin}
        timeMax={availabilityRange.timeMax}
        slots={availabilitySlots}
        userEvents={userCalendarEvents?.events ?? []}
        calendarConnected={userCalendarEvents?.connected ?? false}
      />
    ) : null;

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
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Add later</option>
          {whiskeys.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.distillery ? `(${w.distillery})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">You can pick a whiskey now or set it later from the event page.</p>
        {whiskeys.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            <Link href="/whiskeys/add" className="underline">Add a whiskey</Link> to the catalog to choose one now.
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
          Set start/end dates below (or leave end blank to use start), then click Suggest times. Use Previous week / Next week to scroll through the calendar and plan several months ahead.
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
        {availabilityRange && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-amber-50/40 px-3 py-2">
            <button
              type="button"
              onClick={() => shiftRangeByWeeks(-1)}
              disabled={availabilityLoading}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              ← Previous week
            </button>
            <span className="text-sm font-medium text-amber-900">
              {formatRangeLabel(availabilityRange.timeMin, availabilityRange.timeMax)}
            </span>
            <button
              type="button"
              onClick={() => shiftRangeByWeeks(1)}
              disabled={availabilityLoading}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Next week →
            </button>
          </div>
        )}
        {calendarGrid && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-stone-600">Your calendar vs suggested times</p>
            {calendarGrid}
          </div>
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
