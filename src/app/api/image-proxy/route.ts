import { NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WhiskeyNight/1.0; +https://github.com/whiskey-night)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Image failed to load: ${res.status}` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL did not return an image" },
        { status: 400 }
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(buf).toString("base64");
    const dataUrl = `data:${contentType.split(";")[0]};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return NextResponse.json(
          { error: "Image request timed out" },
          { status: 408 }
        );
      }
    }
    return NextResponse.json(
      { error: "Could not fetch image" },
      { status: 400 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
