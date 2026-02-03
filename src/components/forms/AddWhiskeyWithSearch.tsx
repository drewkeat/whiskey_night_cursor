"use client";

import { useState } from "react";
import { AddWhiskeyForm } from "./AddWhiskeyForm";

type SearchResult = { title: string; snippet: string; link: string };

export function AddWhiskeyWithSearch({ className = "" }: { className?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `/api/whiskeys/search-web?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  function addFromSearch(name: string) {
    setPrefillName(name);
    setShowForm(true);
  }

  if (showForm) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="mb-4 text-sm text-amber-700 hover:underline"
        >
          ← Back to search
        </button>
        <AddWhiskeyForm className="" initialName={prefillName} />
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a whiskey (e.g. Lagavulin 16)"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search web"}
        </button>
      </form>
      {results.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-stone-700">Search results (add manually using details below)</p>
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 text-sm"
              >
                <div className="font-medium text-amber-950">{r.title}</div>
                {r.snippet && <p className="mt-1 text-stone-600">{r.snippet}</p>}
                <button
                  type="button"
                  onClick={() => addFromSearch(searchQuery.trim())}
                  className="mt-2 text-amber-700 hover:underline"
                >
                  Add whiskey manually (use &quot;{searchQuery.trim()}&quot; as name)
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8 border-t border-stone-200 pt-6">
        <p className="text-sm font-medium text-stone-700">Or add without searching</p>
        <button
          type="button"
          onClick={() => { setPrefillName(""); setShowForm(true); }}
          className="mt-2 text-amber-700 hover:underline"
        >
          Add whiskey manually
        </button>
      </div>
    </div>
  );
}
