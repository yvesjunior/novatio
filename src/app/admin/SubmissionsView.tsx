"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface Column {
  key: string;
  label: string;
  /** Optional cell formatter; defaults to String(value). */
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

type Row = Record<string, unknown>;

function fmtDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

/** Escape a value for a CSV cell. */
function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function SubmissionsView({
  title,
  subtitle,
  type,
  columns,
}: {
  title: string;
  subtitle: string;
  type: "leads" | "contacts" | "newsletter";
  columns: Column[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cellValue = useCallback(
    (col: Column, row: Row): string => {
      const raw = row[col.key];
      if (col.format) return col.format(raw, row);
      if (col.key === "createdAt") return fmtDate(raw);
      return raw == null ? "" : String(raw);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?type=${type}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace(`/admin/login?next=/admin/${type}`);
        return;
      }
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
      if (!data.ok) setError("Could not load submissions.");
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, [router, type]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = columns.map((c) => csvCell(c.label)).join(",");
    const lines = rows.map((r) => columns.map((c) => csvCell(cellValue(c, r))).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-container">
      <h1 className="admin-h1">{title}</h1>
      <p className="admin-sub">{subtitle}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-card">
        <div className="stack-gap" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
          </h2>
          <button className="btn btn-sm" onClick={exportCsv} disabled={loading || rows.length === 0}>
            Export CSV
          </button>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No submissions yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={(r.id as number) ?? i}>
                    {columns.map((c) => (
                      <td key={c.key}>{cellValue(c, r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
