import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySignedSession } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const isAuthed = verifySignedSession(session);

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!isAuthed) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (request.nextUrl.pathname === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
