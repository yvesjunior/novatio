import { pgTable, serial, text, varchar, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

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
