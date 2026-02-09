"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Whiskey } from "@prisma/client";

const DEFAULT_SLOT_HOURS = 2;

type Member = { id: string; name: string | null; email: string | null };

function cellOverlaps(startMs: number, endMs: number, cellStart: number, cellEnd: number): boolean {
  return startMs < cellEnd && endMs > cellStart;
}

function cellStartMs(day: { date: Date }, hour: number): number {
  return new Date(
    day.date.getFullYear(),
    day.date.getMonth(),
    day.date.getDate(),
    hour,
    0,
    0
  ).getTime();
}

const CELL_WIDTH = 52;
const HOUR_COL_WIDTH = 40;

function CalendarAlignmentGrid({
  timeMin,
  timeMax,
  slots,
  userEvents,
  calendarConnected,
  onSelectSlot,
  selectedRange,
}: {
  timeMin: string;
  timeMax: string;
  slots: { start: string; end: string }[];
  userEvents: { summary: string; start: string; end: string }[];
  calendarConnected: boolean;
  onSelectSlot?: (slot: { start: string; end: string }) => void;
  /** When set, cells overlapping this range stay highlighted after selection */
  selectedRange?: { start: string; end: string } | null;
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

  const [dragAnchor, setDragAnchor] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ rowIdx: number; colIdx: number } | null>(null);

  const applySelection = useCallback(
    (anchor: { rowIdx: number; colIdx: number }, current: { rowIdx: number; colIdx: number }) => {
      if (!onSelectSlot || days.length === 0) return;
      const anchorDay = days[anchor.colIdx];
      const currentDay = days[current.colIdx];
      const anchorHour = hourLabels[anchor.rowIdx];
      const currentHour = hourLabels[current.rowIdx];
      const startMs = cellStartMs(anchorDay, anchorHour);
      const endMs = cellStartMs(currentDay, currentHour);
      const rangeStartMs = Math.min(startMs, endMs);
      const rangeEndMs = Math.max(startMs, endMs) + 60 * 60 * 1000;
      onSelectSlot({
        start: new Date(rangeStartMs).toISOString(),
        end: new Date(rangeEndMs).toISOString(),
      });
    },
    [days, hourLabels, onSelectSlot]
  );

  const handleCellInteraction = useCallback(
    (rowIdx: number, colIdx: number, isDrag: boolean) => {
      if (!onSelectSlot || colIdx >= days.length) return;
      const day = days[colIdx];
      const hour = hourLabels[rowIdx];
      const cellStartMsVal = cellStartMs(day, hour);
      if (isDrag && dragAnchor) {
        applySelection(dragAnchor, { rowIdx, colIdx });
        return;
      }
      const overlappingSlot = slots.find((s) => {
        const sStart = new Date(s.start).getTime();
        const sEnd = new Date(s.end).getTime();
        return cellStartMsVal >= sStart && cellStartMsVal < sEnd;
      });
      if (overlappingSlot) {
        onSelectSlot({ start: overlappingSlot.start, end: overlappingSlot.end });
        return;
      }
      const endMs = cellStartMsVal + DEFAULT_SLOT_HOURS * 60 * 60 * 1000;
      onSelectSlot({
        start: new Date(cellStartMsVal).toISOString(),
        end: new Date(endMs).toISOString(),
      });
    },
    [days, hourLabels, onSelectSlot, slots, dragAnchor, applySelection]
  );

  const handleMouseDown = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (!onSelectSlot) return;
      setDragAnchor({ rowIdx, colIdx });
      setDragCurrent({ rowIdx, colIdx });
    },
    [onSelectSlot]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragAnchor === null) return;
      const target = e.target as HTMLElement;
      const row = target.closest("[data-row]")?.getAttribute("data-row");
      const col = target.closest("[data-col]")?.getAttribute("data-col");
      if (row != null && col != null) {
        const rowIdx = parseInt(row, 10);
        const colIdx = parseInt(col, 10);
        if (!Number.isNaN(rowIdx) && !Number.isNaN(colIdx)) {
          setDragCurrent((prev) => (prev?.rowIdx === rowIdx && prev?.colIdx === colIdx ? prev : { rowIdx, colIdx }));
        }
      }
    },
    [dragAnchor]
  );

  const handleMouseUp = useCallback(() => {
    if (dragAnchor !== null && dragCurrent !== null) {
      const moved = dragAnchor.rowIdx !== dragCurrent.rowIdx || dragAnchor.colIdx !== dragCurrent.colIdx;
      if (moved) {
        applySelection(dragAnchor, dragCurrent);
      } else {
        handleCellInteraction(dragAnchor.rowIdx, dragAnchor.colIdx, false);
      }
    }
    setDragAnchor(null);
    setDragCurrent(null);
  }, [dragAnchor, dragCurrent, applySelection, handleCellInteraction]);

  useEffect(() => {
    if (dragAnchor === null) return;
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragAnchor, handleMouseUp]);

  const isInDragRange = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (dragAnchor === null || dragCurrent === null) return false;
      const rMin = Math.min(dragAnchor.rowIdx, dragCurrent.rowIdx);
      const rMax = Math.max(dragAnchor.rowIdx, dragCurrent.rowIdx);
      const cMin = Math.min(dragAnchor.colIdx, dragCurrent.colIdx);
      const cMax = Math.max(dragAnchor.colIdx, dragCurrent.colIdx);
      return rowIdx >= rMin && rowIdx <= rMax && colIdx >= cMin && colIdx <= cMax;
    },
    [dragAnchor, dragCurrent]
  );

  const isInSelectedRange = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (!selectedRange?.start || !selectedRange?.end) return false;
      const day = days[colIdx];
      if (!day) return false;
      const hour = hourLabels[rowIdx];
      const cellStart = cellStartMs(day, hour);
      const cellEnd = cellStart + 60 * 60 * 1000;
      const rangeStart = new Date(selectedRange.start).getTime();
      const rangeEnd = new Date(selectedRange.end).getTime();
      return cellOverlaps(rangeStart, rangeEnd, cellStart, cellEnd);
    },
    [days, hourLabels, selectedRange]
  );

  const gridCols = useMemo(
    () => `${HOUR_COL_WIDTH}px repeat(${days.length}, ${CELL_WIDTH}px)`,
    [days.length]
  );
  const gridRows = useMemo(
    () => `32px repeat(${hourLabels.length}, 24px)`,
    [hourLabels.length]
  );

  if (days.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      {!calendarConnected && (
        <p className="border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Connect Google Calendar in Profile to see your events on this grid.
        </p>
      )}
      <div
        className="select-none"
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gridTemplateRows: gridRows,
          minWidth: HOUR_COL_WIDTH + days.length * CELL_WIDTH,
        }}
        onMouseMove={dragAnchor !== null ? handleMouseMove : undefined}
      >
        <div className="sticky left-0 z-10 border-r border-stone-200 bg-stone-50/80" style={{ gridColumn: 1, gridRow: 1 }} />
        {days.map((day, colIdx) => (
          <div
            key={day.label}
            className="flex items-center justify-center border-b border-r border-stone-200 bg-stone-50/80 py-1.5 text-center text-xs font-medium text-stone-600"
            style={{
              gridColumn: colIdx + 2,
              gridRow: 1,
              width: CELL_WIDTH,
              minWidth: CELL_WIDTH,
            }}
          >
            {day.label}
          </div>
        ))}
        {hourLabels.map((h, rowIdx) => (
          <div
            key={`h-${h}`}
            className="sticky left-0 z-10 flex h-6 items-center border-r border-stone-200 bg-stone-50/80 px-2 text-xs text-stone-500"
            style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
          >
            {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
          </div>
        ))}
        {hourLabels.map((h, rowIdx) =>
          days.map((_, colIdx) => {
            const cell = grid[rowIdx]?.[colIdx];
            if (!cell) return null;
            const { userBusy, suggested } = cell;
            const dragging = isInDragRange(rowIdx, colIdx);
            const selected = isInSelectedRange(rowIdx, colIdx);
            let bg = "bg-white";
            let title = "Free";
            if (dragging) {
              bg = "bg-amber-500/30 ring-1 ring-amber-500/50";
              title = "Selecting…";
            } else if (selected) {
              bg = "bg-amber-400/40 ring-1 ring-amber-500/60";
              title = "Selected time";
            } else if (userBusy && suggested) {
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
                key={`${rowIdx}-${colIdx}`}
                data-row={rowIdx}
                data-col={colIdx}
                role="button"
                tabIndex={0}
                className={`cursor-pointer border-b border-r border-stone-100 last:border-r-0 ${bg} ${onSelectSlot ? "hover:opacity-90" : ""}`}
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: rowIdx + 2,
                  minHeight: 24,
                  width: CELL_WIDTH,
                  minWidth: CELL_WIDTH,
                }}
                title={title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(rowIdx, colIdx);
                }}
              />
            );
          })
        )}
      </div>
      {onSelectSlot && (
        <p className="border-t border-stone-200 bg-amber-50/50 px-3 py-1.5 text-xs text-stone-600">
          Click a time to select it (or a 2-hour block). Drag across cells to pick a range. Suggested slots are highlighted.
        </p>
      )}
      <div className="flex flex-wrap gap-4 border-t border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-amber-400/40 ring-1 ring-amber-500/60" /> Selected
        </span>
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
  const [location, setLocation] = useState("");
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
        location: location || undefined,
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

  function toLocalDateString(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function applySlot(slot: { start: string; end: string }) {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    setStartDate(toLocalDateString(s));
    setStartTime(s.toTimeString().slice(0, 5));
    setEndDate(toLocalDateString(e));
    setEndTime(e.toTimeString().slice(0, 5));
  }

  // Selected range for grid highlight (when start/end are valid and within view)
  const selectedRangeForGrid =
    startDate && startTime && endDate && endTime
      ? (() => {
          const start = new Date(`${startDate}T${startTime}`);
          const end = new Date(`${endDate}T${endTime}`);
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
          return { start: start.toISOString(), end: end.toISOString() };
        })()
      : null;

  // Build calendar grid: days from range, hours 8–22 (local). Each cell: user event overlap vs suggested slot overlap.
  const calendarGrid =
    availabilityRange && (availabilitySlots.length > 0 || (userCalendarEvents?.events?.length ?? 0) > 0) ? (
      <CalendarAlignmentGrid
        timeMin={availabilityRange.timeMin}
        timeMax={availabilityRange.timeMax}
        slots={availabilitySlots}
        userEvents={userCalendarEvents?.events ?? []}
        calendarConnected={userCalendarEvents?.connected ?? false}
        onSelectSlot={applySlot}
        selectedRange={selectedRangeForGrid}
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
      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium text-stone-700">
          Location (optional)
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. 123 Main St, City"
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
