import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth";

// `/admin/login`, `/api/admin/login`, `/api/admin/logout` pass through
// unauthenticated (you must be able to reach the login form / clear a cookie).
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Next.js reserves `/404` for its built-in not-found page (prerendered at build
  // time and served from the static cache). Rewrites in next.config.ts are
  // bypassed for that prerendered cache hit, so we use middleware here, which
  // runs before cache lookup and short-circuits the prerender.
  if (pathname === "/404") {
    return NextResponse.rewrite(new URL("/error-404/", req.url));
  }

  // Gate the admin dashboard and its API behind a valid signed session cookie.
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) {
    if (PUBLIC_ADMIN_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (await verifySession(token)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/404", "/admin/:path*", "/api/admin/:path*"],
};
