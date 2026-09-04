// app/api/sucursales/route.ts
// Catálogo público de sucursales físicas, para "cerca tuyo". No requiere
// login: "cualquiera puede ver sucursales" está permitido por RLS. La
// distancia contra la ubicación del usuario se calcula en el cliente, así
// que acá solo se devuelve el catálogo entero (es chico).

import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";

export async function GET() {
  const supabase = supabasePublic();

  const { data, error } = await supabase
    .from("sucursales")
    .select("id, comercio, nombre, direccion, lat, lng, rubros ( slug )")
    .order("comercio");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sucursales = (data ?? []).map((s: any) => ({
    id: s.id,
    comercio: s.comercio,
    nombre: s.nombre,
    direccion: s.direccion,
    lat: Number(s.lat),
    lng: Number(s.lng),
    rubro: s.rubros?.slug,
  }));

  return NextResponse.json({ sucursales });
}
