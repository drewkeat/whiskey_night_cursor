import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/register"];
const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const path = request.nextUrl.pathname;
  const isApiAuth = path.startsWith("/api/auth");
  const isPublic = publicPaths.some((p) => p === path) || isApiAuth;
  const isAuthPage = authPaths.some((p) => path.startsWith(p));

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isPublic && !path.startsWith("/api/auth") && !token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
