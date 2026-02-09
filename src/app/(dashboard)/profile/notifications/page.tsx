"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Pref = { channel: string; category: string; enabled: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  event_invite: "Event invites & reminders",
  club: "Club updates",
  account: "Account (welcome, security)",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Pref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPreferences(data.preferences);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(channel: string, category: string) {
    setPreferences((prev) =>
      prev.map((p) =>
        p.channel === channel && p.category === category ? { ...p, enabled: !p.enabled } : p
      )
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
  }

  if (loading) return <p className="text-stone-600">Loading…</p>;

  const byCategory = preferences.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<string, Pref[]>
  );

  const channelLabel = (ch: string) => (ch === "sms" ? "SMS" : ch);

  return (
    <div className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm md:p-8">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm font-medium text-amber-800 hover:text-amber-900 hover:underline"
      >
        ← Profile
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900">Notification preferences</h1>
      <p className="mt-1.5 text-stone-600">
        Choose how you want to be notified (email and/or SMS).
      </p>
      <form onSubmit={handleSave} className="mt-6 max-w-md">
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, prefs]) => (
            <fieldset
              key={category}
              className="rounded-lg border border-stone-200 bg-stone-50/80 py-3 px-4"
            >
              <legend className="px-1 text-sm font-semibold text-stone-800">
                {CATEGORY_LABELS[category] ?? category}
              </legend>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {prefs.map((p) => (
                  <label
                    key={`${p.channel}-${p.category}`}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={() => toggle(p.channel, p.category)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-sm font-medium text-stone-700">
                      {channelLabel(p.channel)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
