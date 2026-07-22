import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import { pageContent } from "./schema";

/**
 * Page content editor backend (DB-overlay model).
 *
 * BASE content ships with the code: English lives inline in the page HTML
 * (elements tagged `data-i18n="key"`); French lives in i18n/fr.json. The admin
 * edits are stored as a SPARSE overlay in the `page_content` table ({key, en, fr})
 * and applied at serve time on top of the base (see app/[[...slug]]/route.ts).
 * So edits persist + go live in prod with no rebuild, and un-edited text is
 * untouched (pixel-safe).
 */

const ROOT = path.join(process.cwd(), "static_site", "archcraft");
const FR_PATH = path.join(process.cwd(), "i18n", "fr.json");

export interface PageDef {
  id: string;
  label: string;
  file: string;
}

/** Routable pages whose HTML holds the base English copy. */
export const PAGES: PageDef[] = [
  { id: "home", label: "Home", file: "home/index.html" },
  { id: "about", label: "About", file: "about-us/index.html" },
  { id: "services", label: "Services", file: "services/index.html" },
  { id: "portfolio", label: "Portfolio", file: "portfolio/index.html" },
  { id: "gallery", label: "Gallery", file: "gallery/index.html" },
  { id: "faq", label: "FAQ", file: "faq/index.html" },
  { id: "contact", label: "Contact", file: "contact-us/index.html" },
  { id: "careers", label: "Careers", file: "careers/index.html" },
  { id: "error_404", label: "404 Page", file: "error-404/index.html" },
];

const EXCLUDED_PREFIXES = ["nav.", "footer.", "header.", "common.", "meta.", "pdp."];
const TAB_OF_PREFIX: Record<string, string> = {
  home: "home",
  about: "about",
  services: "services",
  portfolio: "portfolio",
  gallery: "gallery",
  faq: "faq",
  contact: "contact",
  careers: "careers",
  error_404: "error_404",
};

function tabForKey(key: string): string | null {
  if (EXCLUDED_PREFIXES.some((p) => key.startsWith(p))) return null;
  return TAB_OF_PREFIX[key.split(".")[0]] ?? null;
}

function fieldLabel(key: string): string {
  const parts = key.split(".").slice(1);
  const text = (parts.length ? parts : key.split(".")).join(" ").replace(/_/g, " ");
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function findMatchingClose(html: string, from: number, tagName: string): number {
  const openRe = new RegExp(`<${tagName}\\b`, "gi");
  const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
  let depth = 1;
  let i = from;
  while (i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth++;
      i = o.index + o[0].length;
    } else {
      depth--;
      if (depth === 0) return c.index;
      i = c.index + c[0].length;
    }
  }
  return -1;
}

const openTagRe = () => /<([A-Za-z][A-Za-z0-9]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;

function extractInner(html: string, key: string): string | null {
  const re = openTagRe();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[2] !== key) continue;
    const openTag = m[0];
    if (/\sdata-i18n-attr=/.test(openTag) || openTag.endsWith("/>")) continue;
    const openEnd = m.index + openTag.length;
    const closeStart = findMatchingClose(html, openEnd, m[1]);
    if (closeStart < 0) continue;
    return html.substring(openEnd, closeStart);
  }
  return null;
}

async function readFr(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(FR_PATH, "utf-8"));
  } catch {
    return {};
  }
}

/** All DB overrides split by locale — used at serve time. Cached in production. */
let _overrides: { en: Record<string, string>; fr: Record<string, string> } | null = null;
export async function loadPageOverrides(): Promise<{ en: Record<string, string>; fr: Record<string, string> }> {
  if (_overrides && process.env.NODE_ENV === "production") return _overrides;
  const en: Record<string, string> = {};
  const fr: Record<string, string> = {};
  try {
    const rows = await getDb().select().from(pageContent);
    for (const r of rows) {
      if (r.en != null) en[r.key] = r.en;
      if (r.fr != null) fr[r.key] = r.fr;
    }
  } catch (err) {
    console.error("[content] loadPageOverrides failed:", err);
  }
  _overrides = { en, fr };
  return _overrides;
}

/** Drop the cache after an admin write so the next request reflects the edit. */
export function invalidatePageOverrides(): void {
  _overrides = null;
}

export interface ContentField {
  key: string;
  label: string;
  en: string;
  fr: string;
  hasMarkup: boolean;
}
export interface ContentTab {
  id: string;
  label: string;
  fields: ContentField[];
}

/** Editor model: base (HTML EN + fr.json FR) with DB overrides applied, grouped into page tabs. */
export async function getGroupedContent(): Promise<ContentTab[]> {
  const [fr, overrides] = await Promise.all([readFr(), loadPageOverrides()]);
  const base = new Map<string, { en: string; tab: string }>();

  for (const page of PAGES) {
    let html: string;
    try {
      html = await fs.readFile(path.join(ROOT, page.file), "utf-8");
    } catch {
      continue;
    }
    const re = openTagRe();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const key = m[2];
      const tab = tabForKey(key);
      if (!tab || base.has(key)) continue;
      if (/\sdata-i18n-attr=/.test(m[0]) || m[0].endsWith("/>")) continue;
      const inner = extractInner(html, key);
      if (inner == null) continue;
      base.set(key, { en: inner, tab });
    }
  }

  const byTab = new Map<string, ContentField[]>();
  for (const [key, { en, tab }] of base) {
    const enVal = (overrides.en[key] ?? en).trim();
    const frVal = (overrides.fr[key] ?? fr[key] ?? "").trim();
    const field: ContentField = {
      key,
      label: fieldLabel(key),
      en: enVal,
      fr: frVal,
      hasMarkup: /[<>]/.test(enVal) || /[<>]/.test(frVal),
    };
    if (!byTab.has(tab)) byTab.set(tab, []);
    byTab.get(tab)!.push(field);
  }

  const labelOf = Object.fromEntries(PAGES.map((p) => [p.id, p.label]));
  const tabs: ContentTab[] = [];
  for (const p of PAGES) {
    const fields = byTab.get(p.id);
    if (fields && fields.length) {
      fields.sort((a, b) => a.key.localeCompare(b.key));
      tabs.push({ id: p.id, label: labelOf[p.id], fields });
    }
  }
  return tabs;
}

export interface ContentUpdate {
  key: string;
  en?: string;
  fr?: string;
}

/** Persist edits as sparse DB overrides (upsert per key). Returns the refreshed model. */
export async function updateEntries(updates: ContentUpdate[]): Promise<ContentTab[]> {
  const db = getDb();
  type Insert = typeof pageContent.$inferInsert;
  for (const u of updates) {
    if (!u || typeof u.key !== "string" || !tabForKey(u.key)) continue;
    const values: Insert = { key: u.key };
    const set: Partial<Insert> = { updatedAt: new Date() };
    if (typeof u.en === "string") {
      values.en = u.en;
      set.en = u.en;
    }
    if (typeof u.fr === "string") {
      values.fr = u.fr;
      set.fr = u.fr;
    }
    if (!("en" in set) && !("fr" in set)) continue; // nothing to write
    await db.insert(pageContent).values(values).onConflictDoUpdate({ target: pageContent.key, set });
  }
  invalidatePageOverrides();
  return getGroupedContent();
}
