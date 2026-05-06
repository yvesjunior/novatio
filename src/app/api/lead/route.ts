import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

/**
 * Lead-qualification chatbot endpoint.
 *
 * 1. Validates POST shape from `public/chatbot.js`.
 * 2. Appends to `leads.json` at the repo root (gitignored).
 * 3. Logs to server console.
 * 4. Notifies enabled channels (Slack / Resend email / generic webhook) —
 *    each is opt-in via env var. See `.env.example` for the full list.
 *
 * All notification failures are logged but never block the response —
 * the lead is always accepted with 200 once it's persisted.
 */

const LEADS_FILE = path.join(process.cwd(), "leads.json");

type Tier = "HOT" | "WARM" | "COLD";

interface Lead {
  tier: Tier;
  answers: {
    project?: string;
    timeline?: string;
    property?: string;
    budget?: string;
    contact?: { name?: string; email?: string; phone?: string };
  };
  page?: string;
  referrer?: string | null;
  ts?: string;
}

function isLead(x: unknown): x is Lead {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (o.tier === "HOT" || o.tier === "WARM" || o.tier === "COLD") &&
    typeof o.answers === "object"
  );
}

async function readLeads(): Promise<Lead[]> {
  try {
    const text = await fs.readFile(LEADS_FILE, "utf-8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLeads(leads: Lead[]) {
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2) + "\n");
}

/* ------------------------------ Formatting ------------------------------ */

const TIER_EMOJI: Record<Tier, string> = { HOT: "🔥", WARM: "🌤️", COLD: "❄️" };
const TIER_COLOR: Record<Tier, string> = { HOT: "#d23", WARM: "#caa05c", COLD: "#888" };

const PRETTY: Record<string, Record<string, string>> = {
  project: {
    residential: "Residential",
    commercial: "Commercial",
    renovation: "Renovation",
    exploring: "Just exploring",
  },
  timeline: {
    lt3: "< 3 months",
    "3to12": "3 – 12 months",
    gt12: "12+ months",
    unsure: "Not sure yet",
  },
  property: {
    have: "Has property",
    looking: "Looking now",
    not_yet: "Not yet",
  },
  budget: {
    lt50k: "< $50k",
    "50to200k": "$50k – $200k",
    "200k_1m": "$200k – $1M",
    gt1m: "$1M+",
    discuss: "Rather discuss",
  },
};

function pretty(field: string, value?: string): string {
  if (!value) return "—";
  return PRETTY[field]?.[value] ?? value;
}

