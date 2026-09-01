// app/auth/callback/route.ts
// A donde redirige Supabase después de que el usuario clickea el magic link
// que le llega por mail. Intercambia el código por una sesión y la deja en
// una cookie httpOnly — de ahí en más las rutas /api/* ya saben quién es.

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(origin);
}
