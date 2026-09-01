// app/api/admin/catalogos/route.ts
// Devuelve entidades y rubros para llenar los <select> del formulario de
// carga de promos en el panel de admin.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = supabaseAdmin();

  const [{ data: entidades, error: e1 }, { data: rubros, error: e2 }] = await Promise.all([
    supabase.from("entidades").select("id, nombre, tipo").order("nombre"),
    supabase.from("rubros").select("id, slug, nombre").order("nombre"),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 ?? e2)?.message }, { status: 500 });
  }

  return NextResponse.json({ entidades, rubros });
}
