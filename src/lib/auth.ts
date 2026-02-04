import crypto from "crypto";
import type { Role } from "./types";

// Session configuration
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_VERSION = 1;

export type SessionPayload = {
  username: string;
  role: Role;
  ts: number;
  version: number;
  fingerprint: string;
};

let ephemeralSessionSecret: string | null = null;

/**
 * Generate a secure session fingerprint from request headers
 */
function getRequestFingerprint(
  userAgent: string,
  ip: string
): string {
  const data = `${userAgent}|${ip}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Create a secure session cookie
 */
export function createSessionCookie(
  payload: Omit<SessionPayload, "ts" | "version" | "fingerprint">,
  userAgent: string,
  ip: string
): string {
  const secret = getSessionSecret_();
  
  const fullPayload: SessionPayload = {
    ...payload,
    ts: Date.now(),
    version: SESSION_VERSION,
    fingerprint: getRequestFingerprint(userAgent, ip),
  };

  const encodedPayload = base64UrlEncode_(JSON.stringify(fullPayload));
  const signature = sign_(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Parse and validate a session cookie
 */
export function parseSessionCookie(
  session: string,
  userAgent: string,
  ip: string
): SessionPayload | null {
  try {
    const secret = getSessionSecret_();

    const [encodedPayload, signature] = String(session || "").split(".");
    if (!encodedPayload || !signature) return null;

    // Verify signature first (timing-safe)
    const expectedSignature = sign_(encodedPayload, secret);
    if (!timingSafeEqual_(signature, expectedSignature)) return null;

    // Decode payload
    const raw = base64UrlDecode_(encodedPayload).toString("utf8");
    const payload = JSON.parse(raw) as SessionPayload;

    // Validate version
    if (payload.version !== SESSION_VERSION) return null;

    // Validate fingerprint (session binding)
    const currentFingerprint = getRequestFingerprint(userAgent, ip);
    if (!timingSafeEqual_(payload.fingerprint, currentFingerprint)) {
      // Log potential session theft attempt
      console.warn("Session fingerprint mismatch - potential theft attempt");
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate session payload
 */
export function validateSession(payload: SessionPayload): boolean {
  if (!payload.username || !payload.role) return false;
  
  // Check expiration
  if (Date.now() - payload.ts > SESSION_MAX_AGE_MS) return false;
  
  // Check version
  if (payload.version !== SESSION_VERSION) return false;
  
  return true;
}

/**
 * Get session from request (convenience function)
 */
export function getSessionFromRequest(
  userAgent: string,
  ip: string,
  sessionCookie: string | undefined
): SessionPayload | null {
  if (!sessionCookie) return null;
  return parseSessionCookie(sessionCookie, userAgent, ip);
}

// ============ Helper Functions ============

function getSessionSecret_(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;

  if (!ephemeralSessionSecret) {
    ephemeralSessionSecret = crypto.randomBytes(64).toString("hex");
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

/**
 * Timing-safe string comparison for sensitive values
 */
function timingSafeEqual_(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, "utf8"),
      Buffer.from(b, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  return "unknown";
}

/**
 * Get client user-agent from request headers
 */
export function getClientUserAgent(headers: Headers): string {
  return headers.get("user-agent") || "unknown";
}

