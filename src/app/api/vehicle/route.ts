import { NextRequest, NextResponse } from "next/server";

import { GET, OPTIONS, POST } from "../vehicles/route";

export { GET, POST, OPTIONS };

function missingEnvResponse() {
  return NextResponse.json(
    { ok: false, error: "Missing NEXT_PUBLIC_API_URL environment variable" },
    { status: 500 }
  );
}

export function PUT(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_API_URL) return missingEnvResponse();
  return NextResponse.json({ ok: false, error: "Use /api/vehicles/:id" }, { status: 400 });
}

export function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_API_URL) return missingEnvResponse();
  return NextResponse.json({ ok: false, error: "Use /api/vehicles/:id" }, { status: 400 });
}
