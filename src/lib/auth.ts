import type { Role } from "./types";
import crypto from "node:crypto";

export type SessionPayload = {
  username: string;
  role: Role;
  ts: number;
};

let ephemeralSessionSecret: string | null = null;

export function createSessionCookie(payload: SessionPayload): string {
  const secret = getSessionSecret_();
  const encodedPayload = base64UrlEncode_(JSON.stringify(payload));
  const signature = sign_(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionCookie(session: string): SessionPayload | null {
  try {
    const secret = getSessionSecret_();

    const [encodedPayload, signature] = String(session || "").split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = sign_(encodedPayload, secret);
    if (!timingSafeEqual_(signature, expectedSignature)) return null;

    const raw = base64UrlDecode_(encodedPayload).toString("utf8");
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSession(): SessionPayload | null {
  // This function is meant to be called from API routes where cookies are available
  // The actual implementation should use the request cookies
  // For API routes, use getSessionFromRequest instead
  return null;
}

export function validateSession(payload: SessionPayload): boolean {
  if (!payload.username || !payload.role) return false;
  const maxAge = 8 * 60 * 60 * 1000; // 8 hours in ms
  if (Date.now() - payload.ts > maxAge) return false;
  return true;
}

function getSessionSecret_(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;

  if (!ephemeralSessionSecret) {
    ephemeralSessionSecret = crypto.randomBytes(32).toString("hex");
  }

  return ephemeralSessionSecret;
}

function base64UrlEncode_(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function base64UrlDecode_(input: string): Buffer {
  let base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) throw new Error("Invalid base64url");
  return Buffer.from(base64, "base64");
}

function sign_(encodedPayload: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  return digest
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function timingSafeEqual_(a: string, b: string): boolean {
  try {
    const bufA = base64UrlDecode_(a);
    const bufB = base64UrlDecode_(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
