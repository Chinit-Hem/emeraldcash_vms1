import { getClientIp, getClientUserAgent, validateSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// In-memory password storage for demo purposes
// In production, use environment variables or a database
const DEMO_PASSWORDS: Record<string, string> = {
  admin: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // 1234
  staff: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // 1234
};

// ============ Password Validation ============
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 4) {
    return { valid: false, message: "Password must be at least 4 characters" };
  }

  // Check for common weak passwords
  const weakPasswords = ["1234", "123456", "password", "admin", "demo", "test"];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: "Password is too common" };
  }

  return { valid: true };
}

function validateCurrentPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Simple comparison for demo passwords (WEAK - only for demo)
    if (hash === "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi") {
      resolve(password === "1234");
      return;
    }
    
    // For any other password hashes, try bcrypt
    import("bcryptjs").then((bcrypt) => {
      resolve(bcrypt.compare(password, hash));
    }).catch(() => {
      resolve(false);
    });
  });
}

function hashPassword(password: string): Promise<string> {
  return import("bcryptjs").then((bcrypt) => bcrypt.hash(password, 10));
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const userAgent = getClientUserAgent(req.headers);

    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    // Get session from cookie
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse and validate session
    const { parseSessionCookie } = await import("@/lib/auth");
    const session = parseSessionCookie(sessionCookie, userAgent, ip);
    
    if (!session || !validateSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const username = session.username.toLowerCase();

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { ok: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Get current password hash
    const storedHash = DEMO_PASSWORDS[username];
    if (!storedHash) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await validateCurrentPassword(currentPassword, storedHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password and store
    const newHash = await hashPassword(newPassword);
    DEMO_PASSWORDS[username] = newHash;

    return NextResponse.json({ 
      ok: true, 
      message: "Password changed successfully" 
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}

