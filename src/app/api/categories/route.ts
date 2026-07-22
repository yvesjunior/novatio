import { NextResponse } from "next/server";
import { readCategories } from "../../../lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/categories — public. Ordered category list for the portfolio filter.
 * Returns the bare array (same shape the old products/_categories.json had).
 */
export async function GET() {
  try {
    return NextResponse.json(await readCategories());
  } catch (err) {
    console.error("[api/categories] failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
