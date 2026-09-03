// app/api/auth/exchange/route.ts
// Intercambia el código del magic link por una sesión. Se llama desde un
// click explícito en app/auth/callback/page.tsx, NUNCA desde un GET directo
// del link del mail — así un scanner/preview automático que visite el link
// no consume el código de un solo uso antes de que la persona lo clickee.

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
