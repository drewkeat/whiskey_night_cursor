import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      results: [
        { title: `"${q}" – search the web for details`, snippet: "Add SEARCH_API_KEY to enable web search. You can still add this whiskey manually below.", link: "" },
      ],
    });
  }

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q + " whiskey")}`,
      {
        headers: { "X-Subscription-Token": apiKey },
      }
    );
    if (!res.ok) throw new Error("Search failed");
    const data = (await res.json()) as { web?: { results?: { title: string; description: string; url: string }[] } };
    const results = (data.web?.results ?? []).slice(0, 8).map((r) => ({
      title: r.title,
      snippet: r.description,
      link: r.url,
    }));
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ results: [] });
  }
}
