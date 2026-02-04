import { NextRequest, NextResponse } from "next/server";

import { GET, OPTIONS, POST } from "../vehicles/route";

export { GET, POST, OPTIONS };

export function PUT(req: NextRequest) {
  return NextResponse.json({ ok: false, error: "Use /api/vehicles/:id" }, { status: 400 });
}

export function DELETE(req: NextRequest) {
  return NextResponse.json({ ok: false, error: "Use /api/vehicles/:id" }, { status: 400 });
}
