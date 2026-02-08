import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

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

async function fetchBraveSearchSnippets(q: string): Promise<string[]> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q + " whiskey")}`,
      { headers: { "X-Subscription-Token": apiKey } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: { title: string; description: string; url: string }[] };
    };
    const results = (data.web?.results ?? []).slice(0, 2);
    return results.map((r) => `${r.title}: ${r.description}`.trim());
  } catch {
    return [];
  }
}

async function fetchBraveSearchResults(q: string): Promise<AutocompleteWhiskey[]> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q + " whiskey")}`,
      { headers: { "X-Subscription-Token": apiKey } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: { title: string; description: string; url: string }[] };
    };
    const results = (data.web?.results ?? []).slice(0, 5);
    return results.map((r) => ({
      name: r.title.trim() || "Unknown",
      flavorProfile: r.description?.trim() || undefined,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const searchKey = process.env.SEARCH_API_KEY;

  if (!openaiKey) {
    if (searchKey) {
      try {
        const results = await fetchBraveSearchResults(q);
        return NextResponse.json(results);
      } catch (e) {
        console.error("Autocomplete web search error:", e);
        return NextResponse.json([]);
      }
    }
    return NextResponse.json([]);
  }

  try {
    const snippets = await fetchBraveSearchSnippets(q);
    const context =
      snippets.length > 0
        ? `\n\nOptional web context (use if relevant):\n${snippets.join("\n---\n")}`
        : "";

    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a whiskey expert. Return a JSON object with a "results" key containing an array of whiskey objects matching the user's query. Each object: name (required), distillery, type (one of: ${TYPES.join(", ")}), region, abv (number), imageUrl (direct image URL if known), flavorProfile (short tasting notes), tags (array of lowercase strings like "peated", "sherry-cask", "single-malt"). Return 3-5 results. Omit unknown fields. Respond only with valid JSON.`,
        },
        {
          role: "user",
          content: `Query: "${q}"${context}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return NextResponse.json([]);

    const parsed = JSON.parse(text) as
      | { results?: AutocompleteWhiskey[]; whiskeys?: AutocompleteWhiskey[] }
      | AutocompleteWhiskey[];
    const results: AutocompleteWhiskey[] = Array.isArray(parsed)
      ? parsed
      : parsed.results ?? parsed.whiskeys ?? [];

    const normalized = results.slice(0, 5).map((r) => ({
      name: String(r.name ?? "").trim() || "Unknown",
      distillery: r.distillery ? String(r.distillery).trim() : undefined,
      type: r.type && TYPES.includes(r.type.toLowerCase()) ? r.type.toLowerCase() : undefined,
      region: r.region ? String(r.region).trim() : undefined,
      abv: typeof r.abv === "number" ? r.abv : undefined,
      imageUrl: r.imageUrl && r.imageUrl.startsWith("http") ? r.imageUrl : undefined,
      flavorProfile: r.flavorProfile ? String(r.flavorProfile).trim() : undefined,
      tags: Array.isArray(r.tags)
        ? r.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean)
        : undefined,
    }));

    return NextResponse.json(normalized);
  } catch (e) {
    console.error("Autocomplete error:", e);
    return NextResponse.json([]);
  }
}
