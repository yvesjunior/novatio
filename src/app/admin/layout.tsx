import type { Metadata } from "next";
import AdminNav from "./AdminNav";

export const metadata: Metadata = {
  title: "Admin — Novatio",
  robots: { index: false, follow: false },
};

const ADMIN_CSS = `
.admin-root{--bg:#f4f5f7;--card:#fff;--ink:#1a1d21;--muted:#6b7280;--line:#e5e7eb;--brand:#0f766e;--brand-ink:#fff;--danger:#b42318;--radius:12px;
  min-height:100vh;background:var(--bg);color:var(--ink);display:flex;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;}
.admin-root *{box-sizing:border-box;}
.admin-main{flex:1;min-width:0;}
.admin-sidebar{width:232px;flex-shrink:0;background:var(--card);border-right:1px solid var(--line);
  position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:20px 14px;gap:6px;}
.admin-nav{display:flex;flex-direction:column;gap:2px;margin-top:14px;flex:1;}
.admin-nav-link{display:block;text-decoration:none;color:var(--ink);font-weight:600;font-size:14px;
  padding:9px 12px;border-radius:9px;transition:background .12s,color .12s;}
.admin-nav-link:hover{background:#f3f4f6;}
.admin-nav-link.active{background:#eef2f2;color:var(--brand);}
.admin-nav-logout{align-self:flex-start;margin-top:8px;}
.admin-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:14px 24px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5;}
.admin-brand{font-weight:700;font-size:16px;letter-spacing:.02em;display:flex;align-items:center;gap:10px;}
.admin-brand .dot{width:10px;height:10px;border-radius:50%;background:var(--brand);}
.admin-container{max-width:960px;margin:0 auto;padding:28px 24px 64px;}
@media (max-width:720px){
  .admin-root{flex-direction:column;}
  .admin-sidebar{width:100%;height:auto;position:static;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 16px;}
  .admin-nav{flex-direction:row;flex-wrap:wrap;margin-top:0;flex:1;}
  .admin-nav-logout{margin-top:0;}
}
.admin-h1{font-size:22px;font-weight:700;margin:0 0 4px;}
.admin-sub{color:var(--muted);font-size:14px;margin:0 0 24px;}
.admin-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px;}
.admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.page-tile{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);padding:16px 18px;transition:border-color .15s,box-shadow .15s;}
.page-tile.enabled:hover{border-color:var(--brand);box-shadow:0 2px 10px rgba(15,118,110,.08);}
.page-tile.disabled{opacity:.6;cursor:not-allowed;}
.page-tile .name{font-weight:600;font-size:15px;margin-bottom:4px;}
.stat-num{font-size:30px;font-weight:800;line-height:1.1;color:var(--brand);margin-bottom:6px;}
.page-tile .path{color:var(--muted);font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:#eef2f2;color:var(--brand);}
.badge.soon{background:#f3f4f6;color:var(--muted);}
.badge.draft{background:#fef3c7;color:#92400e;}
.badge.published{background:#dcfce7;color:#166534;}
.btn{appearance:none;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-weight:600;font-size:14px;
  padding:9px 16px;border-radius:9px;cursor:pointer;transition:background .15s,border-color .15s,opacity .15s;}
.btn:hover{background:#f9fafb;}
.btn:disabled{opacity:.55;cursor:not-allowed;}
.btn-primary{background:var(--brand);border-color:var(--brand);color:var(--brand-ink);}
.btn-primary:hover{background:#0b5f58;}
.btn-danger{color:var(--danger);border-color:#f0c8c2;background:#fff;}
.btn-danger:hover{background:#fdf2f0;}
.btn-ghost{border-color:transparent;background:transparent;color:var(--muted);}
.btn-sm{padding:6px 12px;font-size:13px;}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.field label{font-size:13px;font-weight:600;}
.field .hint{font-size:12px;color:var(--muted);font-weight:400;}
.input,.select,.textarea{font:inherit;font-size:14px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);width:100%;}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(15,118,110,.12);}
.textarea{min-height:84px;resize:vertical;}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.table{width:100%;border-collapse:collapse;}
.table th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);}
.table td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle;font-size:14px;}
.table tr:last-child td{border-bottom:none;}
.thumb{width:56px;height:40px;object-fit:cover;border-radius:6px;background:#eef0f2;display:block;}
.muted{color:var(--muted);}
.alert{padding:10px 14px;border-radius:9px;font-size:14px;margin-bottom:16px;}
.alert-error{background:#fdf2f0;color:var(--danger);border:1px solid #f0c8c2;}
.alert-ok{background:#dcfce7;color:#166534;border:1px solid #bbf7d0;}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
.login-card{width:100%;max-width:360px;}
.stack-gap{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.thumbs img{width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--line);}
.section-title{font-size:16px;font-weight:700;margin:0 0 14px;}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;margin-bottom:14px;}
.back-link:hover{color:var(--ink);}
.edit-images{display:flex;flex-wrap:wrap;gap:12px;}
.edit-image{position:relative;width:156px;border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff;}
.edit-image img{width:100%;height:104px;object-fit:cover;border-radius:6px;display:block;background:#eef0f2;}
.edit-image .cover-badge{position:absolute;top:12px;left:12px;}
.edit-image-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.page-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
.page-tab{appearance:none;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-weight:600;font-size:14px;
  padding:8px 14px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:border-color .12s,background .12s;}
.page-tab:hover{background:#f9fafb;}
.page-tab.active{background:var(--brand);border-color:var(--brand);color:var(--brand-ink);}
.page-tab-count{font-size:11px;font-weight:700;background:rgba(0,0,0,.08);border-radius:999px;padding:1px 7px;}
.page-tab.active .page-tab-count{background:rgba(255,255,255,.22);}
.save-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;
  position:sticky;top:0;z-index:4;background:var(--bg);padding:10px 0;margin-bottom:8px;border-bottom:1px solid var(--line);}
.content-field{padding:16px 0;border-bottom:1px solid var(--line);}
.content-field:last-child{border-bottom:none;}
.content-field.changed{background:#fffdf5;margin:0 -20px;padding:16px 20px;border-radius:8px;}
.content-field-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.content-field-label{font-weight:700;font-size:14px;}
.content-field-key{color:var(--muted);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-left:auto;}
`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav />
      <div className="admin-main">{children}</div>
    </div>
  );
}
