"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const TYPES = ["bourbon", "scotch", "irish", "rye", "japanese", "other"];

export type AutocompleteWhiskey = {
  name: string;
  distillery?: string;
  type?: string;
  region?: string;
  abv?: number;
  imageUrl?: string;
  flavorProfile?: string;
  tags?: string[];
};

const inputClassName =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function AddWhiskeyForm({ className = "", initialName = "" }: { className?: string; initialName?: string }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<AutocompleteWhiskey[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const [name, setName] = useState(initialName);
  const [distillery, setDistillery] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [flavorProfile, setFlavorProfile] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState("");
  const [selectedFromAutocomplete, setSelectedFromAutocomplete] = useState(false);

  const dropdownRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/whiskeys/autocomplete?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as AutocompleteWhiskey[];
      setResults(Array.isArray(data) ? data : []);
      setHighlightedIndex(-1);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    fetchAutocomplete(searchQuery);
  }, [searchQuery, fetchAutocomplete]);

  const selectResult = (w: AutocompleteWhiskey) => {
    setSelectedFromAutocomplete(true);
    setName(w.name);
    setDistillery(w.distillery ?? "");
    setType(w.type ?? "");
    setRegion(w.region ?? "");
    setAbv(w.abv != null ? String(w.abv) : "");
    setImageUrl(w.imageUrl ?? "");
    setFlavorProfile(w.flavorProfile ?? "");
    setTagsInput(w.tags?.join(", ") ?? "");
    setSearchQuery("");
    setResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showDropdown) {
      e.preventDefault();
      runSearch();
      return;
    }
    if (!showDropdown || results.length === 0) {
      if (e.key === "Escape") setShowDropdown(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < results.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < results.length) {
      e.preventDefault();
      selectResult(results[highlightedIndex]!);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      searchInputRef.current &&
      !searchInputRef.current.contains(e.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
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
        flavorProfile: flavorProfile || undefined,
        tags: tags.length > 0 ? tags : undefined,
        source: selectedFromAutocomplete ? "web_search" : "manual",
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
      <div className="relative">
        <label htmlFor="search" className="mb-1 block text-sm font-medium text-stone-700">
          Search for a whiskey (name, distillery, or bottle)
        </label>
        <div className="flex gap-2">
          <input
            ref={searchInputRef}
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="e.g. Lagavulin 16, Macallan, Michter's"
            aria-autocomplete="list"
            aria-expanded={showDropdown && results.length > 0}
            aria-controls="autocomplete-list"
            aria-activedescendant={
              highlightedIndex >= 0 && results[highlightedIndex]
                ? `autocomplete-option-${highlightedIndex}`
                : undefined
            }
            className={inputClassName}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={loading || !searchQuery || searchQuery.trim().length < 2}
            className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {showDropdown && results.length > 0 && (
          <ul
            ref={dropdownRef}
            id="autocomplete-list"
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
          >
            {results.map((w, i) => (
              <li
                key={`${w.name}-${i}`}
                id={`autocomplete-option-${i}`}
                role="option"
                aria-selected={highlightedIndex === i}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectResult(w);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  highlightedIndex === i ? "bg-amber-100" : "hover:bg-stone-50"
                }`}
              >
                <span className="font-medium text-stone-900">{w.name}</span>
                {(w.distillery || w.type || w.region) && (
                  <span className="ml-2 text-stone-600">
                    {[w.distillery, w.type, w.region].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-stone-500">Or add manually below.</p>

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
