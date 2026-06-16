import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, readSessionFromCookieHeader } from "./lib/session";

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const session = await readSessionFromCookieHeader(request.headers.get("cookie"));
  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
