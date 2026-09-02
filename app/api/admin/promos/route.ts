// app/api/admin/promos/route.ts
// GET  -> lista todas las promos (activas e inactivas) para la tabla del panel.
// POST -> crea una promo nueva. Usa la service role key: no pasa por RLS,
// por eso esta ruta vive detrás del middleware de admin.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("promos")
    .select(
      `id, comercio, descuento_pct, tope_reintegro, dias_semana, medio_pago,
       vigencia_desde, vigencia_hasta, fuente_url, activo, origen, created_at,
       entidad_id, rubro_id,
       entidades ( nombre ),
       rubros ( nombre, slug )`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promos: data });
}

// entidad_id no es obligatorio: una promo sin banco/billetera asociado
// ("promo directa de la tienda") le llega a cualquiera que tenga el rubro.
const CAMPOS_REQUERIDOS = ["rubro_id", "comercio", "descuento_pct", "dias_semana"];

export async function POST(request: Request) {
  const body = await request.json();

  for (const campo of CAMPOS_REQUERIDOS) {
    const valor = body[campo];
    const vacio = valor === undefined || valor === null || valor === "" ||
      (Array.isArray(valor) && valor.length === 0);
    if (vacio) {
      return NextResponse.json({ error: `Falta el campo "${campo}"` }, { status: 400 });
    }
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("promos")
    .insert({
      entidad_id: body.entidad_id || null,
      rubro_id: body.rubro_id,
      comercio: body.comercio,
      descuento_pct: body.descuento_pct,
      tope_reintegro: body.tope_reintegro || null,
      dias_semana: body.dias_semana,
      medio_pago: body.medio_pago || null,
      vigencia_desde: body.vigencia_desde || undefined,
      vigencia_hasta: body.vigencia_hasta || null,
      fuente_url: body.fuente_url || null,
      activo: body.activo ?? true,
      origen: "manual",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promo: data }, { status: 201 });
}
