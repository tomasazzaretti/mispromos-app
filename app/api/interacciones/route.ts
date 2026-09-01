// app/api/interacciones/route.ts
// Guarda ("me interesa") o descarta ("no me interesa") una promo puntual
// para el usuario logueado. Body: { promo_id: string, estado: "guardada" | "descartada" }

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET: devuelve { guardadas: string[], descartadas: string[] } (ids de promo)
// del usuario logueado, para que el feed sepa qué corazón/x pintar al cargar.
export async function GET() {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("usuario_interacciones")
    .select("promo_id, estado")
    .eq("usuario_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const guardadas = (data ?? []).filter((i) => i.estado === "guardada").map((i) => i.promo_id);
  const descartadas = (data ?? []).filter((i) => i.estado === "descartada").map((i) => i.promo_id);

  return NextResponse.json({ guardadas, descartadas });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { promo_id, estado } = await request.json();

  if (!promo_id || !["guardada", "descartada"].includes(estado)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // upsert: si ya había una interacción con esa promo, la pisa
  const { error } = await supabase
    .from("usuario_interacciones")
    .upsert({ usuario_id: user.id, promo_id, estado }, { onConflict: "usuario_id,promo_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE ?promo_id=xxx — quita la interacción (usado para "des-guardar": el
// corazón vuelve a estado neutro en vez de quedar marcado para siempre).
export async function DELETE(request: Request) {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const promoId = searchParams.get("promo_id");

  if (!promoId) {
    return NextResponse.json({ error: "Falta promo_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("usuario_interacciones")
    .delete()
    .eq("usuario_id", user.id)
    .eq("promo_id", promoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
