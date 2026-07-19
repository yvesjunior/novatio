import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Page content editor backend.
 *
 * English content lives inline in the routable page HTML files (elements tagged
 * `data-i18n="key"`); French lives in i18n/fr.json (applied at serve time). This
 * module edits both:
 *   - English  → surgically replace the tagged element's inner text in the page
 *     HTML file(s) (same locate logic the serve handler uses), touching only the
 *     edited field.
 *   - French   → write i18n/fr.json.
 *
 * Only visible page-body copy is exposed — shared chrome (nav/header/footer),
 * meta, and product-detail labels are excluded. All paths resolve from cwd
 * (`src/` in dev, `/app` in the container), both on the mounted static_site/i18n.
 */

const ROOT = path.join(process.cwd(), "static_site", "archcraft");
const FR_PATH = path.join(process.cwd(), "i18n", "fr.json");

export interface PageDef {
  id: string;
  label: string;
  file: string;
}

/** Routable pages whose HTML holds English body copy. */
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

// Prefixes NOT exposed (shared chrome, SEO meta, product-detail labels).
const EXCLUDED_PREFIXES = ["nav.", "footer.", "header.", "common.", "meta.", "pdp."];

// Which tab a key belongs to, by its leading segment.
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
  const seg = key.split(".")[0];
  return TAB_OF_PREFIX[seg] ?? null;
}

/** Human label for a field, derived from the key (drop tab prefix, title-case). */
function fieldLabel(key: string): string {
  const parts = key.split(".").slice(1); // drop the page segment
  const text = (parts.length ? parts : key.split(".")).join(" ").replace(/_/g, " ");
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Find the index of the matching closing tag for `tagName`, from `from`, with depth counting. */
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

/** Extract the inner content of the first inner-text `data-i18n="key"` element, or null. */
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

/** Replace the inner of every inner-text `data-i18n="key"` element with `value`. Returns [html, count]. */
function replaceInner(html: string, key: string, value: string): [string, number] {
  const re = openTagRe();
  const out: string[] = [];
  let last = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[2] !== key) continue;
    const openTag = m[0];
    if (/\sdata-i18n-attr=/.test(openTag) || openTag.endsWith("/>")) continue;
    const openEnd = m.index + openTag.length;
    const closeStart = findMatchingClose(html, openEnd, m[1]);
    if (closeStart < 0) continue;
    out.push(html.substring(last, openEnd));
    out.push(value);
    last = closeStart;
    count++;
    re.lastIndex = closeStart;
  }
  out.push(html.substring(last));
  return [out.join(""), count];
}

async function readFr(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(FR_PATH, "utf-8"));
  } catch {
    return {};
  }
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

/** Build the tabbed content model: for each editable data-i18n key, its EN (from HTML) + FR (from fr.json). */
export async function getGroupedContent(): Promise<ContentTab[]> {
  const fr = await readFr();
  // key -> { en, tab }  (en taken from the first routable file that carries the key)
  const found = new Map<string, { en: string; tab: string }>();

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
      if (!tab || found.has(key)) continue;
      if (/\sdata-i18n-attr=/.test(m[0]) || m[0].endsWith("/>")) continue;
      const inner = extractInner(html, key);
      if (inner == null) continue;
      found.set(key, { en: inner, tab });
    }
  }

  const byTab = new Map<string, ContentField[]>();
  for (const [key, { en, tab }] of found) {
    // The English value is the raw HTML inner, which carries the file's pretty-print
    // indentation (newlines + spaces around the text). Trim it for a clean editor
    // display — pixel-safe, since HTML collapses that surrounding whitespace anyway
    // and untouched fields are never rewritten.
    const enVal = en.trim();
    const frVal = (fr[key] ?? "").trim();
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

  const tabOrder = PAGES.map((p) => p.id);
  const labelOf = Object.fromEntries(PAGES.map((p) => [p.id, p.label]));
  const tabs: ContentTab[] = [];
  for (const id of tabOrder) {
    const fields = byTab.get(id);
    if (fields && fields.length) {
      fields.sort((a, b) => a.key.localeCompare(b.key));
      tabs.push({ id, label: labelOf[id], fields });
    }
  }
  return tabs;
}

export interface ContentUpdate {
  key: string;
  en?: string;
  fr?: string;
}

/** Apply updates: EN → all routable HTML files carrying the key; FR → fr.json. Returns the refreshed model. */
export async function updateEntries(updates: ContentUpdate[]): Promise<ContentTab[]> {
  const validUpdates = updates.filter((u) => u && typeof u.key === "string" && tabForKey(u.key));

  // English edits — batch per file so each file is written at most once.
  const cache = new Map<string, { html: string; dirty: boolean }>();
  for (const page of PAGES) {
    try {
      cache.set(page.file, { html: await fs.readFile(path.join(ROOT, page.file), "utf-8"), dirty: false });
    } catch {
      /* skip missing */
    }
  }
  for (const u of validUpdates) {
    if (typeof u.en !== "string") continue;
    for (const entry of cache.values()) {
      const [next, n] = replaceInner(entry.html, u.key, u.en);
      if (n > 0 && next !== entry.html) {
        entry.html = next;
        entry.dirty = true;
      }
    }
  }
  for (const [file, entry] of cache) {
    if (entry.dirty) await fs.writeFile(path.join(ROOT, file), entry.html, "utf-8");
  }

  // French edits — update fr.json (only keys that already exist).
  const frUpdates = validUpdates.filter((u) => typeof u.fr === "string");
  if (frUpdates.length) {
    const fr = await readFr();
    for (const u of frUpdates) {
      if (u.key in fr) fr[u.key] = u.fr as string;
    }
    await fs.writeFile(FR_PATH, JSON.stringify(fr, null, 2) + "\n", "utf-8");
  }

  return getGroupedContent();
}
