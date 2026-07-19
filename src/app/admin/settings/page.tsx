"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/account", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/admin/login?next=/admin/settings");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setUsername(d.username || ""))
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error === "wrong_password"
            ? "Current password is incorrect."
            : data.error === "weak_password"
              ? "New password must be at least 8 characters."
              : "Could not change the password.",
        );
      }
      setNotice("Password changed. It'll be required next time you log in.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-container">
      <h1 className="admin-h1">Settings</h1>
      <p className="admin-sub">Manage your admin account.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">Account</h2>
        <div className="field">
          <label>Username</label>
          <input className="input" value={username} readOnly disabled style={{ maxWidth: 320 }} />
          <span className="hint">Set via ADMIN_USERNAME in the server environment.</span>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: 460 }}>
        <h2 className="section-title">Change password</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="cur">Current password</label>
            <input
              id="cur"
              className="input"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="new">New password <span className="hint">(min 8 chars)</span></label>
            <input
              id="new"
              className="input"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="conf">Confirm new password</label>
            <input
              id="conf"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={busy || !current || !next || !confirm}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
