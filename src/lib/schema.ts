import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Postgres schema for form/lead submissions (previously flat JSON files).
 * Scalar columns hold the queryable fields; `raw`/`questions_asked` keep the
 * full original payloads so nothing is lost.
 */

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  tier: varchar("tier", { length: 8 }).notNull(), // HOT | WARM | COLD
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  project: text("project"),
  timeline: text("timeline"),
  property: text("property"),
  budget: text("budget"),
  page: text("page"),
  referrer: text("referrer"),
  questionsAsked: jsonb("questions_asked"),
  raw: jsonb("raw").notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  page: text("page"),
});

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    email: text("email").notNull(),
    emailLower: text("email_lower").notNull(), // dedup key
    page: text("page"),
    referrer: text("referrer"),
    locale: varchar("locale", { length: 5 }),
  },
  (t) => [uniqueIndex("newsletter_email_lower_idx").on(t.emailLower)],
);

/**
 * Site content, moved off flat files so the admin dashboard can edit it in
 * production (persists + live, no rebuild). Seeded once from the JSON files.
 */

// Portfolio taxonomy — single source of truth (was products/_categories.json).
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0), // display order
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Portfolio items (was products/<cat>/<sku>/spec.json). `spec` holds the full
// spec object as JSONB; scalar columns mirror the queryable/sortable fields.
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: varchar("sku", { length: 120 }).notNull().unique(),
    category: varchar("category", { length: 80 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("published"),
    name: text("name").notNull(),
    spec: jsonb("spec").notNull(),
    position: integer("position").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.category), index("products_status_idx").on(t.status)],
);

// Sparse per-key content overrides applied at serve time on top of the base
// HTML (English) / i18n/fr.json (French). Only holds keys an admin has edited.
export const pageContent = pgTable("page_content", {
  key: text("key").primaryKey(),
  en: text("en"),
  fr: text("fr"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
