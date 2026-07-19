"use client";

import SubmissionsView, { type Column } from "../SubmissionsView";

const COLUMNS: Column[] = [
  { key: "createdAt", label: "Date" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "message", label: "Message" },
  { key: "page", label: "Page" },
];

export default function ContactsPage() {
  return (
    <SubmissionsView
      title="Contacts"
      subtitle="Messages submitted through the contact form, newest first."
      type="contacts"
      columns={COLUMNS}
    />
  );
}
