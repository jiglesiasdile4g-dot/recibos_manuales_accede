import { cookies } from "next/headers";

const COOKIE_NAME = "rm_session";
const TOKEN_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET no configurada o demasiado débil (mín. 16 caracteres)"
      );
    }
    return "dev-secret-change-me-please-1234567890";
  }
  return s;
}

export function getCredentials(): { username: string; password: string } {
  const u = process.env.AUTH_USERNAME;
  const p = process.env.AUTH_PASSWORD;
  if (!u || !p) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_USERNAME y AUTH_PASSWORD deben estar configuradas");
    }
    return { username: "admin", password: "admin123" };
  }
  return { username: u, password: p };
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(message: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Date.now() + TOKEN_DURATION_MS;
  const payload = `${exp.toString(36)}.${username}`;
  const secret = getAuthSecret();
  const sig = await sign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ username: string; exp: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [expStr, username, sig] = parts;
    const payload = `${expStr}.${username}`;
    const secret = getAuthSecret();
    const key = await importKey(secret);
    const enc = new TextEncoder();
    const sigBytes = Uint8Array.from(
      atob((sig + "===").replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(payload)
    );
    if (!ok) return null;
    const exp = parseInt(expStr, 36);
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
