"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Field {
  key: string;
  label: string;
  en: string;
  fr: string;
  hasMarkup: boolean;
}
interface Tab {
  id: string;
  label: string;
  fields: Field[];
}

type Draft = Record<string, { en: string; fr: string }>;

export default function PagesEditor() {
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Original values (by key) and the working draft (by key).
  const [orig, setOrig] = useState<Draft>({});
  const [draft, setDraft] = useState<Draft>({});

  const hydrate = useCallback((t: Tab[]) => {
    const o: Draft = {};
    for (const tab of t) for (const f of tab.fields) o[f.key] = { en: f.en, fr: f.fr };
    setTabs(t);
    setOrig(o);
    setDraft(structuredClone(o));
    setActive((cur) => cur || t[0]?.id || "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/pages");
        return;
      }
      const data = await res.json();
      hydrate(Array.isArray(data.tabs) ? data.tabs : []);
    } catch {
      setError("Failed to load page content.");
    } finally {
      setLoading(false);
    }
  }, [router, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const dirtyKeys = useMemo(
    () => Object.keys(draft).filter((k) => orig[k] && (draft[k].en !== orig[k].en || draft[k].fr !== orig[k].fr)),
    [draft, orig],
  );

  function set(key: string, lang: "en" | "fr", value: string) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [lang]: value } }));
  }

  async function save() {
    if (dirtyKeys.length === 0) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const updates = dirtyKeys.map((key) => {
        const u: { key: string; en?: string; fr?: string } = { key };
        if (draft[key].en !== orig[key].en) u.en = draft[key].en;
        if (draft[key].fr !== orig[key].fr) u.fr = draft[key].fr;
        return u;
      });
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error("save_failed");
      hydrate(Array.isArray(data.tabs) ? data.tabs : []);
      setNotice(`Saved ${updates.length} change${updates.length === 1 ? "" : "s"}.`);
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className="admin-container">
      <h1 className="admin-h1">Pages</h1>
      <p className="admin-sub">
        Edit the text on each page, in English and French. Changes go live immediately. The layout
        and design never change — only the words you edit here.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="page-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`page-tab${t.id === active ? " active" : ""}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
                <span className="page-tab-count">{t.fields.length}</span>
              </button>
            ))}
          </div>

          <div className="save-bar">
            <span className="muted">
              {dirtyKeys.length === 0 ? "No unsaved changes" : `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? "" : "s"}`}
            </span>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || dirtyKeys.length === 0}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {activeTab && (
            <div className="admin-card">
              {activeTab.fields.map((f) => {
                const d = draft[f.key] ?? { en: f.en, fr: f.fr };
                const changed = orig[f.key] && (d.en !== orig[f.key].en || d.fr !== orig[f.key].fr);
                const multiline = f.hasMarkup || f.en.length > 70 || f.fr.length > 70;
                return (
                  <div className={`content-field${changed ? " changed" : ""}`} key={f.key}>
                    <div className="content-field-head">
                      <span className="content-field-label">{f.label}</span>
                      {f.hasMarkup && <span className="badge draft">contains formatting</span>}
                      <span className="content-field-key">{f.key}</span>
                    </div>
                    <div className="row2">
                      <div className="field" style={{ margin: 0 }}>
                        <label>English</label>
                        {multiline ? (
                          <textarea className="textarea" value={d.en} onChange={(e) => set(f.key, "en", e.target.value)} />
                        ) : (
                          <input className="input" value={d.en} onChange={(e) => set(f.key, "en", e.target.value)} />
                        )}
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label>French</label>
                        {multiline ? (
                          <textarea className="textarea" value={d.fr} onChange={(e) => set(f.key, "fr", e.target.value)} />
                        ) : (
                          <input className="input" value={d.fr} onChange={(e) => set(f.key, "fr", e.target.value)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
