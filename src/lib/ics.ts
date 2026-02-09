function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Build an ICS file for a whiskey night (used in invite emails and for "Add to calendar" download). */
export function buildIcsCalendar(params: {
  eventName: string;
  description: string;
  startTime: Date;
  endTime: Date;
  nightId: string;
  baseUrl: string;
  location?: string | null;
}): string {
  const { eventName, description, startTime, endTime, nightId, baseUrl, location } = params;
  const uid = `whiskey-night-${nightId}@whiskeynight`;
  const link = `${baseUrl}/nights/${nightId}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Whiskey Night//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startTime)}`,
    `DTEND:${formatIcsDate(endTime)}`,
    `SUMMARY:${escapeIcsText(eventName.replace(/\n/g, " "))}`,
    `DESCRIPTION:${escapeIcsText((description || link).replace(/\n/g, " "))}`,
    `URL:${link}`,
    ...(location?.trim() ? [`LOCATION:${escapeIcsText(location.trim())}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
