import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import type { Role } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

// ============ Rate Limiting ============
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(ip: string, username: string): string {
  return `${ip}:${username.toLowerCase()}`;
}

function isRateLimited(key: string): { limited: boolean; remaining?: number; resetTime?: number } {
  const entry = loginAttempts.get(key);
  const now = Date.now();

  if (!entry) {
    return { limited: false, remaining: MAX_ATTEMPTS };
  }

  if (now - entry.firstAttempt < LOCKOUT_WINDOW_MS) {
    if (entry.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((LOCKOUT_WINDOW_MS - (now - entry.firstAttempt)) / 1000);
      return { limited: true, remaining, resetTime: entry.firstAttempt + LOCKOUT_WINDOW_MS };
    }
    return { limited: false, remaining: MAX_ATTEMPTS - entry.count };
  }

  loginAttempts.delete(key);
  return { limited: false, remaining: MAX_ATTEMPTS };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (existing && now - existing.firstAttempt < LOCKOUT_WINDOW_MS) {
    existing.count += 1;
  } else {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  }
}

function recordSuccessfulAttempt(key: string): void {
  loginAttempts.delete(key);
}

// ============ Credentials ============
interface UserConfig {
  passwordHash: string;
  role: Role;
}

function getUserConfig(username: string): UserConfig | null {
  const normalizedUsername = username.toLowerCase();

  // Check environment variables first
  const envUsername = process.env[`${normalizedUsername.toUpperCase()}_USERNAME`];
  const envPasswordHash = process.env[`${normalizedUsername.toUpperCase()}_PASSWORD_HASH`];

  if (envUsername && envPasswordHash) {
    return {
      passwordHash: envPasswordHash,
      role: normalizedUsername.includes("admin") ? "Admin" : "Staff",
    };
  }

  // Fallback demo users
  const DEMO_USERS: Record<string, { passwordHash: string; role: Role }> = {
    admin: {
      passwordHash: "$2b$10$mc.blHBFe/9vs2VJMG/Dqe7PlwgrQAlnPUmNJ0bXIaQFnnSnarmvy", // password: 1234
      role: "Admin",
    },
    staff: {
      passwordHash: "$2b$10$mc.blHBFe/9vs2VJMG/Dqe7PlwgrQAlnPUmNJ0bXIaQFnnSnarmvy", // password: 1234
      role: "Staff",
    },
  };

  const entry = DEMO_USERS[normalizedUsername];
  if (!entry) return null;

  return {
    passwordHash: entry.passwordHash,
    role: entry.role,
  };
}

// ============ Password Validation ============
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 4) {
    return { valid: false, message: "Password must be at least 4 characters" };
  }
  return { valid: true };
}

// ============ BCrypt Comparison ============
async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  } catch {
    // Fallback for demo
    return password === "1234" && hash === "$2b$10$mc.blHBFe/9vs2VJMG/Dqe7PlwgrQAlnPUmNJ0bXIaQFnnSnarmvy";
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  console.log(`[LOGIN_API] Attempt for user: ${username}`);

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password required" },
      { status: 400 }
    );
  }

  const rateLimitKey = getRateLimitKey(ip, username);
  const rateLimit = isRateLimited(rateLimitKey);

  if (rateLimit.limited) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many failed attempts. Please try again later.",
        retryAfter: rateLimit.remaining,
      },
      { status: 429 }
    );
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { ok: false, error: passwordValidation.message },
      { status: 400 }
    );
  }

  const userConfig = getUserConfig(username);
  if (!userConfig) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { ok: false, error: "Invalid username/password" },
      { status: 401 }
    );
  }

  const passwordValid = await comparePassword(password, userConfig.passwordHash);
  if (!passwordValid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { ok: false, error: "Invalid username/password" },
      { status: 401 }
    );
  }

  // Successful login
  recordSuccessfulAttempt(rateLimitKey);

  const user = { username, role: userConfig.role };
  let sessionCookie = "";

  try {
    sessionCookie = createSessionCookie(user, userAgent, ip);
    console.log(`[LOGIN_API] Session created for ${username}`);
  } catch (err) {
    console.error("[LOGIN_API] Failed to create session:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 }
    );
  }

  // Detect if we're on HTTPS (production) or HTTP (local development)
  // Vercel sets x-forwarded-proto, but also check NODE_ENV for production
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const isHttps = protocol === "https" || process.env.NODE_ENV === "production";
  
  // Get host for domain setting (important for mobile browsers)
  const host = req.headers.get("host") || "";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("::1");
  
  // Detect mobile browser for debugging
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const res = NextResponse.json({ 
    ok: true, 
    user,
    message: "Login successful"
  });
  
  // Cookie options optimized for mobile Safari/Chrome and local development
  // IMPORTANT: Do NOT set domain - let browser use default (current domain)
  // Setting domain incorrectly can cause cookies to not be sent to API routes
  // For localhost development: secure must be false (HTTP), sameSite must be "lax"
  // For production: secure must be true (HTTPS required for cookies to work properly)
  const cookieOptions: {
    httpOnly: boolean;
    sameSite: "lax" | "none" | "strict";
    secure: boolean;
    path: string;
    maxAge: number;
    partitioned?: boolean;
  } = {
    httpOnly: true,
    sameSite: "lax" as const, // "lax" works better for mobile than "strict"
    secure: !isLocalhost, // Always secure except for localhost development
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  };
  
  res.cookies.set("session", sessionCookie, cookieOptions);

  console.log(`[LOGIN_API] Cookie set for ${username}`);
  console.log(`[LOGIN_API] Cookie options:`, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
    // Don't log the actual cookie value for security
    valueLength: sessionCookie.length,
  });
  console.log(`[LOGIN_API] Host: ${host}, Protocol: ${protocol}, isHttps: ${isHttps}, isLocalhost: ${isLocalhost}, isMobile: ${isMobile}`);

  return res;
}
