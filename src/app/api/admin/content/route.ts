import { NextResponse, type NextRequest } from "next/server";
import { getGroupedContent, updateEntries, type ContentUpdate } from "../../../../lib/content";

export const runtime = "nodejs";

/** GET /api/admin/content — editable page content, grouped into per-page tabs (EN + FR). */
export async function GET() {
  try {
    const tabs = await getGroupedContent();
    return NextResponse.json({ ok: true, tabs });
  } catch (err) {
    console.error("[admin/content] read failed:", err);
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }
}

/** PUT /api/admin/content — apply { updates: [{ key, en?, fr? }] }. EN → page HTML, FR → fr.json. */
export async function PUT(req: NextRequest) {
  let body: { updates?: unknown };
  try {
    body = (await req.json()) as { updates?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(body.updates)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const updates: ContentUpdate[] = body.updates
    .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
    .map((u) => ({
      key: String((u as { key?: unknown }).key ?? ""),
      en: typeof u.en === "string" ? u.en : undefined,
      fr: typeof u.fr === "string" ? u.fr : undefined,
    }))
    .filter((u) => u.key);

  try {
    const tabs = await updateEntries(updates);
    console.log(`[admin/content] updated ${updates.length} field(s)`);
    return NextResponse.json({ ok: true, tabs });
  } catch (err) {
    console.error("[admin/content] write failed:", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }
}
