// app/api/promos/route.ts
// GET ?scope=semana|todas
//   semana -> promos_semana_usuario(): matchea sus bancos/billeteras y rubros,
//             sin filtrar por día (para el tab "Tus rubros").
//   todas  -> todo el catálogo activo, sin filtrar por preferencias (para el
//             tab "Todas" — sirve para descubrir bancos/rubros nuevos).
// El tab "Hoy" sigue viviendo en app/api/promos/today/route.ts.

import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "semana";

  if (scope === "semana") {
    const { data, error } = await supabase.rpc("promos_semana_usuario", { p_usuario_id: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ promos: data });
  }

  if (scope === "todas") {
    const { data, error } = await supabase
      .from("promos")
      .select(
        `id, comercio, descuento_pct, tope_reintegro, dias_semana, medio_pago,
         entidades ( nombre ), rubros ( slug )`
      )
      .eq("activo", true)
      .order("descuento_pct", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const promos = (data ?? []).map((p: any) => ({
      id: p.id,
      comercio: p.comercio,
      descuento_pct: p.descuento_pct,
      tope_reintegro: p.tope_reintegro,
      dias_semana: p.dias_semana,
      medio_pago: p.medio_pago,
      entidad: p.entidades?.nombre,
      rubro: p.rubros?.slug,
    }));

    return NextResponse.json({ promos });
  }

  return NextResponse.json({ error: "scope inválido, usar 'semana' o 'todas'" }, { status: 400 });
}
