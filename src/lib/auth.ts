/**
 * Admin session auth — shared-password login backed by a signed cookie.
 *
 * Uses Web Crypto (crypto.subtle) only, so the same helpers run in BOTH the
 * Edge runtime (src/middleware.ts) and the Node runtime (route handlers).
 *
 * Token format:  base64url(JSON payload) + "." + base64url(HMAC-SHA256)
 * Payload:       { exp: <epoch ms> }
 *
 * Required env:
 *   ADMIN_PASSWORD        — the shared password checked at login
 *   ADMIN_SESSION_SECRET  — HMAC key for signing/verifying the cookie
 */

export const SESSION_COOKIE = "admin_session";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_MAX_AGE_S = DEFAULT_TTL_MS / 1000;

const encoder = new TextEncoder();

export function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(s: string): string {
  return b64urlFromBytes(encoder.encode(s));
}

function b64urlDecodeToStr(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

/** Length-safe constant-time string compare. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function requireSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  return s;
}

/** Issue a signed session token valid for `ttlMs` (default 7 days). */
export async function signSession(ttlMs: number = DEFAULT_TTL_MS): Promise<string> {
  const payloadB64 = b64urlEncodeStr(JSON.stringify({ exp: Date.now() + ttlMs }));
  const sig = b64urlFromBytes(await hmac(requireSecret(), payloadB64));
  return `${payloadB64}.${sig}`;
}

/** Verify a session token's signature and expiry. Returns false (never throws) on any problem. */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  try {
    const expected = b64urlFromBytes(await hmac(secret, payloadB64));
    if (!timingSafeEqual(sig, expected)) return false;
    const payload = JSON.parse(b64urlDecodeToStr(payloadB64));
    return typeof payload.exp === "number" && Date.now() <= payload.exp;
  } catch {
    return false;
  }
}

// Password/credential verification now lives in lib/admin-auth.ts (Node-only,
// supports the data/admin-auth.json override). This module stays Edge-safe.
