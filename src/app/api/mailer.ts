/**
 * Tiny SendGrid v3 mailer + branded HTML email template, shared by the lead +
 * contact endpoints.
 *
 * Uses SendGrid's HTTP API directly (no npm dependency) — same fetch pattern
 * as the other notification channels. Credentials come from env only; never
 * hardcode an API key here.
 *
 * Required env:
 *   LEAD_SENDGRID_API_KEY   — SendGrid API key (server-side only)
 *   LEAD_FROM_EMAIL         — verified sender / authenticated-domain address
 *   LEAD_TO_EMAIL           — inbox that receives the mail
 */

export interface MailOpts {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ----------------------------- Email template ---------------------------- */
// Brand palette (matches the site): gold #CAA05C, ink #1C1C1D, warm bg.

const GOLD = "#CAA05C";
const INK = "#1C1C1D";

/** A small uppercase pill, e.g. the lead tier or "Contact message". */
export function badgePill(label: string, bg: string, color = "#ffffff"): string {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:6px 13px;border-radius:999px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${escapeHtml(label)}</span>`;
}

/** Two-column label/value table. Empty/“—” values are dropped. */
export function infoTable(rows: Array<[string, string | undefined]>): string {
  const visible = rows.filter(([, v]) => v != null && v !== "" && v !== "—");
  const trs = visible
    .map(
      ([k, v], i) => `<tr>
        <td style="padding:11px 0;${i < visible.length - 1 ? "border-bottom:1px solid #f0ece4;" : ""}color:#8a8a8a;font-size:13px;width:120px;vertical-align:top;">${escapeHtml(k)}</td>
        <td style="padding:11px 0;${i < visible.length - 1 ? "border-bottom:1px solid #f0ece4;" : ""}color:${INK};font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(String(v))}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">${trs}</table>`;
}

/** A highlighted block for a free-text message (preserves line breaks). */
export function messageBlock(heading: string, text: string): string {
  return `<div style="margin-top:24px;">
    <div style="color:#8a8a8a;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(heading)}</div>
    <div style="background:#faf8f3;border-left:3px solid ${GOLD};border-radius:0 8px 8px 0;padding:14px 16px;color:#333333;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(text)}</div>
  </div>`;
}

/** A list of the questions the visitor asked. */
export function listBlock(heading: string, items: string[]): string {
  if (!items.length) return "";
  const lis = items
    .map(
      (q, i) =>
        `<tr><td style="padding:9px 0;${i < items.length - 1 ? "border-bottom:1px solid #f0ece4;" : ""}color:#333333;font-size:14px;line-height:1.5;"><span style="color:${GOLD};font-weight:700;">›</span>&nbsp;&nbsp;${escapeHtml(q)}</td></tr>`,
    )
    .join("");
  return `<div style="margin-top:24px;">
    <div style="color:#8a8a8a;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(heading)} (${items.length})</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${lis}</table>
  </div>`;
}

/** Wrap inner content in the branded responsive shell. */
export function emailShell(opts: {
  badgeHtml?: string;
  title: string;
  bodyHtml: string;
  ts?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#f1eee8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1eee8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.06);">
        <tr><td style="background:${INK};padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:2px;">MAISON&nbsp;NOVATIO</span><br>
          <span style="color:${GOLD};font-size:11px;font-weight:600;letter-spacing:3px;">SOLUTIONS MODULAIRES</span>
        </td></tr>
        <tr><td style="height:4px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 4px;">
          ${opts.badgeHtml ?? ""}
          <h1 style="margin:14px 0 0;color:${INK};font-size:21px;font-weight:700;line-height:1.3;">${escapeHtml(opts.title)}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 30px;">${opts.bodyHtml}</td></tr>
        <tr><td style="background:#faf8f3;padding:18px 32px;border-top:1px solid #efe9df;">
          <p style="margin:0;color:#9a9a9a;font-size:12px;line-height:1.55;">Sent automatically from the Maison&nbsp;Novatio website${opts.ts ? ` · ${escapeHtml(opts.ts)}` : ""}.<br>Reply to this email to respond directly to the visitor.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Send one HTML email. Resolves on success; throws on a non-2xx response. */
export async function sendViaSendgrid(apiKey: string, m: MailOpts): Promise<void> {
  const body = {
    personalizations: [{ to: [{ email: m.to }] }],
    from: { email: m.from, name: m.fromName ?? "Maison Novatio" },
    ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}),
    subject: m.subject,
    content: [{ type: "text/html", value: m.html }],
  };
  const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  // SendGrid returns 202 Accepted on success.
  if (!r.ok) {
    throw new Error(`SendGrid ${r.status}: ${await r.text().catch(() => "")}`);
  }
}

/** Read the shared SendGrid config from env. Returns null if not fully set. */
export function sendgridConfig(): { apiKey: string; from: string; to: string } | null {
  const apiKey = process.env.LEAD_SENDGRID_API_KEY;
  const from = process.env.LEAD_FROM_EMAIL;
  const to = process.env.LEAD_TO_EMAIL;
  if (apiKey && from && to) return { apiKey, from, to };
  return null;
}
