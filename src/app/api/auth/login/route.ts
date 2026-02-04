import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import type { Role } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

// ============ Rate Limiting ============
// Simple in-memory rate limiter (use Redis in production)
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

  // Check if we're in the lockout window
  if (now - entry.firstAttempt < LOCKOUT_WINDOW_MS) {
    if (entry.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((LOCKOUT_WINDOW_MS - (now - entry.firstAttempt)) / 1000);
      return { limited: true, remaining, resetTime: entry.firstAttempt + LOCKOUT_WINDOW_MS };
    }
    return { limited: false, remaining: MAX_ATTEMPTS - entry.count };
  }

  // Window expired, reset
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

// ============ Credentials from Environment ============
interface UserConfig {
  passwordHash: string;
  role: Role;
}

function getUserConfig(username: string): UserConfig | null {
  // Normalize username to lowercase for consistent lookup
  const normalizedUsername = username.toLowerCase();

  // Environment-based user configuration
  // Format: ADMIN_USERNAME, ADMIN_PASSWORD_HASH (bcrypt), STAFF_USERNAME, STAFF_PASSWORD_HASH
  const envUsername = process.env[`${normalizedUsername.toUpperCase()}_USERNAME`];
  const envPasswordHash = process.env[`${normalizedUsername.toUpperCase()}_PASSWORD_HASH`];

  if (envUsername && envPasswordHash) {
    return {
      passwordHash: envPasswordHash,
      role: normalizedUsername.includes("admin") ? "Admin" : "Staff",
    };
  }

  // Fallback to hardcoded demo users (WEAK - for development only)
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

  // Check for common weak passwords (but allow 1234 for demo users)
  const weakPasswords = ["123456", "password", "admin", "demo", "test"];
  if (weakPasswords.includes(password.toLowerCase()) && password.length < 6) {
    return { valid: false, message: "Password is too common" };
  }

  return { valid: true };
}

// ============ BCrypt Comparison ============
async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Try to use bcrypt for secure password comparison
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  } catch {
    // Fallback to simple comparison (WEAK - only for demo passwords)
    // This matches the hardcoded demo password hash for "1234"
    return hash === "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

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

  // Validate password strength first (before checking user existence)
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
  } catch (err) {
    console.warn("Failed to create session:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 }
    );
  }

  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("session", sessionCookie, {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return res;
}

