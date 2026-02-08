"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { Whiskey } from "@prisma/client";

const TYPES = ["bourbon", "scotch", "irish", "rye", "japanese", "other"];

const inputClassName =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function EditWhiskeyForm({ whiskey, className = "" }: { whiskey: Whiskey; className?: string }) {
  const router = useRouter();
  const [name, setName] = useState(whiskey.name);
  const [distillery, setDistillery] = useState(whiskey.distillery ?? "");
  const [type, setType] = useState(whiskey.type ?? "");
  const [region, setRegion] = useState(whiskey.region ?? "");
  const [abv, setAbv] = useState(whiskey.abv != null ? String(whiskey.abv) : "");
  const [imageUrl, setImageUrl] = useState(whiskey.imageUrl ?? "");
  const [flavorProfile, setFlavorProfile] = useState(whiskey.flavorProfile ?? "");
  const [tagsInput, setTagsInput] = useState((whiskey.tags ?? []).join(", "));
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const res = await fetch(`/api/whiskeys/${whiskey.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        distillery: distillery || undefined,
        type: type || undefined,
        region: region || undefined,
        abv: abv ? parseFloat(abv) : undefined,
        imageUrl: imageUrl || undefined,
        flavorProfile: flavorProfile || undefined,
        tags,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.name?.[0] ?? "Failed to update whiskey");
      return;
    }
    router.push(`/whiskeys/${whiskey.id}`);
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
          className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="flavorProfile" className="mb-1 block text-sm font-medium text-stone-700">
          Flavor profile
        </label>
        <textarea
          id="flavorProfile"
          value={flavorProfile}
          onChange={(e) => setFlavorProfile(e.target.value)}
          rows={2}
          placeholder="e.g. Vanilla, oak, light smoke"
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium text-stone-700">
          Tags
        </label>
        <input
          id="tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. peated, sherry-cask, single-malt"
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Save changes
        </button>
        <Link
          href={`/whiskeys/${whiskey.id}`}
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
