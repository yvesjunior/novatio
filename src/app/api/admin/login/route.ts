import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, signSession } from "../../../../lib/auth";
import { verifyCredentials } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

/**
 * POST /api/admin/login  { username, password }
 * On success sets the signed `admin_session` cookie.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { username, password } = (body as { username?: unknown; password?: unknown }) ?? {};
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  let valid: boolean;
  try {
    valid = await verifyCredentials(username, password);
  } catch (err) {
    console.error("[admin/login] misconfigured:", err);
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return res;
}
