import { requireSession } from "@/lib/auth";
import { createUser, deleteUser, listUsers } from "@/lib/userStore";
import type { Role } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function parseRole(value: unknown): Role {
  return value === "Admin" ? "Admin" : "Staff";
}

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden. Admin access required." }, { status: 403 });
  }

  return NextResponse.json(
    { ok: true, users: listUsers() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
  );
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = parseRole(body?.role);

  const result = await createUser({
    username,
    password,
    role,
    createdBy: session.username,
  });

  if (!result.ok) {
    const code = "code" in result ? result.code : "invalid_username";
    const errorMessage = "error" in result ? result.error : "Failed to create user";
    const status = code === "already_exists" ? 409 : 400;
    return NextResponse.json(
      { ok: false, error: errorMessage, code },
      { status }
    );
  }

  return NextResponse.json({ ok: true, user: result.user }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username : "";

  const result = await deleteUser({
    username,
    requestedBy: session.username,
  });

  if (!result.ok) {
    const code = "code" in result ? result.code : "invalid_username";
    const errorMessage = "error" in result ? result.error : "Failed to delete user";
    const status =
      code === "not_found"
        ? 404
        : code === "last_admin_forbidden"
          ? 409
          : 400;

    return NextResponse.json(
      { ok: false, error: errorMessage, code },
      { status }
    );
  }

  return NextResponse.json({ ok: true, user: result.user });
}
