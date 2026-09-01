// app/api/catalogos/route.ts
// Catálogo público de entidades y rubros, para el onboarding y la pantalla
// de configuración. No requiere login: "cualquiera puede ver entidades/rubros"
// está permitido por RLS.

import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";

export async function GET() {
  const supabase = supabasePublic();

  const [{ data: entidades, error: e1 }, { data: rubros, error: e2 }] = await Promise.all([
    supabase.from("entidades").select("id, nombre, tipo").order("nombre"),
    supabase.from("rubros").select("id, slug, nombre, icono").order("nombre"),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 ?? e2)?.message }, { status: 500 });
  }

  return NextResponse.json({ entidades, rubros });
}
