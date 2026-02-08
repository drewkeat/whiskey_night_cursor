"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  calendar_not_configured: "Calendar is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI.",
  calendar_denied: "You declined calendar access.",
  calendar_invalid: "Invalid callback. Please try again.",
  calendar_token_failed: "Could not connect. Please try again.",
};

export function ConnectCalendarSection({
  connected,
  error,
  success,
}: {
  connected: boolean;
  error?: string;
  success?: boolean;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  const errorMessage = error ? ERROR_MESSAGES[error] ?? "Something went wrong." : null;

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar", { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="mt-6 border-t border-stone-200 pt-6">
      <dt className="text-sm font-medium text-stone-500">Google Calendar</dt>
      <dd className="mt-2">
        {connected ? (
          <div className="flex items-center gap-3">
            <span className="text-amber-950">Connected</span>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm text-stone-500 hover:text-stone-700 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <a
            href="/api/calendar/connect"
            className="font-medium text-amber-700 hover:underline"
          >
            Connect Google Calendar
          </a>
        )}
        <p className="mt-1 text-xs text-stone-500">
          Used to suggest times when scheduling club nights and to send calendar invites.
        </p>
        {success && (
          <p className="mt-2 text-sm text-green-700">Calendar connected successfully.</p>
        )}
        {errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
      </dd>
    </div>
  );
}
