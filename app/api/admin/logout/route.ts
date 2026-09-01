// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("mp_admin_session");
  return response;
}
