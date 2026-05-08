import { NextResponse, type NextRequest } from "next/server";

// Next.js reserves `/404` for its built-in not-found page (prerendered at build
// time and served from the static cache). Rewrites in next.config.ts are
// bypassed for that prerendered cache hit, so we use middleware here, which
// runs before cache lookup and short-circuits the prerender.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/404") {
    return NextResponse.rewrite(new URL("/error-404/", req.url));
  }
}

export const config = {
  matcher: ["/404"],
};
