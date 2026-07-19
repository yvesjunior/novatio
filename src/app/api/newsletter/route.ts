import type { NextRequest } from "next/server";
import { getDb } from "../../../lib/db";
import { newsletterSubscribers } from "../../../lib/schema";

/**
 * Newsletter subscription endpoint (used by the footer newsletter form on every page).
 *
 * What it does:
 *   1. Validates the POST shape {email} (basic regex; trims whitespace).
 *   2. Inserts into the `newsletter_subscribers` Postgres table. De-dupes by
 *      lowercased email via a unique index (ON CONFLICT DO NOTHING) — a repeat
 *      subscribe is a no-op but still returns a friendly success.
 *
 * What it deliberately does NOT do (for now):
 *   - No outbound email / mailing-list integration. The site just records
 *     subscribers; the list can be exported later.
 */

interface NewsletterSub {
  email: string;
  page?: string;
  referrer?: string | null;
  locale?: "en" | "fr";
  ts: string;
}

function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

async function persist(sub: NewsletterSub): Promise<{ alreadySubscribed: boolean; saved: boolean }> {
  try {
    const rows = await getDb()
      .insert(newsletterSubscribers)
      .values({
        email: sub.email,
        emailLower: sub.email.toLowerCase(),
        page: sub.page,
        referrer: sub.referrer ?? null,
        locale: sub.locale,
        createdAt: new Date(sub.ts),
      })
      .onConflictDoNothing({ target: newsletterSubscribers.emailLower })
      .returning({ id: newsletterSubscribers.id });
    // Empty result ⇒ the unique index rejected it ⇒ already subscribed.
    return { alreadySubscribed: rows.length === 0, saved: true };
  } catch (err) {
    console.error("[newsletter] write failed:", err);
    return { alreadySubscribed: false, saved: false };
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const email = (body as { email?: unknown })?.email;
  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const sub: NewsletterSub = {
    email: (email as string).trim(),
    page: (body as { page?: string })?.page,
    referrer: (body as { referrer?: string | null })?.referrer ?? null,
    locale: (body as { locale?: "en" | "fr" })?.locale,
    ts: new Date().toISOString(),
  };

  const { alreadySubscribed, saved } = await persist(sub);
  console.log(
    `[newsletter] ${saved ? (alreadySubscribed ? "DUPE" : "NEW ") : "FAIL"} ${sub.email}${sub.page ? ` (${sub.page})` : ""}`,
  );

  return Response.json({ ok: true, alreadySubscribed });
}
