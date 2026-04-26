import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "oche_session";

// Fast first-line filter: redirect unauthenticated requests to /login.
// Full session validation (DB check) happens in app/(app)/layout.tsx.
export function middleware(request: NextRequest) {
  // Root path is the landing page — accessible without a session
  if (request.nextUrl.pathname === "/") return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except /login, /api/auth/*, /_next/*, and static files
    "/((?!login$|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
