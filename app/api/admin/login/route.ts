// app/api/admin/login/route.ts
// Body: { password: string }. Si coincide con ADMIN_PASSWORD, deja una cookie
// httpOnly con esa misma contraseña — el middleware la compara en cada
// request a /admin o /api/admin. No hay "usuarios admin" en la base, es una
// sola contraseña compartida (ver middleware.ts).

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("mp_admin_session", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return response;
}
