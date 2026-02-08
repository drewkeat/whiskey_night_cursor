import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateEncoded = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      new URL(`/profile?error=calendar_denied`, baseUrl)
    );
  }

  if (!code || !stateEncoded) {
    return NextResponse.redirect(new URL("/profile?error=calendar_invalid", baseUrl));
  }

  let statePayload: { state: string; userId: string; returnTo: string };
  try {
    statePayload = JSON.parse(
      Buffer.from(stateEncoded, "base64url").toString("utf8")
    );
  } catch {
    return NextResponse.redirect(new URL("/profile?error=calendar_invalid", baseUrl));
  }

  if (!session?.user?.id || session.user.id !== statePayload.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/profile?error=calendar_not_configured", baseUrl)
    );
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Google token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/profile?error=calendar_token_failed", baseUrl)
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = new Date(
    Date.now() + (tokens.expires_in ?? 3600) * 1000
  );

  await prisma.calendarConnection.upsert({
    where: {
      userId_provider: { userId: session.user.id, provider: "google" },
    },
    create: {
      userId: session.user.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt,
    },
  });

  const returnTo = statePayload.returnTo?.startsWith("/")
    ? statePayload.returnTo
    : "/profile";
  return NextResponse.redirect(new URL(returnTo + "?calendar=connected", baseUrl));
}
