"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  sku: string;
  name: string;
  category: string;
  status: string;
  hero: string;
  has_hero: boolean;
  url: string;
  slug_path: string;
}

interface Category {
  slug: string;
  label: string;
}

export default function PortfolioManager() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categoryLabel = (slug: string) =>
    categories.find((c) => c.slug === slug)?.label ?? slug;

  // form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [certifications, setCertifications] = useState("Conçu au Québec");
  const [status, setStatus] = useState("published");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/portfolio");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);

      const catRes = await fetch("/api/admin/categories", { cache: "no-store" });
      const catData = await catRes.json().catch(() => ({}));
      const cats: Category[] = Array.isArray(catData.categories) ? catData.categories : [];
      setCategories(cats);
      setCategory((cur) => cur || cats[0]?.slug || "");
    } catch {
      setError("Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setName("");
    setCategory(categories[0]?.slug ?? "");
    setTagline("");
    setDescription("");
    setCertifications("Conçu au Québec");
    setStatus("published");
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadOne(file: File, sku: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("sku", sku);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "upload_failed");
    }
    return data.url as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      // Derive a folder slug for ImageKit from the name (server assigns the real sku).
      const slugHint = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const urls: string[] = [];
      for (const f of files) {
        urls.push(await uploadOne(f, slugHint));
      }

      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          tagline: tagline.trim(),
          description: description.trim(),
          certifications: certifications.trim(),
          status,
          hero: urls[0] || "",
          gallery: urls.slice(1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "create_failed");
      }
      setNotice(`Added “${name.trim()}”.`);
      resetForm();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setError(
        msg === "server_misconfigured"
          ? "ImageKit is not configured on the server."
          : msg === "unsupported_type"
            ? "One of the files is not a PNG/JPG/WEBP image."
            : msg === "too_large"
              ? "An image is too large (max 15 MB)."
              : "Could not add the item. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(item: Item) {
    if (!confirm(`Delete “${item.name}”? This removes its spec and cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/portfolio/${encodeURIComponent(item.sku)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "delete_failed");
      setNotice(`Deleted “${item.name}”.`);
      await load();
    } catch {
      setError("Could not delete the item.");
    }
  }

  return (
    <>
      <div className="admin-container">
        <h1 className="admin-h1">Portfolio</h1>
        <p className="admin-sub">Add or remove portfolio items. Images are stored on ImageKit.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-ok">{notice}</div>}

        <div className="admin-card" style={{ marginBottom: 24 }}>
          <h2 className="section-title">Add item</h2>
          <form onSubmit={onSubmit}>
            <div className="row2">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aura 42"
                />
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.length === 0 && <option value="">No categories</option>}
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="tagline">Tagline <span className="hint">(optional)</span></label>
              <input
                id="tagline"
                className="input"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="description">Description <span className="hint">(optional)</span></label>
              <textarea
                id="description"
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="certifications">
                Certifications <span className="hint">(one per line or comma-separated)</span>
              </label>
              <textarea
                id="certifications"
                className="textarea"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Conçu au Québec"
              />
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="images">
                  Images <span className="hint">(first = cover; PNG/JPG/WEBP)</span>
                </label>
                <input
                  id="images"
                  ref={fileRef}
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              </div>
            </div>
            {files.length > 0 && (
              <div className="thumbs">
                {files.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt={f.name} title={f.name} />
                ))}
              </div>
            )}
            <div className="stack-gap" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? "Adding…" : "Add item"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={submitting}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="admin-card">
          <h2 className="section-title">
            Items {loading ? "" : `(${items.length})`}
          </h2>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted">No items yet. Add one above.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.slug_path}>
                      <td>
                        <img className="thumb" src={it.hero} alt="" />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{it.slug_path}</div>
                      </td>
                      <td>{categoryLabel(it.category)}</td>
                      <td>
                        <span className={`badge ${it.status === "draft" ? "draft" : "published"}`}>
                          {it.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => router.push(`/admin/portfolio/${encodeURIComponent(it.sku)}`)}
                        >
                          Edit
                        </button>{" "}
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(it)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
