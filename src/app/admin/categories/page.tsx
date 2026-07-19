"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  slug: string;
  label: string;
  count: number;
}

export default function CategoriesManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/categories");
        return;
      }
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(method: string, body?: unknown, url = "/api/admin/categories") {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error === "already_exists"
            ? "A category with that name already exists."
            : data.error === "in_use"
              ? `Can't delete — ${data.count} item(s) still use this category.`
              : data.error === "label_required"
                ? "Enter a category name."
                : "Something went wrong.",
        );
      }
      setCategories(data.categories);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (await send("POST", { label: newLabel.trim() })) {
      setNotice(`Added “${newLabel.trim()}”.`);
      setNewLabel("");
    }
  }

  async function saveRename(slug: string) {
    if (!editLabel.trim()) return;
    if (await send("PUT", { slug, label: editLabel.trim() })) {
      setNotice("Renamed.");
      setEditing(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next); // optimistic
    await send("PUT", { order: next.map((c) => c.slug) });
  }

  async function onDelete(cat: Category) {
    if (cat.count > 0) return;
    if (!confirm(`Delete category “${cat.label}”?`)) return;
    if (await send("DELETE", undefined, `/api/admin/categories?slug=${encodeURIComponent(cat.slug)}`)) {
      setNotice(`Deleted “${cat.label}”.`);
    }
  }

  return (
    <div className="admin-container">
      <h1 className="admin-h1">Categories</h1>
      <p className="admin-sub">
        Add, rename, reorder or remove portfolio categories. Order here controls the order on the
        public Portfolio filter. A category can only be deleted when no items use it.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">Add category</h2>
        <form onSubmit={onAdd} className="stack-gap">
          <input
            className="input"
            style={{ maxWidth: 320 }}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Tiny Homes"
          />
          <button className="btn btn-primary" disabled={busy || !newLabel.trim()}>
            Add
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="section-title">Categories {loading ? "" : `(${categories.length})`}</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="muted">No categories yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Order</th>
                  <th>Label</th>
                  <th>Slug</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr key={c.slug}>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => move(i, -1)}
                        disabled={busy || i === 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>{" "}
                      <button
                        className="btn btn-sm"
                        onClick={() => move(i, 1)}
                        disabled={busy || i === categories.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </td>
                    <td>
                      {editing === c.slug ? (
                        <input
                          className="input"
                          value={editLabel}
                          autoFocus
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveRename(c.slug)}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{c.label}</span>
                      )}
                    </td>
                    <td className="muted" style={{ fontFamily: "ui-monospace,monospace", fontSize: 13 }}>
                      {c.slug}
                    </td>
                    <td>{c.count}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {editing === c.slug ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => saveRename(c.slug)} disabled={busy}>
                            Save
                          </button>{" "}
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setEditing(c.slug);
                              setEditLabel(c.label);
                            }}
                          >
                            Rename
                          </button>{" "}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onDelete(c)}
                            disabled={busy || c.count > 0}
                            title={c.count > 0 ? "In use — remove its items first" : "Delete"}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
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
