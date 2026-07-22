import { NextResponse } from "next/server";
import { listProducts } from "../../../lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio — public. The flat portfolio index for the /portfolio/ grid
 * (same shape the old products/_index.json had). Returns the bare array.
 */
export async function GET() {
  try {
    return NextResponse.json(await listProducts());
  } catch (err) {
    console.error("[api/portfolio] failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
