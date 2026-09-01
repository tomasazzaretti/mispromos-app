// app/api/promos/today/route.ts
// Next.js (App Router) + Supabase. Devuelve las promos que le corresponden
// HOY al usuario logueado, según sus entidades/rubros elegidos.
//
// El cliente de Supabase creado con createRouteHandlerClient ya sabe quién
// es el usuario (lee la cookie de sesión), así que RLS filtra solo por sí
// mismo: no hace falta pasar el usuario_id a mano ni podés ver el de otro.

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // ?fecha=2026-08-21 opcional, para poder previsualizar otro día (igual que
  // el "simulador de día" del prototipo). Si no se manda, usa hoy.
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("promos_para_usuario", {
    p_usuario_id: user.id,
    p_fecha: fecha,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fecha, promos: data });
}
