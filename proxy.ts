// proxy.ts
// Protege /admin/* y /api/admin/* con una contraseña compartida (ADMIN_PASSWORD).
// No es un sistema de auth real con usuarios — es un gate simple para un panel
// que usa una sola persona. Si en el futuro varias personas cargan promos,
// conviene migrar esto a Supabase Auth + un campo is_admin en profiles.
//
// Se llama "proxy.ts" (no "middleware.ts") porque Next.js 16 renombró el
// archivo — la funcionalidad es la misma, solo cambió el nombre del archivo
// y de la función exportada.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/login");

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  const session = request.cookies.get("mp_admin_session")?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || session !== expected) {
    if (isAdminApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
