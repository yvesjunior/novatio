import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import {
  sendViaSendgrid,
  sendgridConfig,
  emailShell,
  badgePill,
  infoTable,
  messageBlock,
} from "../mailer";

/**
 * Contact-form endpoint (used by /contact-us/).
 *
 * 1. Validates the POST shape {name, email, message}.
 * 2. Appends to `contacts.json` at the repo root (gitignored, best-effort).
 * 3. Emails the message via SendGrid to LEAD_TO_EMAIL (reply-to = visitor).
 *
 * Email failures are logged but never block the 200 — the message is always
 * persisted so nothing is lost even if the mail provider is down.
 */

const CONTACTS_FILE = path.join(process.cwd(), "contacts.json");

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
    let all: ContactMsg[] = [];
    try {
      const text = await fs.readFile(CONTACTS_FILE, "utf-8");
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) all = parsed;
    } catch {
      /* no file yet */
    }
    all.push(msg);
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(all, null, 2) + "\n");
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
