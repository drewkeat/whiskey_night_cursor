"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfileFormProps = {
  user: { name: string | null; email: string | null; phone: string | null };
  className?: string;
};

export function ProfileForm({ user, className = "" }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [error, setError] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError({});
    setSuccess(false);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? { _: ["Failed to update profile"] });
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  const fieldError = (field: string) => error[field]?.[0];

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-stone-700">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {fieldError("name") && (
          <p className="mt-1 text-sm text-red-600">{fieldError("name")}</p>
        )}
      </div>
      <div>
        <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-stone-700">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-stone-500">Used for sign-in and email notifications.</p>
        {fieldError("email") && (
          <p className="mt-1 text-sm text-red-600">{fieldError("email")}</p>
        )}
      </div>
      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium text-stone-700">
          Phone (for SMS)
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-stone-500">
          E.164 format. Leave blank to disable SMS notifications.
        </p>
        {fieldError("phone") && (
          <p className="mt-1 text-sm text-red-600">{fieldError("phone")}</p>
        )}
      </div>
      {error._ && <p className="text-sm text-red-600">{error._[0]}</p>}
      {success && (
        <p className="text-sm text-green-700">Profile updated.</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
