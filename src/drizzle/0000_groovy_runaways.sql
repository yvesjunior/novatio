CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"page" text
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tier" varchar(8) NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"project" text,
	"timeline" text,
	"property" text,
	"budget" text,
	"page" text,
	"referrer" text,
	"questions_asked" jsonb,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_lower" text NOT NULL,
	"page" text,
	"referrer" text,
	"locale" varchar(5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_lower_idx" ON "newsletter_subscribers" USING btree ("email_lower");