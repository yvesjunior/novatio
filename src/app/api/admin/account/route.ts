import { NextResponse, type NextRequest } from "next/server";
import { getAdminUsername, setPassword, verifyPasswordOnly } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

/** GET /api/admin/account — the logged-in admin's username. */
export async function GET() {
  return NextResponse.json({ ok: true, username: getAdminUsername() });
}

/** POST /api/admin/account — change the password { currentPassword, newPassword }. */
export async function POST(req: NextRequest) {
  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await req.json()) as { currentPassword?: unknown; newPassword?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (next.length < 8) {
    return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
  }

  let ok: boolean;
  try {
    ok = await verifyPasswordOnly(current);
  } catch (err) {
    console.error("[admin/account] misconfigured:", err);
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  await setPassword(next);
  console.log("[admin/account] password changed");
  return NextResponse.json({ ok: true });
}
