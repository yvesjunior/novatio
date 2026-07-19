import { promises as fs } from "node:fs";
import path from "node:path";
import { b64urlFromBytes, hmac, timingSafeEqual } from "./auth";

/**
 * Node-only admin credential helpers (username + password).
 *
 * Bootstrap credentials come from env: ADMIN_USERNAME (default "admin") and
 * ADMIN_PASSWORD. The password can be changed from the Settings page, which
 * writes an HMAC of the new password to data/admin-auth.json (mounted +
 * gitignored); when that override exists it takes precedence over ADMIN_PASSWORD.
 *
 * Kept separate from lib/auth.ts because that module also runs in the Edge
 * middleware, which cannot import node:fs. This file is imported only by Node
 * route handlers.
 */

const OVERRIDE_PATH = path.join(process.cwd(), "data", "admin-auth.json");

function requireSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  return s;
}

/** The configured admin username (defaults to "admin"). */
export function getAdminUsername(): string {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

/** b64url HMAC of a value under the session secret — used for constant-time compares. */
async function digest(value: string): Promise<string> {
  return b64urlFromBytes(await hmac(requireSecret(), value));
}

/** Read the stored password-override HMAC, or null if none has been set. */
async function readPasswordOverride(): Promise<string | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(OVERRIDE_PATH, "utf-8"));
    return typeof parsed?.passwordHmac === "string" ? parsed.passwordHmac : null;
  } catch {
    return null;
  }
}

/** Constant-time check of a password against the override (if set) else ADMIN_PASSWORD. */
export async function verifyPasswordOnly(input: string): Promise<boolean> {
  const override = await readPasswordOverride();
  const inputHmac = await digest(input);
  if (override) return timingSafeEqual(inputHmac, override);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set");
  return timingSafeEqual(inputHmac, await digest(expected));
}

/** Constant-time check of both username and password. */
export async function verifyCredentials(username: unknown, password: unknown): Promise<boolean> {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const userOk = timingSafeEqual(await digest(username), await digest(getAdminUsername()));
  const passOk = await verifyPasswordOnly(password);
  return userOk && passOk;
}

/** Persist a new password as an HMAC override (survives restarts via the data volume). */
export async function setPassword(newPassword: string): Promise<void> {
  const passwordHmac = await digest(newPassword);
  await fs.mkdir(path.dirname(OVERRIDE_PATH), { recursive: true });
  await fs.writeFile(OVERRIDE_PATH, JSON.stringify({ passwordHmac }, null, 2) + "\n", "utf-8");
}
