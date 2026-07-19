"use client";

import SubmissionsView, { type Column } from "../SubmissionsView";

const COLUMNS: Column[] = [
  { key: "createdAt", label: "Date" },
  { key: "email", label: "Email" },
  { key: "locale", label: "Locale" },
  { key: "page", label: "Page" },
];

export default function NewsletterPage() {
  return (
    <SubmissionsView
      title="Newsletter"
      subtitle="Newsletter subscribers, newest first."
      type="newsletter"
      columns={COLUMNS}
    />
  );
}
