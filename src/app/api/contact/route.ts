import type { NextRequest } from "next/server";
import {
  sendViaSendgrid,
  sendgridConfig,
  emailShell,
  badgePill,
  infoTable,
  messageBlock,
} from "../mailer";
import { getDb } from "../../../lib/db";
import { contacts } from "../../../lib/schema";

/**
 * Contact-form endpoint (used by /contact-us/).
 *
 * 1. Validates the POST shape {name, email, message}.
 * 2. Inserts into the `contacts` Postgres table (best-effort).
 * 3. Emails the message via SendGrid to LEAD_TO_EMAIL (reply-to = visitor).
 *
 * Email/DB failures are logged but never block the 200 — the response is always
 * a success so a submission is never rejected because a downstream is down.
 */

interface ContactMsg {
  name: string;
  email: string;
  message: string;
  page?: string;
  ts?: string;
}

function isContact(x: unknown): x is ContactMsg {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.email === "string" &&
    typeof o.message === "string" &&
    o.name.trim().length > 0 &&
    /.+@.+\..+/.test(o.email) &&
    o.message.trim().length > 0
  );
}

async function persist(msg: ContactMsg) {
  try {
    await getDb().insert(contacts).values({
      name: msg.name,
      email: msg.email,
      message: msg.message,
      page: msg.page,
      createdAt: msg.ts ? new Date(msg.ts) : new Date(),
    });
  } catch (err) {
    console.error("[contact] write failed:", err);
  }
}

function contactHtml(msg: ContactMsg): string {
  const body =
    infoTable([
      ["Name", msg.name],
      ["Email", msg.email],
      ["Page", msg.page],
    ]) + messageBlock("Message", msg.message);
  return emailShell({
    badgeHtml: badgePill("✉ Contact message", "#CAA05C"),
    title: `New contact message${msg.name ? ` — ${msg.name}` : ""}`,
    bodyHtml: body,
    ts: msg.ts,
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!isContact(body)) {
    return new Response("Invalid contact shape", { status: 400 });
  }

  const msg: ContactMsg = {
    name: body.name.trim(),
    email: body.email.trim(),
    message: body.message.trim(),
    page: body.page,
    ts: body.ts ?? new Date().toISOString(),
  };

  await persist(msg);
  console.log(`[contact] ${msg.email} (${msg.name}) — ${msg.message.slice(0, 60)}`);

  const cfg = sendgridConfig();
  if (cfg) {
    try {
      await sendViaSendgrid(cfg.apiKey, {
        to: cfg.to,
        from: cfg.from,
        replyTo: msg.email,
        subject: `[Contact] Message from ${msg.name}`,
        html: contactHtml(msg),
      });
    } catch (err) {
      console.warn("[contact] sendgrid failed:", (err as Error).message);
    }
  } else {
    console.log(
      "[contact] no email channel configured (set LEAD_SENDGRID_API_KEY+LEAD_FROM_EMAIL+LEAD_TO_EMAIL).",
    );
  }

  return Response.json({ ok: true });
}