function summary(lead: Lead): string {
  const a = lead.answers;
  const c = a.contact ?? {};
  const lines = [
    `${TIER_EMOJI[lead.tier]} *${lead.tier}* lead from ${lead.page ?? "?"}`,
    `*Name:* ${c.name ?? "—"}`,
    `*Email:* ${c.email ?? "—"}`,
    c.phone ? `*Phone:* ${c.phone}` : null,
    `*Project:* ${pretty("project", a.project)}`,
    `*Timeline:* ${pretty("timeline", a.timeline)}`,
    `*Property:* ${pretty("property", a.property)}`,
    `*Budget:* ${pretty("budget", a.budget)}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/* ----------------------------- Notifications ---------------------------- */

async function notifySlack(lead: Lead, webhookUrl: string) {
  const text = summary(lead);
  const body = {
    attachments: [
      {
        color: TIER_COLOR[lead.tier],
        text,
        mrkdwn_in: ["text"],
        footer: lead.ts,
      },
    ],
  };
  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(`Slack webhook ${r.status}: ${await r.text().catch(() => "")}`);
  }
}

async function notifyResend(lead: Lead, opts: { apiKey: string; from: string; to: string }) {
  const a = lead.answers;
  const c = a.contact ?? {};
  const subject = `[${lead.tier}] New lead: ${c.name ?? "anonymous"} — ${pretty("project", a.project)}`;
  const html = `
    <h2 style="color:${TIER_COLOR[lead.tier]};">
      ${TIER_EMOJI[lead.tier]} ${lead.tier} lead from ${lead.page ?? "?"}
    </h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td><b>Name</b></td><td>${escapeHtml(c.name ?? "—")}</td></tr>
      <tr><td><b>Email</b></td><td>${escapeHtml(c.email ?? "—")}</td></tr>
      ${c.phone ? `<tr><td><b>Phone</b></td><td>${escapeHtml(c.phone)}</td></tr>` : ""}
      <tr><td><b>Project</b></td><td>${pretty("project", a.project)}</td></tr>
      <tr><td><b>Timeline</b></td><td>${pretty("timeline", a.timeline)}</td></tr>
      <tr><td><b>Property</b></td><td>${pretty("property", a.property)}</td></tr>
      <tr><td><b>Budget</b></td><td>${pretty("budget", a.budget)}</td></tr>
      <tr><td><b>Time</b></td><td>${lead.ts ?? ""}</td></tr>
    </table>
  `.trim();
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      reply_to: c.email,
      subject,
      html,
    }),
  });
  if (!r.ok) {
    throw new Error(`Resend ${r.status}: ${await r.text().catch(() => "")}`);
  }
}

async function notifyWebhook(lead: Lead, webhookUrl: string) {
  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(lead),
  });
  if (!r.ok) {
    throw new Error(`Webhook ${r.status}: ${await r.text().catch(() => "")}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fan out to every enabled channel in parallel. Each task has its own try/catch
 * so one channel failing doesn't take the others down.
 */
async function notify(lead: Lead) {
  const env = process.env;
  const tasks: Promise<unknown>[] = [];

  if (env.LEAD_SLACK_WEBHOOK_URL) {
    tasks.push(
      notifySlack(lead, env.LEAD_SLACK_WEBHOOK_URL).catch((err) =>
        console.warn("[lead] slack failed:", err.message),
      ),
    );
  }
  if (env.LEAD_RESEND_API_KEY && env.LEAD_TO_EMAIL && env.LEAD_FROM_EMAIL) {
    tasks.push(
      notifyResend(lead, {
        apiKey: env.LEAD_RESEND_API_KEY,
        from: env.LEAD_FROM_EMAIL,
        to: env.LEAD_TO_EMAIL,
      }).catch((err) => console.warn("[lead] resend failed:", err.message)),
    );
  }
  if (env.LEAD_GENERIC_WEBHOOK_URL) {
    tasks.push(
      notifyWebhook(lead, env.LEAD_GENERIC_WEBHOOK_URL).catch((err) =>
        console.warn("[lead] webhook failed:", err.message),
      ),
    );
  }

  if (tasks.length === 0) {
    console.log(
      "[lead] no notification channels configured (set LEAD_SLACK_WEBHOOK_URL / LEAD_RESEND_API_KEY+LEAD_TO_EMAIL+LEAD_FROM_EMAIL / LEAD_GENERIC_WEBHOOK_URL).",
    );
    return;
  }
  await Promise.all(tasks);
}

/* -------------------------------- Handler ------------------------------- */

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!isLead(body)) {
    return new Response("Invalid lead shape", { status: 400 });
  }

  const lead: Lead = { ...body, ts: body.ts ?? new Date().toISOString() };

  // Persist (best-effort).
  try {
    const all = await readLeads();
    all.push(lead);
    await writeLeads(all);
  } catch (err) {
    console.error("[lead] write failed:", err);
  }

  // Console summary.
  const c = lead.answers.contact ?? {};
  console.log(
    `[lead] ${lead.tier.padEnd(4)} ${c.email ?? "(no email)"} ${c.name ?? ""} ` +
      `project=${lead.answers.project} timeline=${lead.answers.timeline} ` +
      `property=${lead.answers.property} budget=${lead.answers.budget ?? "n/a"}`,
  );

  // Fan-out notifications to enabled channels.
  await notify(lead);

  return Response.json({ ok: true, tier: lead.tier });
}
