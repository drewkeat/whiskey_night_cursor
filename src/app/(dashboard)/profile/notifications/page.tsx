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

  if (loading) return <p className="text-stone-500">Loading…</p>;

  const byCategory = preferences.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<string, Pref[]>
  );

  return (
    <div>
      <Link href="/profile" className="text-sm text-amber-700 hover:underline">
        ← Profile
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Notification preferences</h1>
      <p className="mt-1 text-stone-600">Choose how you want to be notified (email and/or SMS).</p>
      <form onSubmit={handleSave} className="mt-6 max-w-md space-y-6">
        {Object.entries(byCategory).map(([category, prefs]) => (
          <fieldset key={category} className="rounded-xl border border-amber-200/60 bg-white p-4">
            <legend className="font-medium text-amber-950">
              {CATEGORY_LABELS[category] ?? category}
            </legend>
            <div className="mt-3 flex gap-6">
              {prefs.map((p) => (
                <label key={`${p.channel}-${p.category}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={() => toggle(p.channel, p.category)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm capitalize">{p.channel}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
