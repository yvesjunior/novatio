import { NextResponse, type NextRequest } from "next/server";
import { getImageKit } from "../../../../lib/imagekit";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/** Keep an SKU string safe to use as an ImageKit folder segment. */
function safeSku(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
}

// Base ImageKit folder for all site uploads. Overridable via IMAGEKIT_FOLDER.
const BASE_FOLDER = (process.env.IMAGEKIT_FOLDER || "/maisonnovatio").replace(/\/+$/, "");

/**
 * POST /api/admin/upload  (multipart form: `file`, optional `sku`)
 * Uploads the image to ImageKit and returns its CDN URL.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  const sku = safeSku((form.get("sku") ?? "").toString());
  const folder = sku ? `${BASE_FOLDER}/portfolio/${sku}` : `${BASE_FOLDER}/portfolio/_uploads`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const ik = getImageKit();
    const res = await ik.upload({
      file: buffer,
      fileName: file.name || "upload",
      folder,
      useUniqueFileName: true,
    });
    return NextResponse.json({
      ok: true,
      url: res.url,
      fileId: res.fileId,
      name: res.name,
      thumbnailUrl: res.thumbnailUrl,
    });
  } catch (err) {
    console.error("[admin/upload] failed:", err);
    const misconfigured = err instanceof Error && /env vars/.test(err.message);
    return NextResponse.json(
      { ok: false, error: misconfigured ? "server_misconfigured" : "upload_failed" },
      { status: misconfigured ? 500 : 502 },
    );
  }
}
