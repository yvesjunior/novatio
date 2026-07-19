"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  portfolio: number;
  categories: number;
  leads: number;
  contacts: number;
  newsletter: number;
}

async function count(url: string, key: string): Promise<number> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data[key]) ? data[key].length : 0;
  } catch {
    return 0;
  }
}

const CARDS: { label: string; href: string; stat: keyof Stats }[] = [
  { label: "Portfolio items", href: "/admin/portfolio", stat: "portfolio" },
  { label: "Categories", href: "/admin/categories", stat: "categories" },
  { label: "Leads", href: "/admin/leads", stat: "leads" },
  { label: "Contacts", href: "/admin/contacts", stat: "contacts" },
  { label: "Newsletter subscribers", href: "/admin/newsletter", stat: "newsletter" },
];

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      // Probe auth once; middleware 401s the API when the session is missing.
      const probe = await fetch("/api/admin/portfolio", { cache: "no-store" });
      if (probe.status === 401) {
        router.replace("/admin/login?next=/admin");
        return;
      }
      const [portfolio, categories, leads, contacts, newsletter] = await Promise.all([
        probe
          .json()
          .then((d) => (Array.isArray(d.items) ? d.items.length : 0))
          .catch(() => 0),
        count("/api/admin/categories", "categories"),
        count("/api/admin/submissions?type=leads", "rows"),
        count("/api/admin/submissions?type=contacts", "rows"),
        count("/api/admin/submissions?type=newsletter", "rows"),
      ]);
      setStats({ portfolio, categories, leads, contacts, newsletter });
    })();
  }, [router]);

  return (
    <div className="admin-container">
      <h1 className="admin-h1">Dashboard</h1>
      <p className="admin-sub">Overview of your site content and submissions.</p>
      <div className="admin-grid">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="page-tile enabled">
            <div className="stat-num">{stats ? stats[c.stat] : "—"}</div>
            <div className="name">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
