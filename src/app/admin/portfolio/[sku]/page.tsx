"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Category {
  slug: string;
  label: string;
}

export default function EditPortfolioItem() {
  const router = useRouter();
  const params = useParams<{ sku: string }>();
  const sku = params.sku;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [certifications, setCertifications] = useState("");
  const [status, setStatus] = useState("published");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/portfolio/${encodeURIComponent(sku)}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace(`/admin/login?next=/admin/portfolio/${sku}`);
        return;
      }
      if (res.status === 404) {
        setError("Item not found.");
        return;
      }
      const data = await res.json();
      const spec = data.item ?? {};
      setName(spec.name ?? "");
      setCategory(spec.taxonomy?.category ?? "");
      setTagline(spec.summary?.tagline ?? "");
      setDescription(spec.summary?.description ?? "");
      setCertifications(Array.isArray(spec.certifications) ? spec.certifications.join("\n") : "");
      setStatus(spec.status === "draft" ? "draft" : "published");
      const imgs = [spec.media?.hero_image, ...(spec.media?.gallery ?? [])].filter(Boolean);
      setImages(imgs);

      const catRes = await fetch("/api/admin/categories", { cache: "no-store" });
      const catData = await catRes.json().catch(() => ({}));
      setCategories(Array.isArray(catData.categories) ? catData.categories : []);
    } catch {
      setError("Failed to load item.");
    } finally {
      setLoading(false);
    }
  }, [router, sku]);

  useEffect(() => {
    load();
  }, [load]);

  function move(i: number, dir: -1 | 1) {
    const next = [...images];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setImages(next);
  }

  function removeImage(i: number) {
    setImages((imgs) => imgs.filter((_, idx) => idx !== i));
  }

  async function onAddFiles(files: File[]) {
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const added: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("sku", sku);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "upload_failed");
        added.push(data.url as string);
      }
      setImages((imgs) => [...imgs, ...added]);
    } catch {
      setError("One or more images failed to upload.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/portfolio/${encodeURIComponent(sku)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          tagline: tagline.trim(),
          description: description.trim(),
          certifications: certifications.trim(),
          status,
          hero: images[0] || "",
          gallery: images.slice(1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error === "target_exists"
            ? "An item with this id already exists in that category."
            : data.error === "invalid_category"
              ? "Pick a valid category."
              : "Could not save changes.",
        );
      }
      setNotice("Saved.");
      router.push("/admin/portfolio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <a href="/admin/portfolio" className="back-link">
        ← Back to Portfolio
      </a>
      <h1 className="admin-h1">Edit item</h1>
      <p className="admin-sub">
        <span className="muted" style={{ fontFamily: "ui-monospace,monospace" }}>{sku}</span>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-card">
        <form onSubmit={onSave}>
          <div className="row2">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            <input id="tagline" className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Description <span className="hint">(optional)</span></label>
            <textarea id="description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="certifications">Certifications <span className="hint">(one per line or comma-separated)</span></label>
            <textarea id="certifications" className="textarea" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
          </div>
          <div className="field" style={{ maxWidth: 240 }}>
            <label htmlFor="status">Status</label>
            <select id="status" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="field">
            <label>Images <span className="hint">(first = cover)</span></label>
            {images.length === 0 ? (
              <p className="muted">No images.</p>
            ) : (
              <div className="edit-images">
                {images.map((url, i) => (
                  <div className="edit-image" key={url + i}>
                    <img src={url} alt="" />
                    {i === 0 && <span className="badge published cover-badge">Cover</span>}
                    <div className="edit-image-actions">
                      <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">←</button>
                      <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move right">→</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeImage(i)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <input
                ref={fileRef}
                className="input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={uploading}
                onChange={(e) => onAddFiles(Array.from(e.target.files ?? []))}
              />
              {uploading && <span className="muted" style={{ marginLeft: 8 }}>Uploading…</span>}
            </div>
          </div>

          <div className="stack-gap" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={saving || uploading}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <a className="btn btn-ghost" href="/admin/portfolio">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );
}
