import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "../../../../lib/db";
import { contacts, leads, newsletterSubscribers } from "../../../../lib/schema";

export const runtime = "nodejs";

const MAX_ROWS = 2000;

/** GET /api/admin/submissions?type=leads|contacts|newsletter — newest first. */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const db = getDb();
  try {
    let rows: unknown[];
    if (type === "leads") {
      rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(MAX_ROWS);
    } else if (type === "contacts") {
      rows = await db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(MAX_ROWS);
    } else if (type === "newsletter") {
      rows = await db
        .select()
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt))
        .limit(MAX_ROWS);
    } else {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("[admin/submissions] query failed:", err);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}
