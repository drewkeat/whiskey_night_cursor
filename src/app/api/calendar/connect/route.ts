import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { CALENDAR_SCOPE } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(new URL("/login", base));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  const baseUrl = process.env.NEXTAUTH_URL ?? request.url.split("/api")[0] ?? "http://localhost:3000";
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL("/profile?error=calendar_not_configured", baseUrl)
    );
  }
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") ?? "/profile";
  const state = randomBytes(24).toString("base64url");
  const statePayload = JSON.stringify({
    state,
    userId: session.user.id,
    returnTo,
  });
  const stateEncoded = Buffer.from(statePayload).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", CALENDAR_SCOPE);
  url.searchParams.set("state", stateEncoded);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return NextResponse.redirect(url.toString());
}
