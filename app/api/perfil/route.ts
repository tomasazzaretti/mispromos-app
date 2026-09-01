// app/api/perfil/route.ts
// GET   -> perfil del usuario logueado + los ids de entidades/rubros que eligió.
// PATCH -> guarda onboarding y también los cambios desde la pantalla de
// configuración: reemplaza por completo el set de entidades/rubros elegidos
// y actualiza las preferencias de notificación. RLS ya garantiza que cada
// usuario solo puede tocar sus propias filas (auth.uid() = usuario_id).

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [{ data: profile, error: e1 }, { data: entidades, error: e2 }, { data: rubros, error: e3 }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("usuario_entidades").select("entidad_id").eq("usuario_id", user.id),
      supabase.from("usuario_rubros").select("rubro_id").eq("usuario_id", user.id),
    ]);

  if (e1 || e2 || e3) {
    return NextResponse.json({ error: (e1 ?? e2 ?? e3)?.message }, { status: 500 });
  }

  return NextResponse.json({
    profile,
    entidad_ids: (entidades ?? []).map((e) => e.entidad_id),
    rubro_ids: (rubros ?? []).map((r) => r.rubro_id),
  });
}

export async function PATCH(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { entidad_ids, rubro_ids, notif_email, notif_push, notif_frecuencia, onboarding_completo } = body;

  if (!Array.isArray(entidad_ids) || !Array.isArray(rubro_ids) || entidad_ids.length === 0 || rubro_ids.length === 0) {
    return NextResponse.json({ error: "Elegí al menos un banco/billetera y un rubro" }, { status: 400 });
  }

  const profileUpdate: Record<string, unknown> = {};
  if (notif_email !== undefined) profileUpdate.notif_email = notif_email;
  if (notif_push !== undefined) profileUpdate.notif_push = notif_push;
  if (notif_frecuencia !== undefined) profileUpdate.notif_frecuencia = notif_frecuencia;
  if (onboarding_completo !== undefined) profileUpdate.onboarding_completo = onboarding_completo;

  const [{ error: eDelEnt }, { error: eDelRub }] = await Promise.all([
    supabase.from("usuario_entidades").delete().eq("usuario_id", user.id),
    supabase.from("usuario_rubros").delete().eq("usuario_id", user.id),
  ]);
  if (eDelEnt || eDelRub) {
    return NextResponse.json({ error: (eDelEnt ?? eDelRub)?.message }, { status: 500 });
  }

  const [{ error: eInsEnt }, { error: eInsRub }] = await Promise.all([
    supabase.from("usuario_entidades").insert(entidad_ids.map((id: string) => ({ usuario_id: user.id, entidad_id: id }))),
    supabase.from("usuario_rubros").insert(rubro_ids.map((id: string) => ({ usuario_id: user.id, rubro_id: id }))),
  ]);
  if (eInsEnt || eInsRub) {
    return NextResponse.json({ error: (eInsEnt ?? eInsRub)?.message }, { status: 500 });
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error: eProfile } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    if (eProfile) {
      return NextResponse.json({ error: eProfile.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
