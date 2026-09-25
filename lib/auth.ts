import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rm_session";
const TOKEN_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function getAuthSecret(): Buffer {
  const raw = process.env.AUTH_SECRET;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET no configurada o demasiado débil (mín. 16 caracteres)"
      );
    }
    return Buffer.from("dev-secret-change-me-please-1234567890", "utf-8");
  }
  return Buffer.from(s, "utf-8");
}

export function getCredentials(): { username: string; password: string } {
  const rawU = process.env.AUTH_USERNAME;
  const rawP = process.env.AUTH_PASSWORD;
  const u = typeof rawU === "string" ? rawU.trim() : "";
  const p = typeof rawP === "string" ? rawP.trim() : "";
  if (!u || !p) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_USERNAME y AUTH_PASSWORD deben estar configuradas");
    }
    return { username: "admin", password: "admin123" };
  }
  return { username: u, password: p };
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = std.length % 4;
  const full = pad === 0 ? std : std + "=".repeat(4 - pad);
  return Buffer.from(full, "base64");
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Date.now() + TOKEN_DURATION_MS;
  const payload = `${exp.toString(36)}.${username}`;
  const secret = getAuthSecret();
  const sig = createHmac("sha256", secret).update(payload, "utf-8").digest();
  return `${payload}.${b64url(sig)}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ username: string; exp: number } | null> {
  try {
    const dot1 = token.indexOf(".");
    if (dot1 < 0) return null;
    const dot2 = token.indexOf(".", dot1 + 1);
    if (dot2 < 0) return null;
    const expStr = token.slice(0, dot1);
    const username = token.slice(dot1 + 1, dot2);
    const sigStr = token.slice(dot2 + 1);
    if (!expStr || !username || !sigStr) return null;

    const payload = `${expStr}.${username}`;
    const secret = getAuthSecret();
    const expected = createHmac("sha256", secret)
      .update(payload, "utf-8")
      .digest();
    const actual = b64urlDecode(sigStr);

    if (actual.length !== expected.length) return null;
    if (!timingSafeEqual(actual, expected)) return null;

    const exp = parseInt(expStr, 36);
    if (!Number.isFinite(exp)) return null;
    if (Date.now() > exp) return null;
    return { username, exp };
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  return s ? s.username : null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_DURATION_MS = TOKEN_DURATION_MS;
