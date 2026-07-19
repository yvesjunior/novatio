"use client";

import SubmissionsView, { type Column } from "../SubmissionsView";

const COLUMNS: Column[] = [
  { key: "createdAt", label: "Date" },
  { key: "tier", label: "Tier" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "project", label: "Project" },
  { key: "timeline", label: "Timeline" },
  { key: "budget", label: "Budget" },
  { key: "page", label: "Page" },
];

export default function LeadsPage() {
  return (
    <SubmissionsView
      title="Leads"
      subtitle="Qualified leads captured by the chatbot, newest first."
      type="leads"
      columns={COLUMNS}
    />
  );
}
