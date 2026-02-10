import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export type CalendarConnectionWithTokens = {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
};

/**
 * Ensures the connection has a valid access token; refreshes if expired.
 * Returns the access token or null if refresh failed.
 */
export async function getValidAccessToken(
  connection: CalendarConnectionWithTokens
): Promise<string | null> {
  const now = new Date();
  if (connection.expiresAt > now) {
    return connection.accessToken;
  }
  if (!connection.refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({
    refresh_token: connection.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token ?? connection.accessToken,
        expiresAt: newExpiresAt,
      },
    });
    return credentials.access_token ?? null;
  } catch {
    return null;
  }
}

const FREEBUSY_MAX_CALENDARS = 50;

/**
 * List calendar IDs the user can see (primary + all from calendar list), up to FREEBUSY_MAX_CALENDARS.
 */
async function listCalendarIds(calendar: ReturnType<typeof google.calendar>): Promise<string[]> {
  const ids = new Set<string>(["primary"]);
  try {
    const list = await calendar.calendarList.list({ maxResults: 250 });
    const items = list.data.items ?? [];
    for (const item of items) {
      if (item.id && ids.size < FREEBUSY_MAX_CALENDARS) ids.add(item.id);
    }
  } catch {
    return ["primary"];
  }
  return Array.from(ids);
}

/**
 * Fetch free/busy for all of the user's calendars over [timeMin, timeMax].
 * Uses calendarList.list then freebusy.query; merges busy periods from every calendar.
 */
export async function fetchFreeBusy(
  connection: CalendarConnectionWithTokens,
  timeMin: string,
  timeMax: string
): Promise<{ busy: { start: string; end: string }[] }> {
  const token = await getValidAccessToken(connection);
  if (!token) return { busy: [] };

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const calendarIds = await listCalendarIds(calendar);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: calendarIds.map((id) => ({ id })),
    },
  });

  const busy: { start: string; end: string }[] = [];
  const calendars = res.data.calendars ?? {};
  for (const cal of Object.values(calendars)) {
    for (const b of cal.busy ?? []) {
      if (b.start && b.end) busy.push({ start: b.start, end: b.end });
    }
  }
  return { busy };
}

export type CalendarEventItem = {
  summary: string;
  start: string; // ISO
  end: string;
};

/**
 * List calendar events for the current user's primary calendar in [timeMin, timeMax].
 * Returns event summary and start/end for display alongside suggested times.
 */
export async function listCalendarEvents(
  connection: CalendarConnectionWithTokens,
  timeMin: string,
  timeMax: string
): Promise<CalendarEventItem[]> {
  const token = await getValidAccessToken(connection);
  if (!token) return [];

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const items: CalendarEventItem[] = [];
  for (const ev of res.data.items ?? []) {
    const start = ev.start?.dateTime ?? ev.start?.date;
    const end = ev.end?.dateTime ?? ev.end?.date;
    if (start && end) {
      items.push({
        summary: ev.summary ?? "(No title)",
        start,
        end,
      });
    }
  }
  return items;
}

/**
 * Create a calendar event on the host's primary calendar with attendees.
 * Returns the Google event id or null.
 */
export async function createCalendarEvent(
  connection: CalendarConnectionWithTokens,
  params: {
    summary: string;
    description?: string;
    location?: string;
    start: string; // RFC3339
    end: string;
    attendeeEmails: string[];
  }
): Promise<string | null> {
  const token = await getValidAccessToken(connection);
  if (!token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: params.summary,
      description: params.description ?? undefined,
      location: params.location ?? undefined,
      start: { dateTime: params.start, timeZone: "UTC" },
      end: { dateTime: params.end, timeZone: "UTC" },
      attendees: params.attendeeEmails.filter(Boolean).map((email) => ({ email })),
    },
  });

  return event.data.id ?? null;
}

/**
 * Update an existing calendar event on the host's primary calendar.
 */
export async function updateCalendarEvent(
  connection: CalendarConnectionWithTokens,
  eventId: string,
  params: {
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    attendeeEmails: string[];
  }
): Promise<void> {
  const token = await getValidAccessToken(connection);
  if (!token) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      summary: params.summary,
      description: params.description ?? undefined,
      location: params.location ?? undefined,
      start: { dateTime: params.start, timeZone: "UTC" },
      end: { dateTime: params.end, timeZone: "UTC" },
      attendees: params.attendeeEmails.filter(Boolean).map((email) => ({ email })),
    },
  });
}

/**
 * Delete a calendar event from the host's primary calendar.
 */
export async function deleteCalendarEvent(
  connection: CalendarConnectionWithTokens,
  eventId: string
): Promise<void> {
  const token = await getValidAccessToken(connection);
  if (!token) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

export { CALENDAR_SCOPE };
