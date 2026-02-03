"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const TYPES = ["bourbon", "scotch", "irish", "rye", "japanese", "other"];

export function AddWhiskeyForm({ className = "", initialName = "" }: { className?: string; initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [distillery, setDistillery] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/whiskeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        distillery: distillery || undefined,
        type: type || undefined,
        region: region || undefined,
        abv: abv ? parseFloat(abv) : undefined,
        imageUrl: imageUrl || undefined,
        source: "manual",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.name?.[0] ?? "Failed to add whiskey");
      return;
    }
    router.push(`/whiskeys/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="distillery" className="mb-1 block text-sm font-medium text-stone-700">
          Distillery
        </label>
        <input
          id="distillery"
          type="text"
          value={distillery}
          onChange={(e) => setDistillery(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="type" className="mb-1 block text-sm font-medium text-stone-700">
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Select</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="region" className="mb-1 block text-sm font-medium text-stone-700">
          Region
        </label>
        <input
          id="region"
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="abv" className="mb-1 block text-sm font-medium text-stone-700">
          ABV %
        </label>
        <input
          id="abv"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium text-stone-700">
          Image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Add whiskey
        </button>
        <Link
          href="/whiskeys"
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
