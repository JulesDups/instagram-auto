import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

const PUBLIC_PREFIXES = [
  "/api/intake",
  "/api/render",
  "/api/publish",
  "/api/reject",
  "/_next",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (verifySessionCookie(cookie)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
